import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchApplication,
  fetchApplicationLogs,
  fetchDeployment,
  fetchResources,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
  triggerDeploy,
} from '../../api/client.js';
import { buildProjectEnvironmentIndex } from '../../utils/project-lookup.js';
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
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  capLogOutput,
  parseBuildLogEntries,
  sliceLogBlob,
} from '../../utils/log-helpers.js';
import {
  rejectTableFormatOnFullProjection,
  sharedLogParamsSchema,
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

export const applicationLogsSchema = z
  .object({
    action: z.literal('logs'),
    uuid: z
      .string()
      .optional()
      .describe(
        'Application UUID — routes to runtime logs via GET /applications/{uuid}/logs',
      ),
    name: z
      .string()
      .optional()
      .describe('Application name substring for runtime log resolution'),
    fqdn: z
      .string()
      .optional()
      .describe('Application FQDN substring for runtime log resolution'),
    deployment_uuid: z
      .string()
      .optional()
      .describe(
        'Deployment UUID — routes to build logs via GET /deployments/{uuid} inline `logs` JSON-encoded array',
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(
        'Skip first K lines of the FLATTENED log blob before applying lines (build-logs pagination applied AFTER parse+filter+flatten)',
      ),
    ...sharedLogParamsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasRuntimeId = !!(data.uuid || data.name || data.fqdn);
    if (!hasRuntimeId && !data.deployment_uuid) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Either uuid (runtime logs) or deployment_uuid (build logs) must be provided',
        params: { code: 'COOLIFY_422' },
      });
    }
    if (hasRuntimeId && data.deployment_uuid) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Cannot provide both uuid and deployment_uuid — choose runtime OR build logs',
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
  applicationLogsSchema,
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

export type ApplicationDeployResult = ReadResponse<
  | {
      uuid?: string;
      deployment_uuid: string;
      status: string;
      force?: boolean;
      commit?: string;
      created_at?: string;
      finished_at?: string;
      logs_available: ReturnType<typeof logsAvailableHint>;
      hint?: string;
    }
  | {
      results: Array<
        | {
            uuid: string;
            deployment_uuid?: string;
            status: string;
            force?: boolean;
            commit?: string;
            created_at?: string;
            finished_at?: string;
            logs_available?: ReturnType<typeof logsAvailableHint>;
            hint?: string;
            error?: string;
          }
        | {
            tag: string;
            status: 'failed';
            error: string;
          }
      >;
    }
>;

export type ApplicationLogsResult = ReadResponse<{
  uuid?: string;
  deployment_uuid?: string;
  status?: string;
  logs_lines: string[];
  logs_truncated: boolean;
  total_lines: number;
  entries_total?: number;
  entries_hidden?: number;
  entries_shown?: number;
}>;

export type ApplicationActionResult =
  | ApplicationGetResult
  | ApplicationMutationResult
  | ApplicationDeployResult
  | ApplicationLogsResult
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type MutationAction = z.infer<typeof startActionSchema>;
type DeployAction = z.infer<typeof deployActionSchema>;
type LogsAction = z.infer<typeof applicationLogsSchema>;

type AppIdentifierInput = {
  uuid?: string;
  name?: string;
  fqdn?: string;
};

async function resolveAppMutationUuid(
  parsed: AppIdentifierInput,
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

export function extractDeploymentUuid(raw: unknown): string {
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

// Tag resolution uses /resources raw records. If items lack a `tags` field
// (some Coolify 4.1.x instances), every tag returns empty uuids — caller
// surfaces per-tag error entries. No fallback to GET /applications?tag=.
async function resolveTagUuids(
  tags: string[],
  env: EnvConfig,
): Promise<Array<{ tag: string; uuids: string[] }>> {
  const raw = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const apps = raw
    .filter(isRecord)
    .filter((record) => record.type === 'application');

  return tags.map((tag) => {
    const matched = apps.filter((record) => {
      const recordTags = record.tags;
      return (
        Array.isArray(recordTags) &&
        recordTags.some(
          (entry) =>
            typeof entry === 'string' &&
            entry.toLowerCase() === tag.toLowerCase(),
        )
      );
    });

    return {
      tag,
      uuids: matched.map((record) => String(record.uuid ?? record.id ?? '')),
    };
  });
}

async function handleBatchApplicationDeploy(
  parsed: DeployAction,
  env: EnvConfig,
): Promise<ApplicationDeployResult> {
  const explicitUuids = parsed.uuids ?? [];
  const tags = parsed.tags ?? (parsed.tag ? [parsed.tag] : []);
  const tagResults =
    tags.length > 0 ? await resolveTagUuids(tags, env) : [];
  const tagUuids = tagResults.flatMap((result) => result.uuids);
  const unmatchedTags = tagResults
    .filter((result) => result.uuids.length === 0)
    .map((result) => result.tag);
  const allUuids = [...new Set([...explicitUuids, ...tagUuids])];

  if (allUuids.length === 0 && unmatchedTags.length > 0) {
    return buildReadResponse(
      {
        results: unmatchedTags.map((tag) => ({
          tag,
          status: 'failed' as const,
          error: `No applications matched tag '${tag}'`,
        })),
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  if (allUuids.length === 0 && unmatchedTags.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_422',
      message:
        'Batch deploy requires at least one uuid, tag, or matched application.',
      recoveryHints: [
        'Review the request payload for missing or invalid fields.',
        'Check Coolify API docs for required parameters.',
      ],
    });
  }

  const results: Array<
    | {
        uuid: string;
        deployment_uuid?: string;
        status: string;
        force?: boolean;
        commit?: string;
        created_at?: string;
        finished_at?: string;
        logs_available?: ReturnType<typeof logsAvailableHint>;
        hint?: string;
        error?: string;
      }
    | {
        tag: string;
        status: 'failed';
        error: string;
      }
  > = [];

  for (const uuid of allUuids) {
    try {
      const raw = await triggerDeploy(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        parsed.force,
        env.COOLIFY_VERIFY_SSL,
      );
      const deploymentUuid = extractDeploymentUuid(raw);

      let entry: {
        uuid: string;
        deployment_uuid?: string;
        status: string;
        force?: boolean;
        commit?: string;
        created_at?: string;
        finished_at?: string;
        logs_available?: ReturnType<typeof logsAvailableHint>;
        hint?: string;
      } = {
        uuid,
        deployment_uuid: deploymentUuid,
        status: 'queued',
        force: parsed.force,
        logs_available: logsAvailableHint(deploymentUuid),
      };

      if (parsed.wait) {
        const fetcher = async () => {
          const dep = await fetchDeployment(
            env.COOLIFY_URL,
            env.COOLIFY_TOKEN,
            deploymentUuid,
            env.COOLIFY_VERIFY_SSL,
          );
          return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
        };
        const terminal = await pollDeploymentUntilTerminal(
          fetcher,
          parsed.timeout * 1000,
        );
        const summary = projectDeploymentSummary(terminal);
        entry = {
          uuid,
          ...summary,
          logs_available: logsAvailableHint(deploymentUuid),
          ...(summary.status === 'timeout'
            ? {
                hint: `Re-call deployment.get with deployment_uuid=${deploymentUuid} to continue polling`,
              }
            : {}),
        };
      }

      results.push(entry);
    } catch (error) {
      results.push({
        uuid,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finalResults = [
    ...unmatchedTags.map((tag) => ({
      tag,
      status: 'failed' as const,
      error: `No applications matched tag '${tag}'`,
    })),
    ...results,
  ];

  return buildReadResponse(
    { results: finalResults },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleApplicationDeploy(
  parsed: DeployAction,
  env: EnvConfig,
): Promise<ApplicationDeployResult> {
  if (parsed.uuids || parsed.tags || parsed.tag) {
    return handleBatchApplicationDeploy(parsed, env);
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

async function handleApplicationLogs(
  parsed: LogsAction,
  env: EnvConfig,
): Promise<ApplicationLogsResult> {
  if (parsed.deployment_uuid) {
    const raw = await fetchDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.deployment_uuid,
      env.COOLIFY_VERIFY_SSL,
    );
    const rec = isRecord(raw) ? raw : {};

    if (typeof rec.logs !== 'string') {
      throw new CoolifyApiError({
        code: 'COOLIFY_403_SENSITIVE_REQUIRED',
        message:
          'Deployment build logs are not available — the API token lacks the api.sensitive ability required to read deployment logs.',
        recoveryHints: RECOVERY_HINTS.COOLIFY_403_SENSITIVE_REQUIRED,
      });
    }

    const { parsed: parsedOk, entries } = parseBuildLogEntries(rec.logs);

    if (!parsedOk) {
      const allLines = sliceLogBlob(rec.logs, parsed.lines, parsed.offset);
      const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
      const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

      return buildReadResponse(
        {
          deployment_uuid: parsed.deployment_uuid,
          status: String(rec.status ?? 'unknown'),
          logs_lines: cappedLines,
          logs_truncated: capped.truncated,
          total_lines: allLines.length,
          entries_total: allLines.length,
          entries_hidden: 0,
          entries_shown: allLines.length,
        },
        {
          format: parsed.format,
          max_chars: parsed.max_chars,
        },
      );
    }

    const visibleEntries = entries.filter(
      (e) =>
        (parsed.include_hidden ? true : !e.hidden) &&
        (parsed.type === 'all' ? true : e.type === parsed.type),
    );
    const entriesHidden = entries.filter((e) => e.hidden).length;
    const entriesShown = visibleEntries.length;
    const flattened = visibleEntries.map((e) => e.output).join('\n');
    const allLines = sliceLogBlob(flattened, parsed.lines, parsed.offset);
    const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
    const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

    return buildReadResponse(
      {
        deployment_uuid: parsed.deployment_uuid,
        status: String(rec.status ?? 'unknown'),
        logs_lines: cappedLines,
        logs_truncated: capped.truncated,
        total_lines: allLines.length,
        entries_total: entries.length,
        entries_hidden: entriesHidden,
        entries_shown: entriesShown,
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    );
  }

  const uuid = await resolveAppMutationUuid(parsed, env);
  const raw = await fetchApplicationLogs(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    parsed.lines,
    env.COOLIFY_VERIFY_SSL,
  );
  const logsStr =
    isRecord(raw) && typeof raw.logs === 'string' ? raw.logs : '';
  const allLines = sliceLogBlob(logsStr, parsed.lines, 0);
  const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
  const cappedLines = capped.text.split('\n').filter((l) => l.length > 0);

  return buildReadResponse(
    {
      uuid,
      logs_lines: cappedLines,
      logs_truncated: capped.truncated,
      total_lines: allLines.length,
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
      case 'logs':
        return await handleApplicationLogs(parsed, env);
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

        const lookup = await buildProjectEnvironmentIndex(env);
        const data =
          projection === 'full'
            ? {
                ...(sanitizeFullProjection(raw, parsed.reveal) as Record<
                  string,
                  unknown
                >),
                hints,
              }
            : { ...projectApplicationSummary(rawRecord, lookup), hints };

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
