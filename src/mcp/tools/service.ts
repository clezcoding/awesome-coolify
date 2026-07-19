import * as z from 'zod/v4';
import { readFileSync } from 'node:fs';
import type { EnvConfig } from '../config/env.js';
import {
  createService,
  fetchResources,
  fetchService,
  triggerServiceRestart,
  triggerServiceStart,
  triggerServiceStop,
} from '../../api/client.js';
import {
  buildProjectEnvironmentIndex,
  resolveProjectUuid,
} from '../../utils/project-lookup.js';
import {
  encodeCompose,
  projectServiceCompose,
  validateCompose,
} from '../../utils/yaml-validator.js';
import {
  projectServiceSummary,
  projectResourceSummary,
  resolveProjection,
  sanitizeFullProjection,
  type ServiceSummary,
} from '../../utils/projections.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';
import { generateHints } from '../../utils/diagnose-hints.js';
import {
  FIND_MATCH_CAP,
  matchesExplicitFields,
  rankFindMatches,
  type FindableResource,
} from './resource.js';

const SERVICE_IDENTIFIER_FIELDS = ['uuid', 'name'] as const;

const mutationResponseParamsSchema = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .default('pretty')
    .optional()
    .describe('Output format (default pretty)'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .default(16000)
    .optional()
    .describe('Max formatted output characters (default 16000)'),
};

function hasAtLeastOneIdentifier(
  data: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.some((field) => {
    const value = data[field];
    return typeof value === 'string' && value.length > 0;
  });
}

function requireServiceMutationIdentifier<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  actionName: string,
) {
  return schema.superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, SERVICE_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message: `At least one identifier (uuid|name) required for action ${actionName}`,
        params: { code: 'COOLIFY_422' },
      });
    }
  });
}

const startActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('start'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z.string().optional().describe('Service name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'start',
);

const stopActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('stop'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z.string().optional().describe('Service name substring'),
      docker_cleanup: z
        .boolean()
        .default(false)
        .describe(
          'Run Docker cleanup on stop — default false for reliable compose service stop on Coolify 4.1.x',
        ),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'stop',
);

const restartActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('restart'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z.string().optional().describe('Service name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'restart',
);

const deployActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('deploy'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z.string().optional().describe('Service name substring'),
      pull_latest: z
        .boolean()
        .default(false)
        .describe(
          'Pull latest Docker images before restart (maps to ?latest=true query param)',
        ),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'deploy',
);

function requireProjectAndEnvironment(
  data: {
    project_uuid?: string;
    project_name?: string;
    environment_name?: string;
    environment_uuid?: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (!data.project_uuid && !data.project_name) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Either project_uuid or project_name is required for service create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
  if (!data.environment_name && !data.environment_uuid) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Either environment_name or environment_uuid is required for service create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

function requireServiceCreateSource(
  data: {
    type?: string;
    compose?: string;
    compose_file?: string;
  },
  ctx: z.RefinementCtx,
): void {
  const hasType = typeof data.type === 'string' && data.type.length > 0;
  const hasCompose =
    typeof data.compose === 'string' && data.compose.length > 0;
  const hasComposeFile =
    typeof data.compose_file === 'string' && data.compose_file.length > 0;
  const hasComposePath = hasCompose || hasComposeFile;

  if (hasType === hasComposePath) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Exactly one of type (one-click) or compose input (compose|compose_file) is required for service create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }

  if (hasComposePath && hasCompose === hasComposeFile) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Exactly one of compose (inline YAML) or compose_file (local path) is required when creating via compose',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

const createActionSchema = z
  .object({
    action: z.literal('create'),
    server_uuid: z.string().describe('Target server UUID'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z.string().optional().describe('Project name'),
    environment_name: z.string().optional().describe('Environment name'),
    environment_uuid: z.string().optional().describe('Environment UUID'),
    name: z.string().optional().describe('Service name'),
    description: z.string().optional().describe('Service description'),
    type: z
      .string()
      .optional()
      .describe(
        'One-click service type, e.g. actualbudget, calibre-web, gitea-with-mysql',
      ),
    compose: z
      .string()
      .optional()
      .describe(
        'Inline Docker Compose YAML — MCP base64-encodes for the API',
      ),
    compose_file: z
      .string()
      .optional()
      .describe(
        'Local path to a docker-compose.yml file (max 1 MiB) — MCP reads and base64-encodes for the API',
      ),
    urls: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
        }),
      )
      .optional()
      .describe('Optional domain URLs'),
    instant_deploy: z
      .boolean()
      .default(true)
      .describe(
        'Start/deploy immediately after create (default true for services)',
      ),
    force_domain_override: z
      .boolean()
      .default(false)
      .describe('Override domain conflict on create'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    requireServiceCreateSource(data, ctx);
    requireProjectAndEnvironment(data, ctx);
  });

export const serviceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Service UUID'),
    ...sharedReadParamsSchema,
  }),
  createActionSchema,
  startActionSchema,
  stopActionSchema,
  restartActionSchema,
  deployActionSchema,
]);

