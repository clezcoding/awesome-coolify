import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createClickhouseDatabase,
  createDragonflyDatabase,
  createKeydbDatabase,
  createMariadbDatabase,
  createMongodbDatabase,
  createMysqlDatabase,
  createPostgresqlDatabase,
  createRedisDatabase,
  bulkUpdateEnvs,
  createEnv,
  deleteDatabase,
  deleteEnv,
  createDatabaseBackup,
  fetchDatabaseBackups,
  fetchBackupExecutions,
  fetchDatabase,
  fetchEnvs,
  fetchResources,
  triggerDatabaseRestart,
  updateDatabase,
  updateEnvViaBulk,
  triggerDatabaseStart,
  triggerDatabaseStop,
  type Env,
  type EnvBulkEntry,
} from '../../api/client.js';
import {
  buildProjectEnvironmentIndex,
  resolveProjectUuid,
} from '../../utils/project-lookup.js';
import {
  isDatabaseRawType,
  projectDatabaseSummary,
  projectResourceSummary,
  resolveProjection,
  sanitizeFullProjection,
  type DatabaseSummary,
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
  mergeEnvMutationFlags,
  resolveEnvIdentity,
  validateEnvMutationConfirm,
  withRevealRecoveryHints,
} from './env-shared.js';
import {
  backupFrequencyCreateSchema,
  buildBackupCreatePayload,
  maskBackupConfig,
} from './backup-shared.js';

const DATABASE_IDENTIFIER_FIELDS = ['uuid', 'name'] as const;

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

function requireDatabaseIdentifier<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  actionName: string,
) {
  return schema.superRefine((data, ctx) => {
    if (!hasAtLeastOneIdentifier(data, DATABASE_IDENTIFIER_FIELDS)) {
      ctx.addIssue({
        code: 'custom',
        message: `At least one identifier (uuid|name) required for action ${actionName}`,
        params: { code: 'COOLIFY_422' },
      });
    }
  });
}

const startActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('start'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z.string().optional().describe('Database name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'start',
);

const stopActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('stop'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z.string().optional().describe('Database name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'stop',
);

const restartActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('restart'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z.string().optional().describe('Database name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'restart',
);

const getActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('get'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z.string().optional().describe('Database name substring'),
      ...sharedReadParamsSchema,
    })
    .strict(),
  'get',
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
        'Either project_uuid or project_name is required for database create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
  if (!data.environment_name && !data.environment_uuid) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Either environment_name or environment_uuid is required for database create',
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

function requireConfirmForPublicAccess(
  data: { is_public?: boolean; confirm?: boolean },
  ctx: z.RefinementCtx,
  actionName: 'create' | 'update',
): void {
  if (data.is_public === true && data.confirm !== true) {
    ctx.addIssue({
      code: 'custom',
      message: `is_public: true requires confirm: true for database ${actionName} — COOLIFY_CONFIRM_REQUIRED`,
      params: { code: 'COOLIFY_CONFIRM_REQUIRED' },
    });
  }
}

const createSharedFields = {
  action: z.literal('create'),
  server_uuid: z.string().describe('Target server UUID'),
  project_uuid: z.string().optional().describe('Project UUID'),
  project_name: z.string().optional().describe('Project name'),
  environment_name: z.string().optional().describe('Environment name'),
  environment_uuid: z.string().optional().describe('Environment UUID'),
  name: z.string().optional().describe('Database name'),
  description: z.string().optional().describe('Database description'),
  image: z.string().optional().describe('Custom database image'),
  is_public: z
    .boolean()
    .default(false)
    .describe('Expose database port publicly'),
  public_port: z.number().int().optional().describe('Public port when is_public'),
  public_port_timeout: z
    .number()
    .int()
    .optional()
    .describe('Public port mapping timeout'),
  limits_memory: z.string().optional(),
  limits_memory_swap: z.string().optional(),
  limits_memory_swappiness: z.number().int().optional(),
  limits_memory_reservation: z.string().optional(),
  limits_cpus: z.string().optional(),
  limits_cpuset: z.string().optional(),
  limits_cpu_shares: z.number().int().optional(),
  destination_uuid: z.string().optional(),
  instant_deploy: z
    .boolean()
    .default(true)
    .describe('Start database after create (default true)'),
  confirm: z
    .boolean()
    .default(false)
    .describe('Confirm public database exposure'),
  reveal: z
    .boolean()
    .default(false)
    .describe('Reveal masked credentials in response'),
  ...mutationResponseParamsSchema,
};

function withCreateRefines<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .strict()
    .superRefine((data, ctx) => {
      requireProjectAndEnvironment(data, ctx);
      requireConfirmForPublicAccess(data, ctx, 'create');
    });
}

const createPostgresqlSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('postgresql'),
  postgres_user: z.string().optional(),
  postgres_password: z.string().optional(),
  postgres_db: z.string().optional(),
  postgres_initdb_args: z.string().optional(),
  postgres_host_auth_method: z.string().optional(),
  postgres_conf: z.string().optional(),
});

const createMysqlSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('mysql'),
  mysql_user: z.string().optional(),
  mysql_password: z.string().optional(),
  mysql_root_password: z.string().optional(),
  mysql_database: z.string().optional(),
});

const createMariadbSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('mariadb'),
  mariadb_user: z.string().optional(),
  mariadb_password: z.string().optional(),
  mariadb_root_password: z.string().optional(),
  mariadb_database: z.string().optional(),
});

const createMongodbSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('mongodb'),
  mongo_initdb_root_password: z.string().optional(),
  mongo_initdb_database: z.string().optional(),
});

const createRedisSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('redis'),
  redis_password: z.string().optional(),
});

const createClickhouseSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('clickhouse'),
  clickhouse_admin_user: z.string().optional(),
  clickhouse_admin_password: z.string().optional(),
});

const createDragonflySchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('dragonfly'),
  dragonfly_password: z.string().optional(),
});

const createKeydbSchema = withCreateRefines({
  ...createSharedFields,
  engine: z.literal('keydb'),
  keydb_password: z.string().optional(),
});

const createDatabaseSchema = z.discriminatedUnion('engine', [
  createPostgresqlSchema,
  createMysqlSchema,
  createMariadbSchema,
  createMongodbSchema,
  createRedisSchema,
  createClickhouseSchema,
  createDragonflySchema,
  createKeydbSchema,
]);

const updateDatabaseSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('update'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z
        .string()
        .optional()
        .describe('Database name substring or new name when uuid given'),
      description: z.string().optional().describe('Database description'),
      image: z.string().optional().describe('Custom database image'),
      is_public: z
        .boolean()
        .optional()
        .describe('Expose database port publicly'),
      public_port: z.number().int().optional().describe('Public port when is_public'),
      public_port_timeout: z
        .number()
        .int()
        .optional()
        .describe('Public port mapping timeout'),
      limits_memory: z.string().optional(),
      limits_memory_swap: z.string().optional(),
      limits_memory_swappiness: z.number().int().optional(),
      limits_memory_reservation: z.string().optional(),
      limits_cpus: z.string().optional(),
      limits_cpuset: z.string().optional(),
      limits_cpu_shares: z.number().int().optional(),
      postgres_user: z.string().optional(),
      postgres_password: z.string().optional(),
      postgres_db: z.string().optional(),
      postgres_initdb_args: z.string().optional(),
      postgres_host_auth_method: z.string().optional(),
      postgres_conf: z.string().optional(),
      mysql_user: z.string().optional(),
      mysql_password: z.string().optional(),
      mysql_root_password: z.string().optional(),
      mysql_database: z.string().optional(),
      mariadb_user: z.string().optional(),
      mariadb_password: z.string().optional(),
      mariadb_root_password: z.string().optional(),
      mariadb_database: z.string().optional(),
      mongo_initdb_root_password: z.string().optional(),
      mongo_initdb_database: z.string().optional(),
      redis_password: z.string().optional(),
      clickhouse_admin_user: z.string().optional(),
      clickhouse_admin_password: z.string().optional(),
      dragonfly_password: z.string().optional(),
      keydb_password: z.string().optional(),
      confirm: z
        .boolean()
        .default(false)
        .describe('Confirm public database exposure on update'),
      reveal: z
        .boolean()
        .default(false)
        .describe('Reveal masked credentials in response'),
      ...mutationResponseParamsSchema,
    })
    .strict()
    .superRefine((data, ctx) => {
      requireConfirmForPublicAccess(data, ctx, 'update');
    }),
  'update',
);

const deleteActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('delete'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z.string().optional().describe('Database name substring'),
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

const deletePreviewActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('delete_preview'),
      uuid: z.string().optional().describe('Database UUID'),
      name: z.string().optional().describe('Database name substring'),
      ...mutationResponseParamsSchema,
    })
    .strict(),
  'delete_preview',
);

