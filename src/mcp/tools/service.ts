import * as z from 'zod/v4';
import {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import type { EnvConfig } from '../config/env.js';
import {
  createService,
  deleteService,
  fetchResources,
  fetchService,
  triggerServiceRestart,
  triggerServiceStart,
  triggerServiceStop,
  updateService,
  fetchEnvs,
  createEnv,
  updateEnvViaBulk,
  bulkUpdateEnvs,
  deleteEnv,
  type Env,
  type EnvBulkEntry,
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
import { redactSecrets } from '../../utils/redact.js';
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
import {
  buildEnvBulkEntry,
  maskEnvRecord,
  maskEnvRecords,
  resolveEnvIdentity,
  validateEnvMutationConfirm,
  withRevealRecoveryHints,
} from './env-shared.js';

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

function requireComposeXor(
  data: { compose?: string; compose_file?: string },
  ctx: z.RefinementCtx,
): void {
  const hasCompose =
    typeof data.compose === 'string' && data.compose.length > 0;
  const hasComposeFile =
    typeof data.compose_file === 'string' && data.compose_file.length > 0;

  if (hasCompose && hasComposeFile) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Exactly one of compose (inline YAML) or compose_file (local path) is allowed on update',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

const SERVICE_UPDATE_CURATED_FIELD_KEYS = [
  'name',
  'description',
  'project_uuid',
  'environment_name',
  'environment_uuid',
  'server_uuid',
  'destination_uuid',
  'instant_deploy',
  'connect_to_docker_network',
  'urls',
  'force_domain_override',
  'is_container_label_escape_enabled',
] as const;

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
    reveal: z
      .boolean()
      .default(false)
      .describe('Reveal masked secrets (including compose YAML) in response'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    requireServiceCreateSource(data, ctx);
    requireProjectAndEnvironment(data, ctx);
  });

const updateActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('update'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z
        .string()
        .optional()
        .describe('Service name substring or new name when uuid given'),
      description: z.string().optional().describe('Service description'),
      project_uuid: z.string().optional().describe('Project UUID'),
      environment_name: z.string().optional().describe('Environment name'),
      environment_uuid: z.string().optional().describe('Environment UUID'),
      server_uuid: z.string().optional().describe('Server UUID'),
      destination_uuid: z.string().optional().describe('Destination UUID'),
      instant_deploy: z.boolean().optional().describe('Instant deploy flag'),
      connect_to_docker_network: z
        .boolean()
        .optional()
        .describe('Connect to Docker network'),
      compose: z
        .string()
        .optional()
        .describe(
          'Inline Docker Compose YAML — MCP base64-encodes for the API',
        ),
      compose_file: z
        .string()
        .optional()
        .describe('Local path to docker-compose.yml (max 1 MiB)'),
      urls: z
        .array(
          z.object({
            name: z.string(),
            url: z.string(),
          }),
        )
        .optional()
        .describe('Domain URLs'),
      force_domain_override: z
        .boolean()
        .default(false)
        .describe('Override domain conflict on update'),
      is_container_label_escape_enabled: z
        .boolean()
        .optional()
        .describe('Container label escape enabled'),
      reveal: z
        .boolean()
        .default(false)
        .describe('Reveal masked secrets in full projection response'),
      ...mutationResponseParamsSchema,
    })
    .strict()
    .superRefine((data, ctx) => {
      requireComposeXor(data, ctx);
    }),
  'update',
);

const deleteActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('delete'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z.string().optional().describe('Service name substring'),
      confirm: z
        .boolean()
        .default(false)
        .describe('Explicit confirmation required for destructive delete'),
      delete_volumes: z
        .boolean()
        .default(false)
        .describe('Also delete attached volumes (default false)'),
      delete_configurations: z
        .boolean()
        .default(false)
        .describe('Also delete configurations (default false)'),
      docker_cleanup: z
        .boolean()
        .default(false)
        .describe('Run Docker cleanup (default false)'),
      delete_connected_networks: z
        .boolean()
        .default(false)
        .describe('Delete connected networks (default false)'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'delete',
);

const deletePreviewActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('delete_preview'),
      uuid: z.string().optional().describe('Service UUID'),
      name: z.string().optional().describe('Service name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'delete_preview',
);

const envParentFields = {
  uuid: z.string().optional().describe('Service UUID'),
  name: z.string().optional().describe('Service name substring'),
  reveal: z
    .boolean()
    .default(false)
    .describe('Reveal masked env values for this call only'),
  ...mutationResponseParamsSchema,
};

const envFlagFields = {
  is_preview: z
    .boolean()
    .default(false)
    .describe('Preview variable (build-time only)'),
  is_literal: z
    .boolean()
    .default(false)
    .describe('Treat value as literal (no variable interpolation)'),
  is_multiline: z
    .boolean()
    .default(false)
    .describe('Multiline env value'),
  is_shown_once: z
    .boolean()
    .default(false)
    .describe('Show value once in Coolify UI'),
};

function requireEnvUuidOrKey(
  data: { env_uuid?: string; key?: string },
  ctx: z.RefinementCtx,
  actionName: string,
): void {
  const hasUuid =
    typeof data.env_uuid === 'string' && data.env_uuid.length > 0;
  const hasKey = typeof data.key === 'string' && data.key.length > 0;

  if (!hasUuid && !hasKey) {
    ctx.addIssue({
      code: 'custom',
      message: `At least one of env_uuid or key is required for action ${actionName}`,
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

const envsListActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('envs:list'),
      ...envParentFields,
    })
    .strict(),
  'envs:list',
);

const envsGetActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('envs:get'),
      env_uuid: z.string().optional().describe('Environment variable UUID'),
      key: z.string().optional().describe('Environment variable key'),
      ...envParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      requireEnvUuidOrKey(data, ctx, 'envs:get');
    }),
  'envs:get',
);

const envsCreateActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('envs:create'),
      key: z.string().describe('Environment variable key'),
      value: z.string().describe('Environment variable value'),
      ...envFlagFields,
      ...envParentFields,
    })
    .strict(),
  'envs:create',
);

const envsUpdateActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('envs:update'),
      env_uuid: z.string().optional().describe('Environment variable UUID'),
      key: z.string().optional().describe('Environment variable key'),
      value: z.string().describe('New environment variable value'),
      is_preview: z.boolean().optional().describe('Preview variable override'),
      is_literal: z.boolean().optional().describe('Literal flag override'),
      is_multiline: z.boolean().optional().describe('Multiline flag override'),
      is_shown_once: z
        .boolean()
        .optional()
        .describe('Show-once flag override'),
      ...envParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      requireEnvUuidOrKey(data, ctx, 'envs:update');
    }),
  'envs:update',
);

const envsDeleteActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('envs:delete'),
      env_uuid: z.string().describe('Environment variable UUID to delete'),
      confirm: z
        .boolean()
        .default(false)
        .describe('Explicit confirmation required for env delete'),
      ...envParentFields,
    })
    .strict(),
  'envs:delete',
);

const envBulkEntrySchema = z
  .object({
    key: z.string().describe('Environment variable key'),
    value: z.string().describe('Environment variable value'),
    is_preview: z.boolean().optional().describe('Preview variable'),
    is_literal: z.boolean().optional().describe('Literal flag'),
    is_multiline: z.boolean().optional().describe('Multiline flag'),
    is_shown_once: z.boolean().optional().describe('Show-once flag'),
  })
  .strict();

const envsBulkUpdateActionSchema = requireServiceMutationIdentifier(
  z
    .object({
      action: z.literal('envs:bulk-update'),
      entries: z
        .array(envBulkEntrySchema)
        .min(1)
        .describe('Bulk env entries (min 1, max 100 per call)'),
      confirm: z
        .boolean()
        .default(false)
        .describe('Explicit confirmation required for bulk env update'),
      ...envParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.entries.length > 100) {
        ctx.addIssue({
          code: 'custom',
          message:
            'envs:bulk-update accepts at most 100 entries per call — batch into multiple requests',
          path: ['entries'],
          params: { code: 'COOLIFY_VALIDATION_ERROR' },
        });
      }
    }),
  'envs:bulk-update',
);