export type ServiceAction = z.infer<typeof serviceActionSchema>;

export type ServiceGetResult = ReadResponse<
  ServiceSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type ServiceMutationResult = ReadResponse<{
  uuid: string;
  action: 'start' | 'stop' | 'restart';
  status: 'requested';
}>;

export type ServiceDeployResult = ReadResponse<{
  uuid: string;
  action: 'deploy';
  status: 'requested';
  pull_latest: boolean;
}>;

export type ServiceCreateResult = ReadResponse<
  | {
      uuid: string;
      compose?: string;
      deploy: { status: 'queued' };
      hints: string[];
    }
  | {
      ok: true;
      uuid: string;
      deploy: { status: 'failed_to_queue'; error: string };
      recoveryHints: string[];
    }
  | {
      uuid: string;
      deploy: { status: 'not_triggered' };
      hints: string[];
    }
>;

export type ServiceActionResult =
  | ServiceGetResult
  | ServiceMutationResult
  | ServiceDeployResult
  | ServiceCreateResult
  | McpErrorResult;

type ServiceMatchable = FindableResource & { environment_name: string };

type ServiceIdentifierInput = {
  uuid?: string;
  name?: string;
};

type MutationAction =
  | z.infer<typeof startActionSchema>
  | z.infer<typeof stopActionSchema>
  | z.infer<typeof restartActionSchema>;
type DeployAction = z.infer<typeof deployActionSchema>;
type CreateAction = z.infer<typeof createActionSchema>;

function throwValidationError(error: z.ZodError, args: unknown): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  let code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? undefined;

  if (!code && isRecord(args) && args.action === 'create') {
    code = 'COOLIFY_VALIDATION_ERROR';
  }

  const resolvedCode = code ?? 'COOLIFY_422';

  throw new CoolifyApiError({
    code: resolvedCode,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints:
      RECOVERY_HINTS[resolvedCode] ?? RECOVERY_HINTS.COOLIFY_422,
  });
}

function parseServiceAction(args: unknown): ServiceAction {
  const parsed = serviceActionSchema.safeParse(args);
  if (!parsed.success) {
    throwValidationError(parsed.error, args);
  }
  return parsed.data;
}

function omitUndefined(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function projectServiceMatchable(raw: Record<string, unknown>): ServiceMatchable {
  const summary = projectResourceSummary(raw);
  return {
    ...summary,
    environment_name:
      (raw.environment as { name?: string } | undefined)?.name ?? 'unknown',
  };
}

async function resolveServiceMutationUuid(
  parsed: ServiceIdentifierInput,
  env: EnvConfig,
): Promise<string> {
  if (parsed.uuid) {
    return parsed.uuid;
  }

  const rawResources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const services = rawResources
    .filter(isRecord)
    .filter((raw) => raw.type === 'service')
    .map(projectServiceMatchable);

  const searchTerms = {
    name: parsed.name,
  };

  const matches = services.filter((item) =>
    matchesExplicitFields(item, {
      name: parsed.name,
    }),
  );

  const ranked = rankFindMatches(matches, searchTerms).slice(0, FIND_MATCH_CAP);

  if (ranked.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: 'No service matched the mutation input.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_404,
    });
  }

  if (ranked.length > 1) {
    const serviceMatches = ranked as ServiceMatchable[];
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message:
        'Multiple services matched the mutation input — refusing to mutate. Re-run with an explicit UUID.',
      recoveryHints: [
        'Re-run the mutation with an explicit UUID.',
        'Multiple services matched — narrow the name substring or pass the UUID directly.',
        ...serviceMatches.map(
          (r) =>
            `- ${r.name} (${r.uuid}) project=${r.project_name ?? 'unknown'} environment=${r.environment_name ?? 'unknown'}`,
        ),
      ],
    });
  }

  return ranked[0].uuid;
}