const envParentFields = {
  uuid: z.string().optional().describe('Database UUID'),
  name: z.string().optional().describe('Database name substring'),
  reveal: z
    .boolean()
    .default(false)
    .describe('Reveal masked env values for this call only'),
  ...mutationResponseParamsSchema,
};

const databaseEnvFlagFields = {
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

const envsListActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('envs:list'),
      ...envParentFields,
    })
    .strict(),
  'envs:list',
);

const envsGetActionSchema = requireDatabaseIdentifier(
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

const envsCreateActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('envs:create'),
      key: z.string().describe('Environment variable key'),
      value: z.string().describe('Environment variable value'),
      ...databaseEnvFlagFields,
      ...envParentFields,
    })
    .strict(),
  'envs:create',
);

const envsUpdateActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('envs:update'),
      env_uuid: z.string().optional().describe('Environment variable UUID'),
      key: z.string().optional().describe('Environment variable key'),
      value: z.string().describe('New environment variable value'),
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

const envsDeleteActionSchema = requireDatabaseIdentifier(
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
    is_literal: z.boolean().optional().describe('Literal flag'),
    is_multiline: z.boolean().optional().describe('Multiline flag'),
    is_shown_once: z.boolean().optional().describe('Show-once flag'),
  })
  .strict();

const backupParentFields = {
  uuid: z.string().optional().describe('Database UUID'),
  name: z.string().optional().describe('Database name substring'),
  reveal: z
    .boolean()
    .default(false)
    .describe(
      'Reveal masked S3 credentials for this call only (ask_human_reveal policy D-16)',
    ),
  confirm: z
    .boolean()
    .optional()
    .describe('Ignored — backup:create/list/history do not require confirm (D-10)'),
  ...mutationResponseParamsSchema,
};

const backupCreateActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('backup:create'),
      frequency: backupFrequencyCreateSchema.describe(
        'Backup frequency preset or cron expression',
      ),
      enabled: z
        .boolean()
        .default(true)
        .describe('Enable schedule (default true)'),
      save_s3: z
        .boolean()
        .default(false)
        .describe('Upload backups to S3 (default false)'),
      s3_storage_uuid: z
        .string()
        .optional()
        .describe('S3 storage destination UUID (required when save_s3: true)'),
      databases_to_backup: z
        .string()
        .optional()
        .describe('Comma-separated database names to backup'),
      dump_all: z
        .boolean()
        .optional()
        .describe('Dump all databases on the server'),
      backup_now: z
        .boolean()
        .optional()
        .describe('Trigger immediate backup after create'),
      database_backup_retention_amount_locally: z.number().int().optional(),
      database_backup_retention_days_locally: z.number().int().optional(),
      database_backup_retention_max_storage_locally: z
        .string()
        .optional(),
      database_backup_retention_amount_s3: z.number().int().optional(),
      database_backup_retention_days_s3: z.number().int().optional(),
      database_backup_retention_max_storage_s3: z.string().optional(),
      timeout: z.number().int().optional().describe('Backup timeout in seconds'),
      ...backupParentFields,
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.save_s3 === true && !data.s3_storage_uuid) {
        ctx.addIssue({
          code: 'custom',
          message:
            'save_s3: true requires s3_storage_uuid — COOLIFY_VALIDATION_ERROR',
          path: ['s3_storage_uuid'],
          params: { code: 'COOLIFY_VALIDATION_ERROR' },
        });
      }
    }),
  'backup:create',
);

const backupListActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('backup:list'),
      ...backupParentFields,
    })
    .strict(),
  'backup:list',
);

const backupHistoryActionSchema = requireDatabaseIdentifier(
  z
    .object({
      action: z.literal('backup:history'),
      scheduled_backup_uuid: z
        .string()
        .describe('Backup schedule UUID for execution history'),
      ...backupParentFields,
    })
    .strict(),
  'backup:history',
);

