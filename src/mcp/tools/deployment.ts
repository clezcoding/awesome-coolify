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
  createFlatActionSchema,
  parseWithInstanceRouting,
  rejectTableFormatOnFullProjection,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

export const deploymentActionsCatalog =
  'Actions: list(application_uuid, format?, page?, per_page?) · get(deployment_uuid, format?, projection?, reveal?) · cancel(deployment_uuid, format?, max_chars?)';

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
  ['list', 'get', 'cancel'],
  {
    application_uuid: z
      .string()
      .optional()
      .describe('Application UUID to list deployments for'),
    deployment_uuid: z
      .string()
      .optional()
      .describe('Deployment UUID'),
    ...sharedReadParamsFlatShape,
  },
  {
    list: ['application_uuid', ...deploymentListReadParamKeys],
    get: ['deployment_uuid', ...deploymentReadParamKeys],
    cancel: ['deployment_uuid', 'format', 'max_chars'],
  },
  {
    list: ['application_uuid'],
    get: ['deployment_uuid'],
    cancel: ['deployment_uuid'],
  },
  (data, ctx) => {
    if (data.action === 'list' && data.per_page !== undefined && data.per_page > 50) {
      ctx.addIssue({
        code: 'custom',
        message: 'per_page must be at most 50 for deployment list',
        path: ['per_page'],
      });
    }
  },
);

export type DeploymentAction = z.infer<typeof deploymentToolSchema>;

type DeploymentListAction = Extract<DeploymentAction, { action: 'list' }>;
type DeploymentGetAction = Extract<DeploymentAction, { action: 'get' }>;
type DeploymentCancelAction = Extract<DeploymentAction, { action: 'cancel' }>;

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
