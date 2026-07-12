import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchApplication,
  fetchDeployment,
  fetchResources,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
  triggerDeploy,
} from '../../api/client.js';
import {
  projectApplicationSummary,
  projectDeploymentSummary,
  projectResourceSummary,
  resolveProjection,
  sanitizeFullProjection,
  type ApplicationSummary,
} from '../../utils/projections.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';
import { generateHints, logsAvailableHint } from '../../utils/diagnose-hints.js';
import { pollDeploymentUntilTerminal } from '../../utils/deploy-poll.js';
import {
  FIND_MATCH_CAP,
  matchesExplicitFields,
  rankFindMatches,
  type FindableResource,
} from './resource.js';

const MUTATION_IDENTIFIER_FIELDS = ['uuid', 'name', 'fqdn'] as const;

const DEPLOY_IDENTIFIER_FIELDS = [
  'uuid',
  'name',
  'fqdn',
  'uuids',
  'tags',
  'tag',
] as const;

const mutationResponseParamsSchema = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .default('pretty')
    .optional()
    .describe('Output format (default pretty)'),
  max_chars: z
    .number()
    .int()
    .positive()
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
    if (field === 'uuids' || field === 'tags') {
      return Array.isArray(value) && value.length > 0;
    }
    return typeof value === 'string' && value.length > 0;
  });
}

function requireMutationIdentifier<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  actionName: string,
) {
  return schema.superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, MUTATION_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message: `At least one identifier (uuid|name|fqdn) required for action ${actionName}`,
        params: { code: 'COOLIFY_422' },
      });
    }
  });
}

const startActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('start'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'start',
);

const stopActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('stop'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'stop',
);

const restartActionSchema = requireMutationIdentifier(
  z
    .object({
      action: z.literal('restart'),
      uuid: z.string().optional().describe('Application UUID'),
      name: z.string().optional().describe('Application name substring'),
      fqdn: z.string().optional().describe('Application FQDN substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'restart',
);

const deployActionSchema = z
  .object({
    action: z.literal('deploy'),
    uuid: z.string().optional().describe('Application UUID'),
    name: z.string().optional().describe('Application name substring'),
    fqdn: z.string().optional().describe('Application FQDN substring'),
    uuids: z.array(z.string()).optional().describe('Batch deploy UUIDs'),
    tags: z.array(z.string()).optional().describe('Batch deploy tags'),
    tag: z.string().optional().describe('Single tag batch expand'),
    force: z.boolean().default(false).describe('Force rebuild without cache'),
    wait: z.boolean().default(false).describe('Poll until terminal or timeout'),
    timeout: z
      .number()
      .int()
      .min(10)
      .max(1800)
      .default(300)
      .describe('Wait-mode timeout in seconds (default 300, max 1800)'),
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
  })
  .superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, DEPLOY_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'At least one identifier (uuid|name|fqdn|uuids|tags|tag) required for action deploy',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

export const applicationActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Application UUID'),
    ...sharedReadParamsSchema,
  }),
  startActionSchema,
  stopActionSchema,
  restartActionSchema,
  deployActionSchema,
]);

export type ApplicationAction = z.infer<typeof applicationActionSchema>;

export type ApplicationGetResult = ReadResponse<
  ApplicationSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type ApplicationMutationResult = ReadResponse<{
  uuid: string;
  action: 'start' | 'stop' | 'restart';
  status: 'requested';
}>;

export type ApplicationDeployResult = ReadResponse<{
  uuid?: string;
  deployment_uuid: string;
  status: string;
  force?: boolean;
  commit?: string;
  created_at?: string;
  finished_at?: string;
  logs_available: ReturnType<typeof logsAvailableHint>;
  hint?: string;
}>;

export type ApplicationActionResult =
  | ApplicationGetResult
  | ApplicationMutationResult
  | ApplicationDeployResult
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type MutationAction = z.infer<typeof startActionSchema>;
type DeployAction = z.infer<typeof deployActionSchema>;