const envsBulkUpdateActionSchema = requireDatabaseIdentifier(
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

const DATABASE_UPDATE_CURATED_FIELD_KEYS = [
  'name',
  'description',
  'image',
  'is_public',
  'public_port',
  'public_port_timeout',
  'limits_memory',
  'limits_memory_swap',
  'limits_memory_swappiness',
  'limits_memory_reservation',
  'limits_cpus',
  'limits_cpuset',
  'limits_cpu_shares',
  'postgres_user',
  'postgres_password',
  'postgres_db',
  'postgres_initdb_args',
  'postgres_host_auth_method',
  'postgres_conf',
  'mysql_user',
  'mysql_password',
  'mysql_root_password',
  'mysql_database',
  'mariadb_user',
  'mariadb_password',
  'mariadb_root_password',
  'mariadb_database',
  'mongo_initdb_root_password',
  'mongo_initdb_database',
  'redis_password',
  'clickhouse_admin_user',
  'clickhouse_admin_password',
  'dragonfly_password',
  'keydb_password',
] as const;

export const databaseActionSchema = z.discriminatedUnion('action', [
  getActionSchema,
  startActionSchema,
  stopActionSchema,
  restartActionSchema,
  createDatabaseSchema,
  updateDatabaseSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
  envsListActionSchema,
  envsGetActionSchema,
  envsCreateActionSchema,
  envsUpdateActionSchema,
  envsDeleteActionSchema,
  envsBulkUpdateActionSchema,
  backupCreateActionSchema,
  backupListActionSchema,
  backupHistoryActionSchema,
]);

export type DatabaseAction = z.infer<typeof databaseActionSchema>;

export type DatabaseGetResult = ReadResponse<
  DatabaseSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type DatabaseMutationResult = ReadResponse<{
  uuid: string;
  action: 'start' | 'stop' | 'restart';
  status: 'requested';
}>;

export type DatabaseCreateResult = ReadResponse<
  | (Record<string, unknown> & {
      uuid: string;
      deploy: { status: 'queued' };
      hints: string[];
    })
  | (Record<string, unknown> & {
      ok: true;
      uuid: string;
      deploy: { status: 'failed_to_queue'; error: string };
      recoveryHints: string[];
    })
  | (Record<string, unknown> & {
      uuid: string;
      deploy: { status: 'not_triggered' };
      hints: string[];
    })
>;

export type DatabaseUpdateResult = ReadResponse<
  ReturnType<typeof sanitizeFullProjection>
>;

export type DatabaseDeleteResult = ReadResponse<{
  ok: true;
  uuid: string;
  deleted: true;
  delete_volumes: boolean;
  delete_configurations: boolean;
}>;

export type DatabaseDeletePreviewResult = ReadResponse<{
  uuid: string;
  child_resources: Array<{ uuid: string; name?: string; type?: string }>;
  would_delete: true;
  warning?: string;
}>;

export type DatabaseEnvsListResult = ReadResponse<
  Array<Record<string, unknown>>
> & { recoveryHints?: string[] };

export type DatabaseEnvsGetResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type DatabaseEnvsCreateResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type DatabaseEnvsUpdateResult = ReadResponse<
  Record<string, unknown>
> & { recoveryHints?: string[] };

export type DatabaseEnvsDeleteResult = ReadResponse<{
  ok: true;
  env_uuid: string;
}> & { recoveryHints?: string[] };

export type DatabaseEnvsBulkUpdateResult = ReadResponse<{
  ok: true;
}> & { recoveryHints?: string[] };

export type DatabaseBackupCreateResult = ReadResponse<
  Record<string, unknown> & {
    uuid: string;
    hints: string[];
  }
> & { recoveryHints?: string[] };

export type DatabaseBackupListResult = ReadResponse<
  Array<Record<string, unknown>>
> & { recoveryHints?: string[] };

export type DatabaseBackupHistoryResult = ReadResponse<{
  scheduled_backup_uuid: string;
  executions: Array<{
    uuid?: string;
    filename?: string;
    size?: number;
    created_at?: string;
    message?: string;
    status?: string;
  }>;
}> & { recoveryHints?: string[] };

export type DatabaseActionResult =
  | DatabaseGetResult
  | DatabaseMutationResult
  | DatabaseCreateResult
  | DatabaseUpdateResult
  | DatabaseDeleteResult
  | DatabaseDeletePreviewResult
  | DatabaseEnvsListResult
  | DatabaseEnvsGetResult
  | DatabaseEnvsCreateResult
  | DatabaseEnvsUpdateResult
  | DatabaseEnvsDeleteResult
  | DatabaseEnvsBulkUpdateResult
  | DatabaseBackupCreateResult
  | DatabaseBackupListResult
  | DatabaseBackupHistoryResult
  | McpErrorResult;

type DatabaseMatchable = FindableResource & { environment_name: string };

type DatabaseIdentifierInput = {
  uuid?: string;
  name?: string;
};

type MutationAction = z.infer<typeof startActionSchema>;
type CreateAction = z.infer<typeof createDatabaseSchema>;
type UpdateAction = z.infer<typeof updateDatabaseSchema>;
type DeleteAction = z.infer<typeof deleteActionSchema>;
type DeletePreviewAction = z.infer<typeof deletePreviewActionSchema>;
type EnvsListAction = z.infer<typeof envsListActionSchema>;
type EnvsGetAction = z.infer<typeof envsGetActionSchema>;
type EnvsCreateAction = z.infer<typeof envsCreateActionSchema>;
type EnvsUpdateAction = z.infer<typeof envsUpdateActionSchema>;
type EnvsDeleteAction = z.infer<typeof envsDeleteActionSchema>;
type EnvsBulkUpdateAction = z.infer<typeof envsBulkUpdateActionSchema>;
type BackupCreateAction = z.infer<typeof backupCreateActionSchema>;
type BackupListAction = z.infer<typeof backupListActionSchema>;
type BackupHistoryAction = z.infer<typeof backupHistoryActionSchema>;

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

function parseDatabaseAction(args: unknown): DatabaseAction {
  const parsed = databaseActionSchema.safeParse(args);
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

function buildCreateSharedBody(
  parsed: CreateAction,
  project_uuid: string,
): Record<string, unknown> {
  return omitUndefined({
    server_uuid: parsed.server_uuid,
    project_uuid,
    environment_name: parsed.environment_name,
    environment_uuid: parsed.environment_uuid,
    name: parsed.name,
    description: parsed.description,
    image: parsed.image,
    is_public: parsed.is_public,
    public_port: parsed.public_port,
    public_port_timeout: parsed.public_port_timeout,
    limits_memory: parsed.limits_memory,
    limits_memory_swap: parsed.limits_memory_swap,
    limits_memory_swappiness: parsed.limits_memory_swappiness,
    limits_memory_reservation: parsed.limits_memory_reservation,
    limits_cpus: parsed.limits_cpus,
    limits_cpuset: parsed.limits_cpuset,
    limits_cpu_shares: parsed.limits_cpu_shares,
    destination_uuid: parsed.destination_uuid,
    instant_deploy: parsed.instant_deploy,
  });
}

function buildEngineCredentialBody(parsed: CreateAction): Record<string, unknown> {
  switch (parsed.engine) {
    case 'postgresql':
      return omitUndefined({
        postgres_user: parsed.postgres_user,
        postgres_password: parsed.postgres_password,
        postgres_db: parsed.postgres_db,
        postgres_initdb_args: parsed.postgres_initdb_args,
        postgres_host_auth_method: parsed.postgres_host_auth_method,
        postgres_conf: parsed.postgres_conf,
      });
    case 'mysql':
      return omitUndefined({
        mysql_user: parsed.mysql_user,
        mysql_password: parsed.mysql_password,
        mysql_root_password: parsed.mysql_root_password,
        mysql_database: parsed.mysql_database,
      });
    case 'mariadb':
      return omitUndefined({
        mariadb_user: parsed.mariadb_user,
        mariadb_password: parsed.mariadb_password,
        mariadb_root_password: parsed.mariadb_root_password,
        mariadb_database: parsed.mariadb_database,
      });
    case 'mongodb':
      return omitUndefined({
        mongo_initdb_root_password: parsed.mongo_initdb_root_password,
        mongo_initdb_database: parsed.mongo_initdb_database,
      });
    case 'redis':
      return omitUndefined({
        redis_password: parsed.redis_password,
      });
    case 'clickhouse':
      return omitUndefined({
        clickhouse_admin_user: parsed.clickhouse_admin_user,
        clickhouse_admin_password: parsed.clickhouse_admin_password,
      });
    case 'dragonfly':
      return omitUndefined({
        dragonfly_password: parsed.dragonfly_password,
      });
    case 'keydb':
      return omitUndefined({
        keydb_password: parsed.keydb_password,
      });
  }
}

async function createDatabaseByEngine(
  parsed: CreateAction,
  body: Record<string, unknown>,
  env: EnvConfig,
): Promise<unknown> {
  switch (parsed.engine) {
    case 'postgresql':
      return createPostgresqlDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'mysql':
      return createMysqlDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'mariadb':
      return createMariadbDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'mongodb':
      return createMongodbDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'redis':
      return createRedisDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'clickhouse':
      return createClickhouseDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'dragonfly':
      return createDragonflyDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
    case 'keydb':
      return createKeydbDatabase(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        body,
        env.COOLIFY_VERIFY_SSL,
      );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function projectDatabaseMatchable(raw: Record<string, unknown>): DatabaseMatchable {
  const summary = projectResourceSummary(raw);
  return {
    ...summary,
    environment_name:
      (raw.environment as { name?: string } | undefined)?.name ?? 'unknown',
  };
}

async function resolveDatabaseUuid(
  parsed: DatabaseIdentifierInput,
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

  const databases = rawResources
    .filter(isRecord)
    .filter((raw) => isDatabaseRawType(String(raw.type ?? '')))
    .map(projectDatabaseMatchable);

  const searchTerms = {
    name: parsed.name,
  };

  const matches = databases.filter((item) =>
    matchesExplicitFields(item, {
      name: parsed.name,
    }),
  );

  const ranked = rankFindMatches(matches, searchTerms).slice(0, FIND_MATCH_CAP);

  if (ranked.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: 'No database matched the mutation input.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_404,
    });
  }

  if (ranked.length > 1) {
    const databaseMatches = ranked as DatabaseMatchable[];
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message:
        'Multiple databases matched the mutation input — refusing to mutate. Re-run with an explicit UUID.',
      recoveryHints: [
        'Re-run the mutation with an explicit UUID.',
        'Multiple databases matched — narrow the name substring or pass the UUID directly.',
        ...databaseMatches.map(
          (r) =>
            `- ${r.name} (${r.uuid}) project=${r.project_name ?? 'unknown'} environment=${r.environment_name ?? 'unknown'}`,
        ),
      ],
    });
  }

  return ranked[0].uuid;
}