async function handleServiceMutation(
  parsed: MutationAction,
  env: EnvConfig,
): Promise<ServiceMutationResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);

  switch (parsed.action) {
    case 'start':
      await triggerServiceStart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'stop':
      await triggerServiceStop(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        parsed.docker_cleanup,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'restart':
      await triggerServiceRestart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        false,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
  }

  return buildReadResponse(
    { uuid, action: parsed.action, status: 'requested' as const },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleServiceDeploy(
  parsed: DeployAction,
  env: EnvConfig,
): Promise<ServiceDeployResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);

  await triggerServiceRestart(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.pull_latest,
    env.COOLIFY_VERIFY_SSL,
  );

  return buildReadResponse(
    {
      uuid,
      action: 'deploy' as const,
      status: 'requested' as const,
      pull_latest: parsed.pull_latest,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

const COMPOSE_FILE_SIZE_LIMIT = 1024 * 1024;

async function handleServiceCreate(
  parsed: CreateAction,
  env: EnvConfig,
): Promise<ServiceCreateResult> {
  const project_uuid = await resolveProjectUuid(
    parsed.project_uuid,
    parsed.project_name,
    env,
  );

  let composeYaml: string | undefined;

  if (parsed.compose_file) {
    try {
      composeYaml = readFileSync(parsed.compose_file, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: `Cannot read compose_file at ${parsed.compose_file}: ${message}`,
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }

    if (Buffer.byteLength(composeYaml, 'utf8') > COMPOSE_FILE_SIZE_LIMIT) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'compose_file exceeds 1 MiB limit',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
  } else if (parsed.compose) {
    composeYaml = parsed.compose;
  }

  const body: Record<string, unknown> = {
    server_uuid: parsed.server_uuid,
    project_uuid,
    name: parsed.name,
    description: parsed.description,
    urls: parsed.urls,
    instant_deploy: parsed.instant_deploy,
    force_domain_override: parsed.force_domain_override,
  };

  if (parsed.environment_name) {
    body.environment_name = parsed.environment_name;
  }
  if (parsed.environment_uuid) {
    body.environment_uuid = parsed.environment_uuid;
  }

  if (parsed.type) {
    body.type = parsed.type;
  }

  if (composeYaml !== undefined) {
    const validation = validateCompose(composeYaml);
    if (!validation.ok) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: `Invalid compose YAML: ${validation.error}`,
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
    body.docker_compose_raw = encodeCompose(composeYaml);
  }

  let raw: unknown;
  try {
    raw = await createService(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      omitUndefined(body),
      env.COOLIFY_VERIFY_SSL,
    );
  } catch (error) {
    if (error instanceof CoolifyApiError) {
      const conflicts = error.envelope.data?.conflicts;
      if (conflicts !== undefined) {
        throw new CoolifyApiError({
          ...error.envelope,
          recoveryHints: [
            ...error.envelope.recoveryHints,
            'Retry with force_domain_override: true on the same create call to override the domain conflict.',
          ],
        });
      }
    }
    throw error;
  }

  const created = isRecord(raw) ? raw : {};
  const projected = projectServiceCompose(created);
  const serviceUuid = String(projected.uuid ?? '');

  if (!parsed.instant_deploy) {
    return buildReadResponse(
      {
        uuid: serviceUuid,
        ...(typeof projected.compose === 'string'
          ? { compose: projected.compose }
          : {}),
        deploy: { status: 'not_triggered' as const },
        hints: ['Use service.start or service.deploy to start the service'],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  try {
    await triggerServiceStart(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      serviceUuid,
      env.COOLIFY_VERIFY_SSL,
    );

    return buildReadResponse(
      {
        uuid: serviceUuid,
        ...(typeof projected.compose === 'string'
          ? { compose: projected.compose }
          : {}),
        deploy: { status: 'queued' as const },
        hints: [
          'Use service.get with uuid to inspect deployed compose',
          'Use service.deploy to re-deploy',
          'Use service.stop or service.start for lifecycle',
        ],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildReadResponse(
      {
        ok: true as const,
        uuid: serviceUuid,
        ...(typeof projected.compose === 'string'
          ? { compose: projected.compose }
          : {}),
        deploy: {
          status: 'failed_to_queue' as const,
          error: message,
        },
        recoveryHints: [
          'Service was created successfully — retry start with service.start or service.deploy.',
          'Check Coolify server logs if start queue failures persist.',
        ],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }
}

export async function handleServiceAction(
  args: unknown,
  env: EnvConfig,
): Promise<ServiceActionResult> {
  try {
    const parsed = parseServiceAction(args);

    switch (parsed.action) {
      case 'create':
        return await handleServiceCreate(parsed, env);
      case 'start':
      case 'stop':
      case 'restart':
        return await handleServiceMutation(parsed, env);
      case 'deploy':
        return await handleServiceDeploy(parsed, env);
      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const raw = await fetchService(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          parsed.uuid,
          env.COOLIFY_VERIFY_SSL,
        );

        const rawRecord = isRecord(raw) ? raw : {};
        const projected = projectServiceCompose(rawRecord);
        const hints = generateHints(
          'service',
          parsed.uuid,
          String(rawRecord.status ?? 'unknown'),
          rawRecord.health_check_status !== undefined
            ? String(rawRecord.health_check_status)
            : undefined,
        );

        const lookup = await buildProjectEnvironmentIndex(env);
        const data =
          projection === 'full'
            ? {
                ...(sanitizeFullProjection(projected, parsed.reveal) as Record<
                  string,
                  unknown
                >),
                hints,
              }
            : { ...projectServiceSummary(projected, lookup), hints };

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isServiceErrorResult(
  result: ServiceActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
