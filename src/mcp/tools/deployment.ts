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
  toStructuredError,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';

const listReadParams = {
  ...sharedReadParamsSchema,
  per_page: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Items per page (default 10, max 50)'),
};

const listActionSchema = z.object({
  action: z.literal('list'),
  application_uuid: z
    .string()
    .describe('Application UUID to list deployments for'),
  ...listReadParams,
});

const getActionSchema = z.object({
  action: z.literal('get'),
  deployment_uuid: z.string().describe('Deployment UUID'),
  ...sharedReadParamsSchema,
});

const cancelActionSchema = z.object({
  action: z.literal('cancel'),
  deployment_uuid: z.string().describe('Deployment UUID to cancel'),
  format: z
    .enum(['pretty', 'json', 'table'])
    .default('pretty')
    .describe('Output format style'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .default(16000)
    .describe('Maximum characters in text response before truncation'),
});

export const deploymentToolSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  cancelActionSchema,
]);

export type DeploymentAction = z.infer<typeof deploymentToolSchema>;

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

export type DeploymentActionResult =
  | DeploymentListResult
  | DeploymentGetResult
  | DeploymentCancelResult
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function handleDeploymentList(
  parsed: z.infer<typeof listActionSchema>,
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
  const paginated = paginateArray(items, parsed.page, parsed.per_page);

  return buildReadResponse(paginated, {
    format: parsed.format,
    max_chars: parsed.max_chars,
    page: parsed.page,
    per_page: parsed.per_page,
    total: items.length,
  });
}

async function handleDeploymentGet(
  parsed: z.infer<typeof getActionSchema>,
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
  parsed: z.infer<typeof cancelActionSchema>,
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

export async function handleDeploymentAction(
  args: DeploymentAction,
  env: EnvConfig,
): Promise<DeploymentActionResult> {
  const parsed = deploymentToolSchema.parse(args);

  try {
    switch (parsed.action) {
      case 'list':
        return await handleDeploymentList(parsed, env);
      case 'get':
        return await handleDeploymentGet(parsed, env);
      case 'cancel':
        return await handleDeploymentCancel(parsed, env);
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
