import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchResources,
  fetchService,
  triggerServiceRestart,
  triggerServiceStart,
  triggerServiceStop,
} from '../../api/client.js';
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

export const serviceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Service UUID'),
    ...sharedReadParamsSchema,
  }),
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

export type ServiceActionResult =
  | ServiceGetResult
  | ServiceMutationResult
  | ServiceDeployResult
  | McpErrorResult;

type ServiceMatchable = FindableResource & { environment_name: string };

type ServiceIdentifierInput = {
  uuid?: string;
  name?: string;
};

type MutationAction = z.infer<typeof startActionSchema>;
type DeployAction = z.infer<typeof deployActionSchema>;

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

export async function handleServiceAction(
  args: ServiceAction,
  env: EnvConfig,
): Promise<ServiceActionResult> {
  const parsed = serviceActionSchema.parse(args);

  try {
    switch (parsed.action) {
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
        const hints = generateHints(
          'service',
          parsed.uuid,
          String(rawRecord.status ?? 'unknown'),
          rawRecord.health_check_status !== undefined
            ? String(rawRecord.health_check_status)
            : undefined,
        );

        const data =
          projection === 'full'
            ? { ...(sanitizeFullProjection(raw) as Record<string, unknown>), hints }
            : { ...projectServiceSummary(rawRecord), hints };

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