export const serviceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Service UUID'),
    ...sharedReadParamsSchema,
  }),
  createActionSchema,
  updateActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
  startActionSchema,
  stopActionSchema,
  restartActionSchema,
  deployActionSchema,
  envsListActionSchema,
  envsGetActionSchema,
  envsCreateActionSchema,
  envsUpdateActionSchema,
  envsDeleteActionSchema,
  envsBulkUpdateActionSchema,
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

export type ServiceUpdateResult = ReadResponse<Record<string, unknown>>;

export type ServiceDeleteResult = ReadResponse<{
  ok: true;
  uuid: string;
  deleted: true;
  delete_volumes: boolean;
  delete_configurations: boolean;
}>;

export type ServiceDeletePreviewResult = ReadResponse<{
  uuid: string;
  child_resources: Array<{
    uuid: string;
    name?: string;
    type?: string;
  }>;
  would_delete: true;
  warning?: string;
}>;

export type ServiceEnvsListResult = ReadResponse<
  Array<Record<string, unknown>>
> & { recoveryHints?: string[] };

export type ServiceEnvsGetResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type ServiceEnvsCreateResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type ServiceEnvsUpdateResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type ServiceEnvsDeleteResult = ReadResponse<{
  ok: true;
  env_uuid: string;
}> & { recoveryHints?: string[] };

export type ServiceEnvsBulkUpdateResult = ReadResponse<{
  ok: true;
}> & { recoveryHints?: string[] };

export type ServiceActionResult =
  | ServiceGetResult
  | ServiceMutationResult
  | ServiceDeployResult
  | ServiceCreateResult
  | ServiceUpdateResult
  | ServiceDeleteResult
  | ServiceDeletePreviewResult
  | ServiceEnvsListResult
  | ServiceEnvsGetResult
  | ServiceEnvsCreateResult
  | ServiceEnvsUpdateResult
  | ServiceEnvsDeleteResult
  | ServiceEnvsBulkUpdateResult
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
type UpdateAction = z.infer<typeof updateActionSchema>;
type DeleteAction = z.infer<typeof deleteActionSchema>;
type DeletePreviewAction = z.infer<typeof deletePreviewActionSchema>;
type EnvsListAction = z.infer<typeof envsListActionSchema>;
type EnvsGetAction = z.infer<typeof envsGetActionSchema>;
type EnvsCreateAction = z.infer<typeof envsCreateActionSchema>;
type EnvsUpdateAction = z.infer<typeof envsUpdateActionSchema>;
type EnvsDeleteAction = z.infer<typeof envsDeleteActionSchema>;
type EnvsBulkUpdateAction = z.infer<typeof envsBulkUpdateActionSchema>;

