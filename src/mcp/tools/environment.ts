import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createEnvironment,
  deleteEnvironment,
  fetchEnvironment,
  fetchEnvironments,
  fetchProject,
  fetchResources,
} from '../../api/client.js';
import { buildReadResponse, paginateArray, type ReadResponse } from '../../utils/formatters.js';
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
import {
  resolveProjection,
  sanitizeFullProjection,
} from '../../utils/projections.js';
import {
  resolveEnvironmentUuid,
  resolveProjectUuid,
} from '../../utils/project-lookup.js';

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

const DUPLICATE_ENV_RECOVERY_HINTS = [
  'An environment with this name already exists in this project. Use the existing UUID or pick a new name.',
  ...RECOVERY_HINTS.COOLIFY_409,
];

function requireProjectUuidOrName(
  data: { project_uuid?: string; project_name?: string },
  ctx: z.RefinementCtx,
): void {
  const hasUuid =
    typeof data.project_uuid === 'string' && data.project_uuid.length > 0;
  const hasName =
    typeof data.project_name === 'string' && data.project_name.length > 0;

  if (hasUuid === hasName) {
    ctx.addIssue({
      code: 'custom',
      message: 'Exactly one of project_uuid or project_name is required',
      params: { code: 'COOLIFY_422' },
    });
  }
}

function requireEnvUuidOrName(
  data: { uuid?: string; name?: string },
  ctx: z.RefinementCtx,
): void {
  const hasUuid = typeof data.uuid === 'string' && data.uuid.length > 0;
  const hasName = typeof data.name === 'string' && data.name.length > 0;

  if (!hasUuid && !hasName) {
    ctx.addIssue({
      code: 'custom',
      message: 'Either uuid or name is required',
      params: { code: 'COOLIFY_422' },
    });
  }
}

const listActionSchema = z
  .object({
    action: z.literal('list'),
    project_uuid: z.string().optional().describe('Parent project UUID'),
    project_name: z.string().optional().describe('Parent project name (substring match)'),
    ...sharedReadParamsSchema,
  })
  .strict()
  .superRefine(requireProjectUuidOrName);

const getActionSchema = z
  .object({
    action: z.literal('get'),
    project_uuid: z.string().optional().describe('Parent project UUID'),
    project_name: z.string().optional().describe('Parent project name (substring match)'),
    uuid: z.string().optional().describe('Environment UUID'),
    name: z.string().optional().describe('Environment name (substring match)'),
    ...sharedReadParamsSchema,
  })
  .strict()
  .superRefine(requireProjectUuidOrName)
  .superRefine(requireEnvUuidOrName);