async function resolveAppMutationUuid(
  parsed: MutationAction,
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

  const applications = rawResources
    .filter(isRecord)
    .filter((raw) => raw.type === 'application')
    .map(projectResourceSummary) as FindableResource[];

  const searchTerms = {
    name: parsed.name,
    domain: parsed.fqdn,
  };

  const matches = applications.filter((item) =>
    matchesExplicitFields(item, {
      name: parsed.name,
      domain: parsed.fqdn,
    }),
  );

  const ranked = rankFindMatches(matches, searchTerms).slice(0, FIND_MATCH_CAP);

  if (ranked.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: 'No application matched the mutation input.',
      recoveryHints: [
        'Check that the resource UUID or path exists on this Coolify instance.',
        'Confirm COOLIFY_URL points to the correct instance.',
      ],
    });
  }

  if (ranked.length > 1) {
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message:
        'Multiple applications matched the mutation input — refusing to mutate. Re-run with an explicit UUID.',
      recoveryHints: [
        'Re-run the mutation with an explicit UUID.',
        'Multiple applications matched — narrow the name/fqdn substring or pass the UUID directly.',
        ...ranked.map((r) => `- ${r.name} (${r.uuid})`),
      ],
    });
  }

  return ranked[0].uuid;
}

async function handleApplicationMutation(
  parsed: MutationAction,
  env: EnvConfig,
): Promise<ApplicationMutationResult> {
  const uuid = await resolveAppMutationUuid(parsed, env);

  switch (parsed.action) {
    case 'start':
      await triggerAppStart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'stop':
      await triggerAppStop(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'restart':
      await triggerAppRestart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
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

function extractDeploymentUuid(raw: unknown): string {
  const deployResp = isRecord(raw) ? raw : {};
  const deployments = Array.isArray(deployResp.deployments)
    ? deployResp.deployments
    : [];
  const first = deployments[0];
  if (isRecord(first)) {
    return String(first.deployment_uuid ?? '');
  }
  return '';
}

async function handleApplicationDeploy(
  parsed: DeployAction,
  env: EnvConfig,
): Promise<ApplicationDeployResult> {
  if (parsed.uuids || parsed.tags || parsed.tag) {
    throw new Error('Batch deploy not implemented in 04-02 — see 04-04');
  }

  const uuid = await resolveAppMutationUuid(parsed, env);

  const raw = await triggerDeploy(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.force,
    env.COOLIFY_VERIFY_SSL,
  );

  const deploymentUuid = extractDeploymentUuid(raw);

  if (!parsed.wait) {
    return buildReadResponse(
      {
        uuid,
        deployment_uuid: deploymentUuid,
        status: 'queued',
        force: parsed.force,
        logs_available: logsAvailableHint(deploymentUuid),
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  const timeoutMs = parsed.timeout * 1000;
  const fetcher = async () => {
    const dep = await fetchDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      deploymentUuid,
      env.COOLIFY_VERIFY_SSL,
    );
    return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
  };

  const terminal = await pollDeploymentUntilTerminal(fetcher, timeoutMs);
  const summary = projectDeploymentSummary(terminal);

  return buildReadResponse(
    {
      ...summary,
      logs_available: logsAvailableHint(deploymentUuid),
      ...(summary.status === 'timeout'
        ? {
            hint: `Re-call deployment.get with deployment_uuid=${deploymentUuid} to continue polling`,
          }
        : {}),
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

export async function handleApplicationAction(
  args: ApplicationAction,
  env: EnvConfig,
): Promise<ApplicationActionResult> {
  const parsed = applicationActionSchema.parse(args);

  try {
    switch (parsed.action) {
      case 'start':
      case 'stop':
      case 'restart':
        return await handleApplicationMutation(parsed, env);
      case 'deploy':
        return await handleApplicationDeploy(parsed, env);
      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const raw = await fetchApplication(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          parsed.uuid,
          env.COOLIFY_VERIFY_SSL,
        );

        const rawRecord = isRecord(raw) ? raw : {};
        const hints = generateHints(
          'application',
          parsed.uuid,
          String(rawRecord.status ?? 'unknown'),
          rawRecord.health_check_status !== undefined
            ? String(rawRecord.health_check_status)
            : undefined,
        );

        const data =
          projection === 'full'
            ? { ...(sanitizeFullProjection(raw) as Record<string, unknown>), hints }
            : { ...projectApplicationSummary(rawRecord), hints };

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown application action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isApplicationErrorResult(
  result: ApplicationActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
