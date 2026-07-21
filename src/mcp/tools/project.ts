import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createEnvironment,
  createProject,
  deleteProject,
  fetchEnvironments,
  fetchProject,
  fetchProjects,
  updateProject,
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
  resolveRoutingEnv,
  safeParseWithInstanceRouting,
  sharedReadParamsSchema,
} from './shared-read-params.js';
import {
  resolveProjection,
  sanitizeFullProjection,
} from '../../utils/projections.js';
import { resolveProjectUuid } from '../../utils/project-lookup.js';

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

const INITIAL_ENV_RECOVERY_HINTS = [
  'Ask the user whether to default to production or use a custom environment name.',
  ...RECOVERY_HINTS.COOLIFY_422,
];

function requireUuidOrName(
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
    ...sharedReadParamsSchema,
  })
  .strict();

const getActionSchema = z
  .object({
    action: z.literal('get'),
    uuid: z.string().optional().describe('Project UUID'),
    name: z.string().optional().describe('Project name (substring match)'),
    ...sharedReadParamsSchema,
  })
  .strict()
  .superRefine(requireUuidOrName);

// D-09/D-10: schema accepts optional initial_environment (MCP JSON Schema layer); handler rejects missing/empty.
const createActionSchema = z
  .object({
    action: z.literal('create'),
    name: z.string().min(1).describe('Project name'),
    initial_environment: z
      .string()
      .optional()
      .describe(
        'Initial environment name (required — ask user for production vs custom per D-09/D-10)',
      ),
    description: z.string().optional().describe('Optional project description'),
    ...mutationResponseParamsSchema,
  })
  .strict();