const createActionSchema = z
  .object({
    action: z.literal('create'),
    project_uuid: z.string().optional().describe('Parent project UUID'),
    project_name: z.string().optional().describe('Parent project name (substring match)'),
    name: z.string().min(1).describe('Environment name'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireProjectUuidOrName);

const deleteActionSchema = z
  .object({
    action: z.literal('delete'),
    project_uuid: z.string().optional().describe('Parent project UUID'),
    project_name: z.string().optional().describe('Parent project name (substring match)'),
    uuid: z.string().optional().describe('Environment UUID'),
    name: z.string().optional().describe('Environment name (substring match)'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required for destructive delete'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireProjectUuidOrName)
  .superRefine(requireEnvUuidOrName);

const deletePreviewActionSchema = z
  .object({
    action: z.literal('delete_preview'),
    project_uuid: z.string().optional().describe('Parent project UUID'),
    project_name: z.string().optional().describe('Parent project name (substring match)'),
    uuid: z.string().optional().describe('Environment UUID'),
    name: z.string().optional().describe('Environment name (substring match)'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireProjectUuidOrName)
  .superRefine(requireEnvUuidOrName);

export const environmentActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  createActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
]);

export type EnvironmentAction = z.infer<typeof environmentActionSchema>;

export type EnvironmentSummary = {
  uuid: string;
  name: string;
  project_uuid: string;
  project_name?: string;
};

export type EnvironmentActionResult =
  | ReadResponse<
      | EnvironmentSummary
      | EnvironmentSummary[]
      | Record<string, unknown>
    >
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwValidationError(error: z.ZodError): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  const code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? 'COOLIFY_422';

  throw new CoolifyApiError({
    code,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints: RECOVERY_HINTS[code] ?? RECOVERY_HINTS.COOLIFY_422,
  });
}

function parseEnvironmentAction(args: unknown): EnvironmentAction {
  const parsed = environmentActionSchema.safeParse(args);
  if (!parsed.success) {
    throwValidationError(parsed.error);
  }
  return parsed.data;
}

function projectEnvironmentSummary(
  rawEnv: Record<string, unknown>,
  projectUuid: string,
  projectName?: string,
): EnvironmentSummary {
  const summary: EnvironmentSummary = {
    uuid: String(rawEnv.uuid ?? ''),
    name: String(rawEnv.name ?? ''),
    project_uuid: projectUuid,
  };

  if (projectName != null && projectName.length > 0) {
    summary.project_name = projectName;
  }

  return summary;
}

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on environment '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

function resourceMatchesEnvironment(
  resource: Record<string, unknown>,
  envId: unknown,
  envUuid: string,
): boolean {
  if (envId != null && resource.environment_id === envId) {
    return true;
  }

  const environment = resource.environment;
  if (isRecord(environment)) {
    if (envUuid.length > 0 && String(environment.uuid ?? '') === envUuid) {
      return true;
    }
    if (envId != null && environment.id === envId) {
      return true;
    }
  }

  return false;
}

async function findEnvironmentChildResources(
  env: EnvConfig,
  envRecord: Record<string, unknown>,
): Promise<Array<{ uuid: string; name: string; type: string }>> {
  const envId = envRecord.id;
  const envUuid = String(envRecord.uuid ?? '');

  const rawResources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  return rawResources
    .filter(isRecord)
    .filter((resource) => resourceMatchesEnvironment(resource, envId, envUuid))
    .map((resource) => ({
      uuid: String(resource.uuid ?? ''),
      name: String(resource.name ?? ''),
      type: String(resource.type ?? 'unknown'),
    }));
}

function isDuplicateEnvironmentError(error: unknown): boolean {
  if (error instanceof CoolifyApiError) {
    return error.envelope.code === 'COOLIFY_409';
  }

  const err = error as {
    data?: { code?: string };
    response?: { status?: number };
    status?: number;
    statusCode?: number;
  };

  if (err.data?.code === 'COOLIFY_409') {
    return true;
  }

  const status =
    err.response?.status ?? err.status ?? err.statusCode;
  return status === 409;
}

async function resolveProjectContext(
  project_uuid: string | undefined,
  project_name: string | undefined,
  env: EnvConfig,
): Promise<{ projectUuid: string; projectName: string }> {
  const projectUuid = await resolveProjectUuid(project_uuid, project_name, env);

  const rawProject = await fetchProject(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    projectUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const projectRecord = isRecord(rawProject) ? rawProject : {};

  return {
    projectUuid,
    projectName: String(projectRecord.name ?? project_name ?? ''),
  };
}

async function resolveEnvironmentRecord(
  projectUuid: string,
  env_uuid: string | undefined,
  env_name: string | undefined,
  env: EnvConfig,
): Promise<{ envUuid: string; envRecord: Record<string, unknown> }> {
  const envUuid = await resolveEnvironmentUuid(
    env_uuid,
    env_name,
    projectUuid,
    env,
  );

  const nameOrUuid = env_uuid ?? env_name ?? envUuid;
  const raw = await fetchEnvironment(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    projectUuid,
    nameOrUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  return {
    envUuid,
    envRecord: isRecord(raw) ? raw : { uuid: envUuid },
  };
}

export async function handleEnvironmentAction(
  args: unknown,
  env: EnvConfig,
): Promise<EnvironmentActionResult> {
  try {
    const parsed = parseEnvironmentAction(args);

    switch (parsed.action) {
      case 'list': {
        const { projectUuid, projectName } = await resolveProjectContext(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );

        const rawEnvironments = await fetchEnvironments(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          projectUuid,
          env.COOLIFY_VERIFY_SSL,
        );

        const summaries = rawEnvironments
          .filter(isRecord)
          .map((raw) =>
            projectEnvironmentSummary(raw, projectUuid, projectName),
          );

        const page = parsed.page ?? 1;
        const perPage = parsed.per_page ?? 10;
        const paginated = paginateArray(summaries, page, perPage);

        return buildReadResponse(paginated, {
          format: parsed.format,
          max_chars: parsed.max_chars,
          page,
          per_page: perPage,
          total: summaries.length,
        });
      }

      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const { projectUuid } = await resolveProjectContext(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );

        const nameOrUuid = parsed.uuid ?? parsed.name ?? '';
        const raw = await fetchEnvironment(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          projectUuid,
          nameOrUuid,
          env.COOLIFY_VERIFY_SSL,
        );
        const rawRecord = isRecord(raw) ? raw : {};

        const data =
          projection === 'full'
            ? (sanitizeFullProjection(raw, parsed.reveal) as Record<string, unknown>)
            : projectEnvironmentSummary(rawRecord, projectUuid);

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'create': {
        const projectUuid = await resolveProjectUuid(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );

        try {
          const created = await createEnvironment(
            env.COOLIFY_URL,
            env.COOLIFY_TOKEN,
            projectUuid,
            { name: parsed.name },
            env.COOLIFY_VERIFY_SSL,
          );

          const createdRecord = isRecord(created) ? created : {};

          return buildReadResponse(
            {
              uuid: String(createdRecord.uuid ?? ''),
              name: String(createdRecord.name ?? parsed.name),
              project_uuid: projectUuid,
            },
            {
              format: parsed.format,
              max_chars: parsed.max_chars,
            },
          );
        } catch (error) {
          if (isDuplicateEnvironmentError(error)) {
            throw new CoolifyApiError({
              code: 'COOLIFY_409',
              message: 'Environment already exists',
              recoveryHints: DUPLICATE_ENV_RECOVERY_HINTS,
            });
          }
          throw error;
        }
      }

      case 'delete': {
        const { projectUuid } = await resolveProjectContext(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );

        const { envUuid, envRecord } = await resolveEnvironmentRecord(
          projectUuid,
          parsed.uuid,
          parsed.name,
          env,
        );

        validateDeleteConfirm(parsed.confirm, envUuid);

        const childResources = await findEnvironmentChildResources(env, envRecord);

        if (childResources.length > 0) {
          throw new CoolifyApiError({
            code: 'COOLIFY_409',
            message:
              'Environment still has child resources and cannot be deleted — remove them first.',
            recoveryHints: RECOVERY_HINTS.COOLIFY_409,
            data: {
              child_resource_uuids: childResources.map((resource) => resource.uuid),
            },
          });
        }

        await deleteEnvironment(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          projectUuid,
          envUuid,
          env.COOLIFY_VERIFY_SSL,
        );

        return buildReadResponse(
          { ok: true, uuid: envUuid },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'delete_preview': {
        const { projectUuid } = await resolveProjectContext(
          parsed.project_uuid,
          parsed.project_name,
          env,
        );

        const { envUuid, envRecord } = await resolveEnvironmentRecord(
          projectUuid,
          parsed.uuid,
          parsed.name,
          env,
        );

        const childResources = await findEnvironmentChildResources(env, envRecord);

        return buildReadResponse(
          {
            uuid: envUuid,
            child_resources: childResources,
            would_delete: childResources.length === 0,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown environment action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isEnvironmentErrorResult(
  result: EnvironmentActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
