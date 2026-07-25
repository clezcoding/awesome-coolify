import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  cancelDeployment,
  fetchAppDeployments,
  fetchDeployment,
} from '../../api/client.js';
import {
  projectDeploymentFull,
  projectDeploymentSummary,
  resolveProjection,
  type DeploymentSummary,
} from '../../utils/projections.js';
import {
  buildReadResponse,
  paginateArray,
  type ReadResponse,
} from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  toStructuredError,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import { pollDeploymentWithBackoff } from '../../utils/deploy-watch-poll.js';
import {
  createFlatActionSchema,
  parseWithInstanceRouting,
  rejectTableFormatOnFullProjection,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

export const deploymentActionsCatalog =
  'Actions: list(application_uuid, format?, page?, per_page?) · get(deployment_uuid, format?, projection?, reveal?) · cancel(deployment_uuid, format?, max_chars?) · watch(deployment_uuid, timeout?, min_interval?, max_interval?, include_logs?, format?, max_chars?, instance?)';

export const deploymentSafetyFooter =
  'Safety: confirm for destructive ops · optional instance · reveal opt-in only';

const deploymentReadParamKeys = [
  'format',
  'projection',
  'include_full',
  'page',
  'per_page',
  'max_chars',
  'reveal',
] as const;

const deploymentListReadParamKeys = [
  'format',
  'projection',
  'include_full',
  'page',
  'per_page',
  'max_chars',
  'reveal',
] as const;

export const deploymentToolSchema = createFlatActionSchema(
  ['list', 'get', 'cancel', 'watch'],
  {
    application_uuid: z
      .string()
      .optional()
      .describe('Application UUID to list deployments for'),
    deployment_uuid: z
      .string()
      .optional()
      .describe('Deployment UUID'),
    timeout: z
      .number()
      .int()
      .min(10)
      .max(1800)
      .default(300)
      .optional()
      .describe('Watch timeout in seconds (default 300)'),
    min_interval: z
      .number()
      .int()
      .min(1)
      .default(3)
      .optional()
      .describe('Minimum poll interval in seconds (default 3)'),
    max_interval: z
      .number()
      .int()
      .min(1)
      .default(30)
      .optional()
      .describe('Maximum poll interval in seconds (default 30)'),
    include_logs: z
      .boolean()
      .default(false)
      .optional()
      .describe('Attach capped build logs on success (default false)'),
    ...sharedReadParamsFlatShape,
  },
  {
    list: ['application_uuid', ...deploymentListReadParamKeys],
    get: ['deployment_uuid', ...deploymentReadParamKeys],
    cancel: ['deployment_uuid', 'format', 'max_chars'],
    watch: [
      'deployment_uuid',
      'timeout',
      'min_interval',
      'max_interval',
      'include_logs',
      'format',
      'max_chars',
    ],
  },
  {
    list: ['application_uuid'],
    get: ['deployment_uuid'],
    cancel: ['deployment_uuid'],
    watch: ['deployment_uuid'],
  },
  (data, ctx) => {
    if (data.action === 'list' && data.per_page !== undefined && data.per_page > 50) {
      ctx.addIssue({
        code: 'custom',
        message: 'per_page must be at most 50 for deployment list',
        path: ['per_page'],
      });
    }

    if (data.action === 'watch') {
      const minInterval = data.min_interval;
      const maxInterval = data.max_interval;
      if (
        minInterval !== undefined &&
        maxInterval !== undefined &&
        minInterval > maxInterval
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'min_interval must be less than or equal to max_interval',
          path: ['min_interval'],
        });
      }
    }
  },
  {
    timeout: 300,
    min_interval: 3,
    max_interval: 30,
    include_logs: false,
  },
);

export type DeploymentAction = z.infer<typeof deploymentToolSchema>;

type DeploymentListAction = Extract<DeploymentAction, { action: 'list' }>;
type DeploymentGetAction = Extract<DeploymentAction, { action: 'get' }>;
type DeploymentCancelAction = Extract<DeploymentAction, { action: 'cancel' }>;
type DeploymentWatchAction = Extract<DeploymentAction, { action: 'watch' }>;

export type DeploymentListResult = ReadResponse<DeploymentSummary[]>;

export type DeploymentGetResult = ReadResponse<
  DeploymentSummary | ReturnType<typeof projectDeploymentFull>
>;

export type DeploymentCancelResult = ReadResponse<{
  cancelled: boolean;
  deployment_uuid: string;
  already_finished?: boolean;
  status?: string;
}>;

export type DeploymentWatchResult = ReadResponse<
  DeploymentSummary | (DeploymentSummary & { logs?: string })
>;

export type DeploymentActionResult =
  | DeploymentListResult
  | DeploymentGetResult
  | DeploymentCancelResult
  | DeploymentWatchResult
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function handleDeploymentList(
  parsed: DeploymentListAction,
  env: EnvConfig,
): Promise<DeploymentListResult> {
  const raw = await fetchAppDeployments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    parsed.application_uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const items = Array.isArray(raw)
    ? raw.filter(isRecord).map(projectDeploymentSummary)
    : [];
  const page = parsed.page ?? 1;
  const perPage = parsed.per_page ?? 10;
  const paginated = paginateArray(items, page, perPage);

  return buildReadResponse(paginated, {
    format: parsed.format,
    max_chars: parsed.max_chars,
    page,
    per_page: perPage,
    total: items.length,
  });
}