const updateActionSchema = z
  .object({
    action: z.literal('update'),
    uuid: z.string().optional().describe('Project UUID'),
    name: z.string().optional().describe('Project name for lookup or new name when uuid given'),
    new_name: z.string().optional().describe('New project name when resolving by name only'),
    description: z.string().optional().describe('Updated description'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireUuidOrName);

const deleteActionSchema = z
  .object({
    action: z.literal('delete'),
    uuid: z.string().optional().describe('Project UUID'),
    name: z.string().optional().describe('Project name (substring match)'),
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required for destructive delete'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireUuidOrName);

const deletePreviewActionSchema = z
  .object({
    action: z.literal('delete_preview'),
    uuid: z.string().optional().describe('Project UUID'),
    name: z.string().optional().describe('Project name (substring match)'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine(requireUuidOrName);

export const projectActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  createActionSchema,
  updateActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
]);

export type ProjectAction = z.infer<typeof projectActionSchema>;

export type ProjectSummary = {
  uuid: string;
  name: string;
  description?: string;
};

export type ProjectActionResult =
  | ReadResponse<
      | ProjectSummary
      | ProjectSummary[]
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

  const missingInitialEnv = error.issues.some(
    (issue) =>
      issue.path.includes('initial_environment') ||
      (issue.code === 'invalid_type' &&
        issue.path.length === 1 &&
        issue.path[0] === 'initial_environment'),
  );

  throw new CoolifyApiError({
    code,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints: missingInitialEnv
      ? INITIAL_ENV_RECOVERY_HINTS
      : (RECOVERY_HINTS[code] ?? RECOVERY_HINTS.COOLIFY_422),
  });
}

function parseProjectAction(
  args: unknown,
): ProjectAction & { instance?: string } {
  const parsed = safeParseWithInstanceRouting(projectActionSchema, args);
  if (!parsed.success) {
    throwValidationError(parsed.error);
  }
  return parsed.data;
}

function projectProjectSummary(raw: Record<string, unknown>): ProjectSummary {
  const summary: ProjectSummary = {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
  };

  if (raw.description != null && String(raw.description).length > 0) {
    summary.description = String(raw.description);
  }

  return summary;
}

function projectEnvironmentSummary(raw: Record<string, unknown>): {
  uuid: string;
  name: string;
} {
  return {
    uuid: String(raw.uuid ?? ''),
    name: String(raw.name ?? ''),
  };
}

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on project '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

async function resolveProjectIdentifier(
  uuid: string | undefined,
  name: string | undefined,
  env: EnvConfig,
): Promise<string> {
  if (uuid) {
    return uuid;
  }
  return resolveProjectUuid(undefined, name, env);
}

async function ensureInitialEnvironment(
  env: EnvConfig,
  projectUuid: string,
  initialEnvironment: string,
): Promise<{
  environment: { uuid: string; name: string };
  environments: Array<{ uuid: string; name: string }>;
}> {
  let rawEnvironments = await fetchEnvironments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    projectUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  let envRecords = rawEnvironments.filter(isRecord);
  let matched = envRecords.find(
    (entry) => String(entry.name ?? '') === initialEnvironment,
  );

  if (!matched) {
    const created = await createEnvironment(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      projectUuid,
      { name: initialEnvironment },
      env.COOLIFY_VERIFY_SSL,
    );
    const createdRecord = isRecord(created) ? created : {};

    rawEnvironments = await fetchEnvironments(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      projectUuid,
      env.COOLIFY_VERIFY_SSL,
    );
    envRecords = rawEnvironments.filter(isRecord);

    matched =
      envRecords.find(
        (entry) => String(entry.name ?? '') === initialEnvironment,
      ) ??
      (isRecord(createdRecord) ? createdRecord : undefined);
  }

  if (!matched) {
    throw new CoolifyApiError({
      code: 'COOLIFY_500',
      message: `Failed to ensure environment '${initialEnvironment}' after project create.`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_500,
    });
  }

  const environment = projectEnvironmentSummary(matched);
  let environments = envRecords.map(projectEnvironmentSummary);

  if (!environments.some((entry) => entry.name === initialEnvironment)) {
    environments = [...environments, environment];
  }

  return { environment, environments };
}

export async function handleProjectAction(
  args: unknown,
  env: EnvConfig,
): Promise<ProjectActionResult> {
  try {
    const parsed = parseProjectAction(args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'list': {
        const rawProjects = await fetchProjects(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const summaries = rawProjects
          .filter(isRecord)
          .map((raw) => projectProjectSummary(raw));

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

        const projectUuid = await resolveProjectIdentifier(
          parsed.uuid,
          parsed.name,
          routingEnv,
        );

        const raw = await fetchProject(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          projectUuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const rawRecord = isRecord(raw) ? raw : {};

        const data =
          projection === 'full'
            ? (sanitizeFullProjection(raw, parsed.reveal) as Record<string, unknown>)
            : projectProjectSummary(rawRecord);

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'create': {
        const initialEnv = parsed.initial_environment?.trim();
        if (!initialEnv) {
          throw new CoolifyApiError({
            code: 'COOLIFY_422',
            message:
              'initial_environment is required — ask the user for production vs a custom environment name (D-09/D-10).',
            recoveryHints: INITIAL_ENV_RECOVERY_HINTS,
          });
        }

        const created = await createProject(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          {
            name: parsed.name,
            ...(parsed.description ? { description: parsed.description } : {}),
          },
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const createdRecord = isRecord(created) ? created : {};
        const projectUuid = String(createdRecord.uuid ?? '');

        const { environment, environments } = await ensureInitialEnvironment(
          routingEnv,
          projectUuid,
          initialEnv,
        );

        return buildReadResponse(
          {
            project: {
              uuid: projectUuid,
              name: String(createdRecord.name ?? parsed.name),
              ...(createdRecord.description != null
                ? { description: String(createdRecord.description) }
                : parsed.description
                  ? { description: parsed.description }
                  : {}),
            },
            environment,
            environments,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'update': {
        const lookupName = parsed.uuid ? undefined : parsed.name;
        const projectUuid = await resolveProjectIdentifier(
          parsed.uuid,
          lookupName,
          routingEnv,
        );

        const payload: { name?: string; description?: string } = {};

        if (parsed.uuid && parsed.name !== undefined) {
          payload.name = parsed.name;
        } else if (parsed.new_name !== undefined) {
          payload.name = parsed.new_name;
        }

        if (parsed.description !== undefined) {
          payload.description = parsed.description;
        }

        const updated = await updateProject(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          projectUuid,
          payload,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const updatedRecord = isRecord(updated) ? updated : {};
        const response: Record<string, unknown> = {
          uuid: String(updatedRecord.uuid ?? projectUuid),
        };

        if (updatedRecord.name != null) response.name = String(updatedRecord.name);
        if (updatedRecord.description != null) {
          response.description = String(updatedRecord.description);
        }

        return buildReadResponse(response, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'delete': {
        const projectUuid = await resolveProjectIdentifier(
          parsed.uuid,
          parsed.name,
          routingEnv,
        );

        validateDeleteConfirm(parsed.confirm, projectUuid);

        const rawEnvironments = await fetchEnvironments(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          projectUuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const envRecords = rawEnvironments.filter(isRecord);

        if (envRecords.length > 0) {
          throw new CoolifyApiError({
            code: 'COOLIFY_409',
            message:
              'Project still has environments and cannot be deleted — delete environments first.',
            recoveryHints: RECOVERY_HINTS.COOLIFY_409,
            data: {
              environment_uuids: envRecords.map((entry) => String(entry.uuid ?? '')),
            },
          });
        }

        await deleteProject(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          projectUuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        return buildReadResponse(
          { ok: true, uuid: projectUuid },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'delete_preview': {
        const projectUuid = await resolveProjectIdentifier(
          parsed.uuid,
          parsed.name,
          routingEnv,
        );

        const rawEnvironments = await fetchEnvironments(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          projectUuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const envRecords = rawEnvironments.filter(isRecord);
        const environmentUuids = envRecords.map((entry) => String(entry.uuid ?? ''));

        return buildReadResponse(
          {
            uuid: projectUuid,
            environment_uuids: environmentUuids,
            would_delete: envRecords.length === 0,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown project action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isProjectErrorResult(
  result: ProjectActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