async function handleDatabaseMutation(
  parsed: MutationAction,
  env: EnvConfig,
): Promise<DatabaseMutationResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);

  switch (parsed.action) {
    case 'start':
      await triggerDatabaseStart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'stop':
      await triggerDatabaseStop(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      break;
    case 'restart':
      await triggerDatabaseRestart(
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

async function handleDatabaseCreate(
  parsed: CreateAction,
  env: EnvConfig,
): Promise<DatabaseCreateResult> {
  const project_uuid = await resolveProjectUuid(
    parsed.project_uuid,
    parsed.project_name,
    env,
  );

  const body = {
    ...buildCreateSharedBody(parsed, project_uuid),
    ...buildEngineCredentialBody(parsed),
  };

  const raw = await createDatabaseByEngine(parsed, body, env);
  const created = isRecord(raw) ? raw : {};
  const dbUuid = typeof created.uuid === 'string' ? created.uuid : '';
  if (!dbUuid) {
    throw new CoolifyApiError({
      code: 'COOLIFY_500',
      message: 'Database create succeeded but response lacked uuid',
      recoveryHints: RECOVERY_HINTS.COOLIFY_500,
    });
  }
  const projected = sanitizeFullProjection(created, parsed.reveal) as Record<
    string,
    unknown
  >;
  const responseParams = {
    format: parsed.format,
    max_chars: parsed.max_chars,
  };

  if (!parsed.instant_deploy) {
    return buildReadResponse(
      {
        ...projected,
        uuid: dbUuid,
        deploy: { status: 'not_triggered' as const },
        hints: ['Use database.start to start the database'],
      },
      responseParams,
    );
  }

  try {
    await triggerDatabaseStart(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      dbUuid,
      env.COOLIFY_VERIFY_SSL,
    );

    return buildReadResponse(
      {
        ...projected,
        uuid: dbUuid,
        deploy: { status: 'queued' as const },
        hints: [
          'Use database.get with uuid to inspect connection details',
          'Use database.start/stop/restart for lifecycle',
        ],
      },
      responseParams,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildReadResponse(
      {
        ok: true as const,
        ...projected,
        uuid: dbUuid,
        deploy: {
          status: 'failed_to_queue' as const,
          error: redactSecrets(message),
        },
        recoveryHints: [
          'Database was created successfully — retry start with database.start.',
          'Check Coolify server logs if start queue failures persist.',
        ],
      },
      responseParams,
    );
  }
}

function buildUpdatePayload(parsed: UpdateAction): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of DATABASE_UPDATE_CURATED_FIELD_KEYS) {
    if (key === 'name' && !parsed.uuid) {
      continue;
    }
    const value = parsed[key];
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  return omitUndefined(payload);
}

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on database '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

async function handleDatabaseUpdate(
  parsed: UpdateAction,
  env: EnvConfig,
): Promise<DatabaseUpdateResult> {
  const uuid = await resolveDatabaseUuid(
    { uuid: parsed.uuid, name: parsed.name },
    env,
  );

  const payload = buildUpdatePayload(parsed);

  await updateDatabase(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    payload,
    env.COOLIFY_VERIFY_SSL,
  );

  const raw = await fetchDatabase(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const data = sanitizeFullProjection(raw, parsed.reveal) as Record<
    string,
    unknown
  >;

  return buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleDatabaseDelete(
  parsed: DeleteAction,
  env: EnvConfig,
): Promise<DatabaseDeleteResult> {
  const uuid = await resolveDatabaseUuid(
    { uuid: parsed.uuid, name: parsed.name },
    env,
  );

  validateDeleteConfirm(parsed.confirm, uuid);

  await deleteDatabase(
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

async function handleDatabaseDeletePreview(
  parsed: DeletePreviewAction,
  env: EnvConfig,
): Promise<DatabaseDeletePreviewResult> {
  const uuid = await resolveDatabaseUuid(
    { uuid: parsed.uuid, name: parsed.name },
    env,
  );

  const rawResources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const childResources = rawResources
    .filter(isRecord)
    .filter((resource) => String(resource.database_uuid ?? '') === uuid)
    .map((resource) => ({
      uuid: String(resource.uuid ?? ''),
      name: resource.name != null ? String(resource.name) : undefined,
      type: resource.type != null ? String(resource.type) : undefined,
    }));

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
      'Database has child resources that will also be removed or orphaned — review child_resources before confirming delete.';
  }

  return buildReadResponse(response, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}

async function handleDatabaseEnvsList(
  parsed: EnvsListAction,
  env: EnvConfig,
): Promise<DatabaseEnvsListResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);
  const envs = await fetchEnvs(
    'database',
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

async function handleDatabaseEnvsGet(
  parsed: EnvsGetAction,
  env: EnvConfig,
): Promise<DatabaseEnvsGetResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);
  const envs = await fetchEnvs(
    'database',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const found = resolveEnvIdentity(envs, {
    env_uuid: parsed.env_uuid,
    key: parsed.key,
  }, 'database');
  const data = maskEnvRecord(found, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleDatabaseEnvsCreate(
  parsed: EnvsCreateAction,
  env: EnvConfig,
): Promise<DatabaseEnvsCreateResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);
  const created = await createEnv(
    'database',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    {
      key: parsed.key,
      value: parsed.value,
      is_literal: parsed.is_literal,
      is_multiline: parsed.is_multiline,
      is_shown_once: parsed.is_shown_once,
    },
    env.COOLIFY_VERIFY_SSL,
  );

  const envs = await fetchEnvs(
    'database',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const stored = resolveEnvIdentity(envs, { env_uuid: created.uuid }, 'database');

  const data = maskEnvRecord(
    {
      uuid: stored.uuid,
      key: stored.key,
      value: stored.value,
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

async function handleDatabaseEnvsUpdate(
  parsed: EnvsUpdateAction,
  env: EnvConfig,
): Promise<DatabaseEnvsUpdateResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);

  const envs = await fetchEnvs(
    'database',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const found = parsed.env_uuid
    ? resolveEnvIdentity(envs, { env_uuid: parsed.env_uuid }, 'database')
    : parsed.key
      ? resolveEnvIdentity(envs, { key: parsed.key }, 'database')
      : undefined;

  if (!found) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'At least one of env_uuid or key is required.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const mergedFlags = mergeEnvMutationFlags(found, parsed);

  const entry = buildEnvBulkEntry({
    key: found.key,
    value: parsed.value,
    is_literal: mergedFlags.is_literal,
    is_multiline: mergedFlags.is_multiline,
    is_shown_once: mergedFlags.is_shown_once,
  });

  await updateEnvViaBulk(
    'database',
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    [entry],
    env.COOLIFY_VERIFY_SSL,
  );

  const data = maskEnvRecord(
    {
      uuid: found.uuid,
      key: found.key,
      value: parsed.value,
      is_literal: mergedFlags.is_literal,
      is_multiline: mergedFlags.is_multiline,
      is_shown_once: mergedFlags.is_shown_once,
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

async function handleDatabaseEnvsDelete(
  parsed: EnvsDeleteAction,
  env: EnvConfig,
): Promise<DatabaseEnvsDeleteResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);
  validateEnvMutationConfirm(parsed.confirm, 'envs:delete', uuid, 'database');

  await deleteEnv(
    'database',
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

async function handleDatabaseEnvsBulkUpdate(
  parsed: EnvsBulkUpdateAction,
  env: EnvConfig,
): Promise<DatabaseEnvsBulkUpdateResult> {
  const uuid = await resolveDatabaseUuid(parsed, env);
  validateEnvMutationConfirm(parsed.confirm, 'envs:bulk-update', uuid, 'database');

  const entries = parsed.entries.map((entry) => buildEnvBulkEntry(entry));

  await bulkUpdateEnvs(
    'database',
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

function projectBackupExecution(raw: unknown): {
  uuid?: string;
  filename?: string;
  size?: number;
  created_at?: string;
  message?: string;
  status?: string;
} {
  if (!isRecord(raw)) {
    return {};
  }

  return {
    uuid: typeof raw.uuid === 'string' ? raw.uuid : undefined,
    filename: typeof raw.filename === 'string' ? raw.filename : undefined,
    size: typeof raw.size === 'number' ? raw.size : undefined,
    created_at:
      typeof raw.created_at === 'string' ? raw.created_at : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
  };
}

async function handleDatabaseBackupCreate(
  parsed: BackupCreateAction,
  env: EnvConfig,
): Promise<DatabaseBackupCreateResult> {
  const dbUuid = await resolveDatabaseUuid(parsed, env);
  const payload = buildBackupCreatePayload(parsed);

  const raw = await createDatabaseBackup(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    payload,
    env.COOLIFY_VERIFY_SSL,
  );

  const scheduleUuid = raw.uuid;

  const masked = maskBackupConfig(raw, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(
      {
        uuid: scheduleUuid,
        ...masked,
        hints: [
          'Use database backup:now to trigger an immediate run',
          'Use database backup:history to inspect executions',
        ],
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
}

async function handleDatabaseBackupList(
  parsed: BackupListAction,
  env: EnvConfig,
): Promise<DatabaseBackupListResult> {
  const dbUuid = await resolveDatabaseUuid(parsed, env);
  const schedules = await fetchDatabaseBackups(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const data = schedules.map((schedule) =>
    maskBackupConfig(schedule, parsed.reveal),
  );

  return withRevealRecoveryHints(
    buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    }),
    parsed.reveal,
  );
}

async function handleDatabaseBackupHistory(
  parsed: BackupHistoryAction,
  env: EnvConfig,
): Promise<DatabaseBackupHistoryResult> {
  const dbUuid = await resolveDatabaseUuid(parsed, env);
  const result = await fetchBackupExecutions(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    parsed.scheduled_backup_uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const executions = result.executions.map(projectBackupExecution);

  return withRevealRecoveryHints(
    buildReadResponse(
      {
        scheduled_backup_uuid: parsed.scheduled_backup_uuid,
        executions,
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
}

export async function handleDatabaseAction(
  args: unknown,
  env: EnvConfig,
): Promise<DatabaseActionResult> {
  try {
    const parsed = parseDatabaseAction(args);

    switch (parsed.action) {
      case 'create':
        return await handleDatabaseCreate(parsed, env);
      case 'update':
        return await handleDatabaseUpdate(parsed, env);
      case 'delete':
        return await handleDatabaseDelete(parsed, env);
      case 'delete_preview':
        return await handleDatabaseDeletePreview(parsed, env);
      case 'envs:list':
        return await handleDatabaseEnvsList(parsed, env);
      case 'envs:get':
        return await handleDatabaseEnvsGet(parsed, env);
      case 'envs:create':
        return await handleDatabaseEnvsCreate(parsed, env);
      case 'envs:update':
        return await handleDatabaseEnvsUpdate(parsed, env);
      case 'envs:delete':
        return await handleDatabaseEnvsDelete(parsed, env);
      case 'envs:bulk-update':
        return await handleDatabaseEnvsBulkUpdate(parsed, env);
      case 'backup:create':
        return await handleDatabaseBackupCreate(parsed, env);
      case 'backup:list':
        return await handleDatabaseBackupList(parsed, env);
      case 'backup:history':
        return await handleDatabaseBackupHistory(parsed, env);
      case 'start':
      case 'stop':
      case 'restart':
        return await handleDatabaseMutation(parsed, env);
      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const resolvedUuid = await resolveDatabaseUuid(parsed, env);

        const raw = await fetchDatabase(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          resolvedUuid,
          env.COOLIFY_VERIFY_SSL,
        );

        const rawRecord = isRecord(raw) ? raw : {};
        const hints = generateHints(
          'database',
          resolvedUuid,
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
            : { ...projectDatabaseSummary(rawRecord, lookup), hints };

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

export function isDatabaseErrorResult(
  result: DatabaseActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