function throwValidationError(error: z.ZodError, args: unknown): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  let code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? undefined;

  if (
    !code &&
    isRecord(args) &&
    (args.action === 'create' ||
      args.action === 'update' ||
      (typeof args.action === 'string' && args.action.startsWith('envs:')))
  ) {
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

/** Mask compose YAML unless reveal:true — secrets live in env blocks, not key names. */
function maskComposeIfNeeded(
  projected: Record<string, unknown>,
  reveal: boolean,
): Record<string, unknown> {
  if (reveal || typeof projected.compose !== 'string') {
    return projected;
  }
  return { ...projected, compose: '***' };
}

function readBoundedComposeFile(composeFilePath: string): string {
  const ext = path.extname(composeFilePath).toLowerCase();
  if (ext !== '.yml' && ext !== '.yaml') {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'compose_file must use a .yml or .yaml extension',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  let root: string;
  try {
    root = realpathSync(process.cwd());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `Cannot resolve compose_file allowlist root: ${message}`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const resolved = path.resolve(root, composeFilePath);
  let realPath: string;
  try {
    realPath = realpathSync(resolved);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `Cannot read compose_file at ${composeFilePath}: ${message}`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (realPath !== root && !realPath.startsWith(rootPrefix)) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `compose_file path escapes allowlisted root (${root})`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const fd = openSync(realPath, 'r');
  try {
    if (fstatSync(fd).size > COMPOSE_FILE_SIZE_LIMIT) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'compose_file exceeds 1 MiB limit',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
    return readFileSync(fd, 'utf8');
  } finally {
    closeSync(fd);
  }
}

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
    composeYaml = readBoundedComposeFile(parsed.compose_file);

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
    if (Buffer.byteLength(composeYaml, 'utf8') > COMPOSE_FILE_SIZE_LIMIT) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'compose exceeds 1 MiB limit',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
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

  // Domain-conflict create hint is already attached by toStructuredError.
  const raw = await createService(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    omitUndefined(body),
    env.COOLIFY_VERIFY_SSL,
  );

  const created = isRecord(raw) ? raw : {};
  const projected = maskComposeIfNeeded(
    projectServiceCompose(created),
    parsed.reveal,
  );
  const serviceUuid = typeof projected.uuid === 'string' ? projected.uuid : '';
  if (!serviceUuid) {
    throw new CoolifyApiError({
      code: 'COOLIFY_500',
      message: 'Service create succeeded but response lacked uuid',
      recoveryHints: RECOVERY_HINTS.COOLIFY_500,
    });
  }

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
          error: redactSecrets(message),
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

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on service '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

function buildUpdatePayload(
  parsed: UpdateAction,
  docker_compose_raw?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of SERVICE_UPDATE_CURATED_FIELD_KEYS) {
    if (key === 'force_domain_override') {
      continue;
    }
    // Name is identifier when uuid omitted — do not treat search term as rename.
    if (key === 'name' && !parsed.uuid) {
      continue;
    }
    const value = parsed[key];
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  if (parsed.force_domain_override === true) {
    payload.force_domain_override = true;
  }

  if (docker_compose_raw !== undefined) {
    payload.docker_compose_raw = docker_compose_raw;
  }

  return omitUndefined(payload);
}

async function handleServiceUpdate(
  parsed: UpdateAction,
  env: EnvConfig,
): Promise<ServiceUpdateResult> {
  const uuid = await resolveServiceMutationUuid(
    { uuid: parsed.uuid, name: parsed.name },
    env,
  );

  let composeYaml: string | undefined;

  if (parsed.compose_file) {
    composeYaml = readBoundedComposeFile(parsed.compose_file);

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

  let docker_compose_raw: string | undefined;
  if (composeYaml !== undefined) {
    if (Buffer.byteLength(composeYaml, 'utf8') > COMPOSE_FILE_SIZE_LIMIT) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'compose exceeds 1 MiB limit',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
    const validation = validateCompose(composeYaml);
    if (!validation.ok) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: `Invalid compose YAML: ${validation.error}`,
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
    docker_compose_raw = encodeCompose(composeYaml);
  }

  const payload = buildUpdatePayload(parsed, docker_compose_raw);

  try {
    await updateService(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      uuid,
      payload,
      env.COOLIFY_VERIFY_SSL,
    );
  } catch (error) {
    if (error instanceof CoolifyApiError) {
      const conflicts = error.envelope.data?.conflicts;
      if (conflicts !== undefined) {
        // Replace create-oriented conflict hints with update-specific guidance.
        throw new CoolifyApiError({
          ...error.envelope,
          recoveryHints: [
            ...RECOVERY_HINTS.COOLIFY_409,
            'Retry with force_domain_override: true on the same update call to override the domain conflict.',
          ],
        });
      }
    }
    throw error;
  }

  const raw = await fetchService(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const rawRecord = isRecord(raw) ? raw : {};
  const projected = projectServiceCompose(rawRecord);
  const data = sanitizeFullProjection(
    maskComposeIfNeeded(projected, parsed.reveal),
    parsed.reveal,
  ) as Record<string, unknown>;

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleServiceDelete(
  parsed: DeleteAction,
  env: EnvConfig,
): Promise<ServiceDeleteResult> {
  const uuid = await resolveServiceMutationUuid(
    { uuid: parsed.uuid, name: parsed.name },
    env,
  );

  validateDeleteConfirm(parsed.confirm, uuid);

  await deleteService(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    {
      delete_volumes: parsed.delete_volumes,
      delete_configurations: parsed.delete_configurations,
      docker_cleanup: parsed.docker_cleanup,
      delete_connected_networks: parsed.delete_connected_networks,
    },
    env.COOLIFY_VERIFY_SSL,
  );

  return buildReadResponse(
    {
      ok: true as const,
      uuid,
      deleted: true as const,
      delete_volumes: parsed.delete_volumes,
      delete_configurations: parsed.delete_configurations,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

function mapNestedChildResources(
  resources: unknown[],
  fallbackType: string,
): Array<{ uuid: string; name?: string; type?: string }> {
  return resources.filter(isRecord).map((resource) => ({
    uuid: String(resource.uuid ?? ''),
    name: resource.name != null ? String(resource.name) : undefined,
    type:
      resource.type != null ? String(resource.type) : fallbackType,
  }));
}

async function handleServiceDeletePreview(
  parsed: DeletePreviewAction,
  env: EnvConfig,
): Promise<ServiceDeletePreviewResult> {
  const uuid = await resolveServiceMutationUuid(
    { uuid: parsed.uuid, name: parsed.name },
    env,
  );

  // Coolify GET /services/{uuid} loads nested applications + databases
  // (ServiceApplication / ServiceDatabase). Flat /resources has no service_uuid.
  const raw = await fetchService(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const record = isRecord(raw) ? raw : {};
  const childResources = [
    ...mapNestedChildResources(
      Array.isArray(record.applications) ? record.applications : [],
      'service-application',
    ),
    ...mapNestedChildResources(
      Array.isArray(record.databases) ? record.databases : [],
      'service-database',
    ),
  ];

  const response: {
    uuid: string;
    child_resources: typeof childResources;
    would_delete: true;
    warning?: string;
  } = {
    uuid,
    child_resources: childResources,
    would_delete: true,
  };

  if (childResources.length > 0) {
    response.warning =
      'Service has child resources that will also be removed or orphaned — review child_resources before confirming delete.';
  }

  return buildReadResponse(response, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleServiceEnvsList(
  parsed: EnvsListAction,
  env: EnvConfig,
): Promise<ServiceEnvsListResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);
  const envs = await fetchEnvs(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const data = maskEnvRecords(envs, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleServiceEnvsGet(
  parsed: EnvsGetAction,
  env: EnvConfig,
): Promise<ServiceEnvsGetResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);
  const envs = await fetchEnvs(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const found = resolveEnvIdentity(envs, {
    env_uuid: parsed.env_uuid,
    key: parsed.key,
  }, 'service');
  const data = maskEnvRecord(found, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleServiceEnvsCreate(
  parsed: EnvsCreateAction,
  env: EnvConfig,
): Promise<ServiceEnvsCreateResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);
  const created = await createEnv(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    {
      key: parsed.key,
      value: parsed.value,
      is_preview: parsed.is_preview,
      is_literal: parsed.is_literal,
      is_multiline: parsed.is_multiline,
      is_shown_once: parsed.is_shown_once,
    },
    env.COOLIFY_VERIFY_SSL,
  );

  const envs = await fetchEnvs(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const stored = resolveEnvIdentity(envs, { env_uuid: created.uuid }, 'service');

  const data = maskEnvRecord(
    {
      uuid: stored.uuid,
      key: stored.key,
      value: stored.value,
      is_preview: stored.is_preview ?? parsed.is_preview,
      is_literal: stored.is_literal ?? parsed.is_literal,
      is_multiline: stored.is_multiline ?? parsed.is_multiline,
      is_shown_once: stored.is_shown_once ?? parsed.is_shown_once,
    },
    parsed.reveal,
  );

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleServiceEnvsUpdate(
  parsed: EnvsUpdateAction,
  env: EnvConfig,
): Promise<ServiceEnvsUpdateResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);
  let resolvedKey = parsed.key;
  let resolvedEnvUuid = parsed.env_uuid;

  const envs = await fetchEnvs(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  if (parsed.env_uuid) {
    const found = resolveEnvIdentity(envs, { env_uuid: parsed.env_uuid }, 'service');
    resolvedKey = found.key;
    resolvedEnvUuid = found.uuid;
  } else if (parsed.key) {
    const found = resolveEnvIdentity(envs, { key: parsed.key }, 'service');
    resolvedKey = found.key;
    resolvedEnvUuid = found.uuid;
  }

  if (!resolvedKey) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'At least one of env_uuid or key is required.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const entry = buildEnvBulkEntry({
    key: resolvedKey,
    value: parsed.value,
    is_preview: parsed.is_preview,
    is_literal: parsed.is_literal,
    is_multiline: parsed.is_multiline,
    is_shown_once: parsed.is_shown_once,
  });

  await updateEnvViaBulk(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    [entry],
    env.COOLIFY_VERIFY_SSL,
  );

  const data = maskEnvRecord(
    {
      uuid: resolvedEnvUuid,
      key: resolvedKey,
      value: parsed.value,
      is_preview: parsed.is_preview,
      is_literal: parsed.is_literal,
      is_multiline: parsed.is_multiline,
      is_shown_once: parsed.is_shown_once,
    },
    parsed.reveal,
  );

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleServiceEnvsDelete(
  parsed: EnvsDeleteAction,
  env: EnvConfig,
): Promise<ServiceEnvsDeleteResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);
  validateEnvMutationConfirm(parsed.confirm, 'envs:delete', uuid, 'service');

  await deleteEnv(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.env_uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  return withRevealRecoveryHints(
    buildReadResponse(
      {
        ok: true as const,
        env_uuid: parsed.env_uuid,
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
}

async function handleServiceEnvsBulkUpdate(
  parsed: EnvsBulkUpdateAction,
  env: EnvConfig,
): Promise<ServiceEnvsBulkUpdateResult> {
  const uuid = await resolveServiceMutationUuid(parsed, env);
  validateEnvMutationConfirm(parsed.confirm, 'envs:bulk-update', uuid, 'service');

  const entries = parsed.entries.map((entry) => buildEnvBulkEntry(entry));

  await bulkUpdateEnvs(
    'service',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    entries,
    env.COOLIFY_VERIFY_SSL,
  );

  return withRevealRecoveryHints(
    buildReadResponse(
      { ok: true as const },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
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
      case 'update':
        return await handleServiceUpdate(parsed, env);
      case 'delete':
        return await handleServiceDelete(parsed, env);
      case 'delete_preview':
        return await handleServiceDeletePreview(parsed, env);
      case 'start':
      case 'stop':
      case 'restart':
        return await handleServiceMutation(parsed, env);
      case 'deploy':
        return await handleServiceDeploy(parsed, env);
      case 'envs:list':
        return await handleServiceEnvsList(parsed, env);
      case 'envs:get':
        return await handleServiceEnvsGet(parsed, env);
      case 'envs:create':
        return await handleServiceEnvsCreate(parsed, env);
      case 'envs:update':
        return await handleServiceEnvsUpdate(parsed, env);
      case 'envs:delete':
        return await handleServiceEnvsDelete(parsed, env);
      case 'envs:bulk-update':
        return await handleServiceEnvsBulkUpdate(parsed, env);
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
                ...(sanitizeFullProjection(
                  maskComposeIfNeeded(projected, parsed.reveal),
                  parsed.reveal,
                ) as Record<string, unknown>),
                hints,
              }
            : { ...projectServiceSummary(projected, lookup), hints };

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown service action: ${String(_exhaustive)}`);
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