async function handleDeploymentGet(
  parsed: DeploymentGetAction,
  env: EnvConfig,
): Promise<DeploymentGetResult> {
  const projection = resolveProjection(parsed.projection, parsed.include_full);
  rejectTableFormatOnFullProjection(parsed.format, projection);

  const raw = await fetchDeployment(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    parsed.deployment_uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const rawRecord = isRecord(raw) ? raw : {};
  const data =
    projection === 'full'
      ? projectDeploymentFull(rawRecord, parsed.max_chars, parsed.reveal)
      : projectDeploymentSummary(rawRecord);

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleDeploymentCancel(
  parsed: DeploymentCancelAction,
  env: EnvConfig,
): Promise<DeploymentCancelResult> {
  try {
    await cancelDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.deployment_uuid,
      env.COOLIFY_VERIFY_SSL,
    );

    return buildReadResponse(
      { cancelled: true, deployment_uuid: parsed.deployment_uuid },
      { format: parsed.format, max_chars: parsed.max_chars },
    );
  } catch (error) {
    const envelope =
      error instanceof CoolifyApiError
        ? error.envelope
        : toStructuredError(error);
    const isAlreadyFinished =
      envelope.httpStatus === 400 || envelope.code === 'COOLIFY_422';

    if (!isAlreadyFinished) {
      throw error;
    }

    const current = await fetchDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.deployment_uuid,
      env.COOLIFY_VERIFY_SSL,
    );
    const currentRecord = isRecord(current) ? current : {};

    return buildReadResponse(
      {
        cancelled: false,
        already_finished: true,
        status: String(currentRecord.status ?? 'unknown'),
        deployment_uuid: parsed.deployment_uuid,
      },
      { format: parsed.format, max_chars: parsed.max_chars },
    );
  }
}

function isRetryableRateLimit(err: unknown): { retryAfterMs?: number } | null {
  const envelope =
    err instanceof CoolifyApiError ? err.envelope : toStructuredError(err);
  if (envelope.httpStatus === 429) {
    const retryAfter = envelope.data?.retry_after;
    return {
      retryAfterMs: typeof retryAfter === 'number' ? retryAfter : undefined,
    };
  }
  return null;
}

async function handleDeploymentWatch(
  parsed: DeploymentWatchAction,
  env: EnvConfig,
): Promise<DeploymentWatchResult> {
  const timeoutMs = parsed.timeout * 1000;
  const minIntervalMs = parsed.min_interval * 1000;
  const maxIntervalMs = parsed.max_interval * 1000;

  const fetcher = async () => {
    // No ofetch retries: first 429 reaches isRetryableRateLimit (D-08 Retry-After).
    // Nested ofetch 429 sleeps ignore Retry-After and can overshoot short timeouts.
    const dep = await fetchDeployment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.deployment_uuid,
      env.COOLIFY_VERIFY_SSL,
      { retry: false },
    );
    return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
  };

  const outcome = await pollDeploymentWithBackoff(fetcher, {
    timeoutMs,
    minIntervalMs,
    maxIntervalMs,
    isRetryableRateLimit,
  });

  const rawRecord = isRecord(outcome.deployment) ? outcome.deployment : {};
  const summary = projectDeploymentSummary(rawRecord);

  if (outcome.kind === 'timeout') {
    const elapsedSeconds = Math.round(outcome.elapsedMs / 1000);
    throw new CoolifyApiError({
      code: 'COOLIFY_WATCH_TIMEOUT',
      message: `Deployment watch timed out after ${elapsedSeconds}s — deployment still ${summary.status}.`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
      data: {
        deployment: summary,
        timed_out: true,
        elapsed_seconds: elapsedSeconds,
      },
    });
  }

  const status = summary.status;
  if (status === 'failed') {
    throw new CoolifyApiError({
      code: 'COOLIFY_DEPLOYMENT_FAILED',
      message: `Deployment failed with status: ${status}.`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_DEPLOYMENT_FAILED,
      data: { deployment: summary },
    });
  }

  if (status === 'cancelled-by-user') {
    throw new CoolifyApiError({
      code: 'COOLIFY_DEPLOYMENT_CANCELLED',
      message: `Deployment was cancelled by user (status: ${status}).`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_DEPLOYMENT_CANCELLED,
      data: { deployment: summary },
    });
  }

  let data: DeploymentSummary | (DeploymentSummary & { logs?: string }) = summary;
  if (parsed.include_logs) {
    const full = projectDeploymentFull(rawRecord, parsed.max_chars, false);
    data = {
      ...summary,
      ...(full.logs !== undefined ? { logs: full.logs } : {}),
    };
  }

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

export async function handleDeploymentAction(
  args: DeploymentAction,
  env: EnvConfig,
): Promise<DeploymentActionResult> {
  try {
    const parsed = parseWithInstanceRouting(deploymentToolSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'list':
        return await handleDeploymentList(parsed, routingEnv);
      case 'get':
        return await handleDeploymentGet(parsed, routingEnv);
      case 'cancel':
        return await handleDeploymentCancel(parsed, routingEnv);
      case 'watch':
        return await handleDeploymentWatch(parsed, routingEnv);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown deployment action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isDeploymentErrorResult(
  result: DeploymentActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
