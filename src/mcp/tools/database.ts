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
  updateDatabaseBackup,
  deleteDatabaseBackup,
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
  resolveEnvironmentUuid,
  resolveProjectUuid,
} from '../../utils/project-lookup.js';
import { ManifestManager } from '../../utils/manifest.js';
import { resolveUpdateManifestContext } from '../../utils/manifest-auto-hook.js';
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
  createFlatActionSchema,
  rejectTableFormatOnFullProjection,
  resolveRoutingEnv,
  safeParseWithInstanceRouting,
  sharedReadParamsFlatShape,
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
  backupFrequencyUpdateSchema,
  buildBackupCreatePayload,
  buildBackupUpdatePayload,
  maskBackupConfig,
  validateBackupDeleteConfirm,
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

const mutationResponseParamsFlatShape = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .optional()
    .describe('Output format (default pretty)'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .optional()
    .describe('Max formatted output characters (default 16000)'),
};

const databaseReadParamKeys = [
  'format',
  'projection',
  'include_full',
  'page',
  'per_page',
  'max_chars',
  'reveal',
] as const;

const envBulkEntrySchema = z
  .object({
    key: z.string().describe('Environment variable key'),
    value: z.string().describe('Environment variable value'),
    is_literal: z.boolean().optional().describe('Literal flag'),
    is_multiline: z.boolean().optional().describe('Multiline flag'),
    is_shown_once: z.boolean().optional().describe('Show-once flag'),
  })
  .strict();

export const databaseActionsCatalog =
  'Actions: get(uuid?, name?) · start(uuid?) · stop(uuid?) · restart(uuid?) · create(engine, server_uuid) · update(uuid?) · delete(uuid?, confirm) · envs:* · backup:*';

export const databaseSafetyFooter =
  'Safety: confirm for destructive ops · optional instance · reveal opt-in only';

export const databaseActionSchema = createFlatActionSchema(
  [
    'get',
    'start',
    'stop',
    'restart',
    'create',
    'update',
    'delete',
    'delete_preview',
    'envs:list',
    'envs:get',
    'envs:create',
    'envs:update',
    'envs:delete',
    'envs:bulk-update',
    'backup:create',
    'backup:list',
    'backup:history',
    'backup:update',
    'backup:delete',
    'backup:now',
  ],
  {
    uuid: z.string().optional().describe('Database UUID'),
    name: z.string().optional().describe('Database name substring'),
    server_uuid: z.string().optional().describe('Target server UUID'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z.string().optional().describe('Project name'),
    environment_name: z.string().optional().describe('Environment name'),
    environment_uuid: z.string().optional().describe('Environment UUID'),
    description: z.string().optional().describe('Database description'),
    image: z.string().optional().describe('Custom database image'),
    engine: z
      .enum([
        'postgresql',
        'mysql',
        'mariadb',
        'mongodb',
        'redis',
        'clickhouse',
        'dragonfly',
        'keydb',
      ])
      .optional()
      .describe('Database engine (required for create)'),
    is_public: z.boolean().optional().describe('Expose database port publicly'),
    public_port: z.number().int().optional().describe('Public port when is_public'),
    public_port_timeout: z.number().int().optional().describe('Public port mapping timeout'),
    limits_memory: z.string().optional(),
    limits_memory_swap: z.string().optional(),
    limits_memory_swappiness: z.number().int().optional(),
    limits_memory_reservation: z.string().optional(),
    limits_cpus: z.string().optional(),
    limits_cpuset: z.string().optional(),
    limits_cpu_shares: z.number().int().optional(),
    destination_uuid: z.string().optional(),
    instant_deploy: z.boolean().optional().describe('Start database after create'),
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
    confirm: z.boolean().optional().describe('Confirm destructive or public exposure ops'),
    delete_volumes: z.boolean().optional(),
    delete_configurations: z.boolean().optional(),
    docker_cleanup: z.boolean().optional(),
    delete_connected_networks: z.boolean().optional(),
    env_uuid: z.string().optional().describe('Environment variable UUID'),
    key: z.string().optional().describe('Environment variable key'),
    value: z.string().optional().describe('Environment variable value'),
    is_literal: z.boolean().optional(),
    is_multiline: z.boolean().optional(),
    is_shown_once: z.boolean().optional(),
    entries: z.array(envBulkEntrySchema).optional(),
    frequency: backupFrequencyCreateSchema
      .optional()
      .describe('Backup frequency preset or cron expression'),
    enabled: z.boolean().optional().describe('Enable schedule'),
    save_s3: z.boolean().optional().describe('Upload backups to S3'),
    s3_storage_uuid: z.string().optional().describe('S3 storage destination UUID'),
    databases_to_backup: z.string().optional(),
    dump_all: z.boolean().optional(),
    backup_now: z.boolean().optional(),
    database_backup_retention_amount_locally: z.number().int().optional(),
    database_backup_retention_days_locally: z.number().int().optional(),
    database_backup_retention_max_storage_locally: z.string().optional(),
    database_backup_retention_amount_s3: z.number().int().optional(),
    database_backup_retention_days_s3: z.number().int().optional(),
    database_backup_retention_max_storage_s3: z.string().optional(),
    timeout: z.number().int().optional().describe('Backup timeout in seconds'),
    scheduled_backup_uuid: z.string().optional().describe('Backup schedule UUID'),
    delete_s3: z.boolean().optional().describe('Also delete S3 backup artifacts'),
    reveal: z.boolean().optional().describe('Reveal masked credentials for this call only'),
    ...sharedReadParamsFlatShape,
    ...mutationResponseParamsFlatShape,
  },
  {
    get: ['uuid', 'name', ...databaseReadParamKeys],
    start: ['uuid', 'name', 'format', 'max_chars'],
    stop: ['uuid', 'name', 'format', 'max_chars'],
    restart: ['uuid', 'name', 'format', 'max_chars'],
    create: [
      'engine',
      'server_uuid',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
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
      'destination_uuid',
      'instant_deploy',
      'confirm',
      'reveal',
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
      'format',
      'max_chars',
    ],
    update: [
      'uuid',
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
      'confirm',
      'reveal',
      'format',
      'max_chars',
    ],
    delete: [
      'uuid',
      'name',
      'confirm',
      'delete_volumes',
      'delete_configurations',
      'docker_cleanup',
      'delete_connected_networks',
      'format',
      'max_chars',
    ],
    delete_preview: ['uuid', 'name', 'format', 'max_chars'],
    'envs:list': ['uuid', 'name', 'reveal', 'format', 'max_chars'],
    'envs:get': ['uuid', 'name', 'env_uuid', 'key', 'reveal', 'format', 'max_chars'],
    'envs:create': [
      'uuid',
      'name',
      'key',
      'value',
      'is_literal',
      'is_multiline',
      'is_shown_once',
      'reveal',
      'format',
      'max_chars',
    ],
    'envs:update': [
      'uuid',
      'name',
      'env_uuid',
      'key',
      'value',
      'is_literal',
      'is_multiline',
      'is_shown_once',
      'reveal',
      'format',
      'max_chars',
    ],
    'envs:delete': ['uuid', 'name', 'env_uuid', 'confirm', 'reveal', 'format', 'max_chars'],
    'envs:bulk-update': ['uuid', 'name', 'entries', 'confirm', 'reveal', 'format', 'max_chars'],
    'backup:create': [
      'uuid',
      'name',
      'frequency',
      'enabled',
      'save_s3',
      's3_storage_uuid',
      'databases_to_backup',
      'dump_all',
      'backup_now',
      'database_backup_retention_amount_locally',
      'database_backup_retention_days_locally',
      'database_backup_retention_max_storage_locally',
      'database_backup_retention_amount_s3',
      'database_backup_retention_days_s3',
      'database_backup_retention_max_storage_s3',
      'timeout',
      'reveal',
      'confirm',
      'format',
      'max_chars',
    ],
    'backup:list': ['uuid', 'name', 'reveal', 'confirm', 'format', 'max_chars'],
    'backup:history': [
      'uuid',
      'name',
      'scheduled_backup_uuid',
      'reveal',
      'confirm',
      'format',
      'max_chars',
    ],
    'backup:update': [
      'uuid',
      'name',
      'scheduled_backup_uuid',
      'frequency',
      'enabled',
      'save_s3',
      's3_storage_uuid',
      'databases_to_backup',
      'dump_all',
      'database_backup_retention_amount_locally',
      'database_backup_retention_days_locally',
      'database_backup_retention_max_storage_locally',
      'database_backup_retention_amount_s3',
      'database_backup_retention_days_s3',
      'database_backup_retention_max_storage_s3',
      'timeout',
      'reveal',
      'confirm',
      'format',
      'max_chars',
    ],
    'backup:delete': [
      'uuid',
      'name',
      'scheduled_backup_uuid',
      'confirm',
      'delete_s3',
      'format',
      'max_chars',
    ],
    'backup:now': [
      'uuid',
      'name',
      'scheduled_backup_uuid',
      'reveal',
      'confirm',
      'format',
      'max_chars',
    ],
  },
  {
    create: ['engine', 'server_uuid'],
    'envs:create': ['key', 'value'],
    'envs:update': ['value'],
    'envs:delete': ['env_uuid'],
    'envs:bulk-update': ['entries'],
    'backup:create': ['frequency'],
    'backup:history': ['scheduled_backup_uuid'],
    'backup:update': ['scheduled_backup_uuid'],
    'backup:delete': ['scheduled_backup_uuid'],
    'backup:now': ['scheduled_backup_uuid'],
  },
  (data, ctx) => {
    const idActions = [
      'start',
      'stop',
      'restart',
      'get',
      'update',
      'delete',
      'delete_preview',
      'envs:list',
      'envs:get',
      'envs:create',
      'envs:update',
      'envs:delete',
      'envs:bulk-update',
      'backup:create',
      'backup:list',
      'backup:history',
      'backup:update',
      'backup:delete',
      'backup:now',
    ] as const;
    if (
      (idActions as readonly string[]).includes(data.action) &&
      !hasAtLeastOneIdentifier(data, DATABASE_IDENTIFIER_FIELDS)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `At least one identifier (uuid|name) required for action ${data.action}`,
        params: { code: 'COOLIFY_422' },
      });
    }
    if (data.action === 'create') {
      requireProjectAndEnvironment(data, ctx);
      requireConfirmForPublicAccess(data, ctx, 'create');
    }
    if (data.action === 'update') {
      requireConfirmForPublicAccess(data, ctx, 'update');
    }
    if (data.action === 'envs:get') {
      requireEnvUuidOrKey(data, ctx, 'envs:get');
    }
    if (data.action === 'envs:update') {
      requireEnvUuidOrKey(data, ctx, 'envs:update');
    }
    if (data.action === 'envs:bulk-update' && data.entries && data.entries.length > 100) {
      ctx.addIssue({
        code: 'custom',
        message:
          'envs:bulk-update accepts at most 100 entries per call — batch into multiple requests',
        path: ['entries'],
        params: { code: 'COOLIFY_VALIDATION_ERROR' },
      });
    }
    if (data.action === 'backup:create' || data.action === 'backup:update') {
      if (data.save_s3 === true && !data.s3_storage_uuid) {
        ctx.addIssue({
          code: 'custom',
          message:
            'save_s3: true requires s3_storage_uuid — COOLIFY_VALIDATION_ERROR',
          path: ['s3_storage_uuid'],
          params: { code: 'COOLIFY_VALIDATION_ERROR' },
        });
      }
    }
    if (data.action === 'backup:update' && data.frequency !== undefined) {
      if (!backupFrequencyUpdateSchema.safeParse(data.frequency).success) {
        ctx.addIssue({
          code: 'custom',
          message:
            'backup:update frequency must be a preset — cron expressions are not supported on update',
          path: ['frequency'],
          params: { code: 'COOLIFY_VALIDATION_ERROR' },
        });
      }
    }
  },
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

export type DatabaseBackupUpdateResult = ReadResponse<{
  scheduled_backup_uuid: string;
  schedule: Record<string, unknown>;
  updated: true;
}> & { recoveryHints?: string[] };

export type DatabaseBackupDeleteResult = ReadResponse<{
  ok: true;
  scheduled_backup_uuid: string;
  deleted: true;
  delete_s3: boolean;
}>;

export type DatabaseBackupNowResult = ReadResponse<{
  scheduled_backup_uuid: string;
  triggered: true;
  message?: string;
  uuid?: string;
}>;

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
  | DatabaseBackupUpdateResult
  | DatabaseBackupDeleteResult
  | DatabaseBackupNowResult
  | McpErrorResult;

type DatabaseMatchable = FindableResource & { environment_name: string };

type DatabaseIdentifierInput = {
  uuid?: string;
  name?: string;
};

type MutationAction = Extract<DatabaseAction, { action: 'start' | 'stop' | 'restart' }>;
type CreateAction = Extract<DatabaseAction, { action: 'create' }>;
type UpdateAction = Extract<DatabaseAction, { action: 'update' }>;
type DeleteAction = Extract<DatabaseAction, { action: 'delete' }>;
type DeletePreviewAction = Extract<DatabaseAction, { action: 'delete_preview' }>;
type EnvsListAction = Extract<DatabaseAction, { action: 'envs:list' }>;
type EnvsGetAction = Extract<DatabaseAction, { action: 'envs:get' }>;
type EnvsCreateAction = Extract<DatabaseAction, { action: 'envs:create' }>;
type EnvsUpdateAction = Extract<DatabaseAction, { action: 'envs:update' }>;
type EnvsDeleteAction = Extract<DatabaseAction, { action: 'envs:delete' }>;
type EnvsBulkUpdateAction = Extract<DatabaseAction, { action: 'envs:bulk-update' }>;
type BackupCreateAction = Extract<DatabaseAction, { action: 'backup:create' }>;
type BackupListAction = Extract<DatabaseAction, { action: 'backup:list' }>;
type BackupHistoryAction = Extract<DatabaseAction, { action: 'backup:history' }>;
type BackupUpdateAction = Extract<DatabaseAction, { action: 'backup:update' }>;
type BackupDeleteAction = Extract<DatabaseAction, { action: 'backup:delete' }>;
type BackupNowAction = Extract<DatabaseAction, { action: 'backup:now' }>;

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
      args.action === 'backup:update' ||
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

function parseDatabaseAction(args: unknown): DatabaseAction & { instance?: string } {
  const parsed = safeParseWithInstanceRouting(databaseActionSchema, args);
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
    instant_deploy: parsed.instant_deploy !== false,
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

async function withManifestUpsert<T>(
  response: ReadResponse<T>,
  entry: {
    uuid: string;
    type: 'application' | 'service' | 'database';
    name: string;
    domains?: string[];
    projectUuid?: string;
    projectName?: string;
    environmentUuid?: string;
    environmentName?: string;
  },
): Promise<ReadResponse<T>> {
  try {
    await ManifestManager.autoUpsert(entry);
    return response;
  } catch (manifestError) {
    return {
      ...response,
      _meta: {
        ...response._meta,
        manifestWarning: `Failed to update local manifest cache: ${manifestError instanceof Error ? manifestError.message : String(manifestError)}`,
      },
    } as ReadResponse<T>;
  }
}

async function withManifestRemove<T>(
  response: ReadResponse<T>,
  uuid: string,
): Promise<ReadResponse<T>> {
  try {
    await ManifestManager.autoRemove(uuid);
    return response;
  } catch (manifestError) {
    return {
      ...response,
      _meta: {
        ...response._meta,
        manifestWarning: `Failed to update local manifest cache: ${manifestError instanceof Error ? manifestError.message : String(manifestError)}`,
      },
    } as ReadResponse<T>;
  }
}

async function buildDatabaseCreateManifestEntry(
  parsed: CreateAction,
  created: Record<string, unknown>,
  projectUuid: string,
  env: EnvConfig,
): Promise<Parameters<typeof ManifestManager.autoUpsert>[0]> {
  let environmentUuid = parsed.environment_uuid;
  if (!environmentUuid && parsed.environment_name) {
    environmentUuid = await resolveEnvironmentUuid(
      undefined,
      parsed.environment_name,
      projectUuid,
      env,
    );
  }

  return {
    uuid: String(created.uuid ?? ''),
    type: 'database',
    name: String(created.name ?? parsed.name ?? ''),
    domains: [],
    projectUuid,
    projectName: parsed.project_name,
    environmentUuid,
    environmentName: parsed.environment_name,
  };
}

async function buildDatabaseUpdateManifestEntry(
  raw: Record<string, unknown>,
  uuid: string,
  parsed: UpdateAction,
  env: EnvConfig,
): Promise<Parameters<typeof ManifestManager.autoUpsert>[0]> {
  const ctx = await resolveUpdateManifestContext({
    raw,
    resourceUuid: uuid,
    env,
  });

  return {
    uuid,
    type: 'database',
    name: String(raw.name ?? parsed.name ?? ''),
    domains: [],
    projectUuid: ctx.projectUuid,
    projectName: ctx.projectName,
    environmentUuid: ctx.environmentUuid,
    environmentName: ctx.environmentName,
  };
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
  const manifestEntry = await buildDatabaseCreateManifestEntry(
    parsed,
    created,
    project_uuid,
    env,
  );

  if (parsed.instant_deploy === false) {
    return withManifestUpsert(
      buildReadResponse(
        {
          ...projected,
          uuid: dbUuid,
          deploy: { status: 'not_triggered' as const },
          hints: ['Use database.start to start the database'],
        },
        responseParams,
      ),
      manifestEntry,
    );
  }

  try {
    await triggerDatabaseStart(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      dbUuid,
      env.COOLIFY_VERIFY_SSL,
    );

    return withManifestUpsert(
      buildReadResponse(
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
      ),
      manifestEntry,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return withManifestUpsert(
      buildReadResponse(
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
      ),
      manifestEntry,
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

  const response = buildReadResponse(data, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });

  return withManifestUpsert(
    response,
    await buildDatabaseUpdateManifestEntry(
      isRecord(raw) ? raw : {},
      uuid,
      parsed,
      env,
    ),
  );
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

  const deleteVolumes = parsed.delete_volumes ?? false;
  const deleteConfigurations = parsed.delete_configurations ?? false;
  const dockerCleanup = parsed.docker_cleanup ?? false;
  const deleteConnectedNetworks = parsed.delete_connected_networks ?? false;

  await deleteDatabase(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    {
      delete_volumes: deleteVolumes,
      delete_configurations: deleteConfigurations,
      docker_cleanup: dockerCleanup,
      delete_connected_networks: deleteConnectedNetworks,
    },
    env.COOLIFY_VERIFY_SSL,
  );

  const response = buildReadResponse(
    {
      ok: true as const,
      uuid,
      deleted: true as const,
      delete_volumes: deleteVolumes,
      delete_configurations: deleteConfigurations,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );

  return withManifestRemove(response, uuid);
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

async function handleDatabaseBackupUpdate(
  parsed: BackupUpdateAction,
  env: EnvConfig,
): Promise<DatabaseBackupUpdateResult> {
  const dbUuid = await resolveDatabaseUuid(parsed, env);
  const payload = buildBackupUpdatePayload(parsed);

  await updateDatabaseBackup(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    parsed.scheduled_backup_uuid,
    payload,
    env.COOLIFY_VERIFY_SSL,
  );

  const schedules = await fetchDatabaseBackups(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const updated = schedules.find(
    (schedule) => schedule.uuid === parsed.scheduled_backup_uuid,
  );

  const masked = maskBackupConfig(updated ?? {}, parsed.reveal);

  return withRevealRecoveryHints(
    buildReadResponse(
      {
        scheduled_backup_uuid: parsed.scheduled_backup_uuid,
        schedule: masked,
        updated: true as const,
      },
      {
        format: parsed.format,
        max_chars: parsed.max_chars,
      },
    ),
    parsed.reveal,
  );
}

async function handleDatabaseBackupDelete(
  parsed: BackupDeleteAction,
  env: EnvConfig,
): Promise<DatabaseBackupDeleteResult> {
  const dbUuid = await resolveDatabaseUuid(parsed, env);

  const deleteS3 = parsed.delete_s3 ?? false;

  validateBackupDeleteConfirm(
    parsed.confirm,
    deleteS3,
    dbUuid,
    parsed.scheduled_backup_uuid,
  );

  await deleteDatabaseBackup(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    parsed.scheduled_backup_uuid,
    deleteS3,
    env.COOLIFY_VERIFY_SSL,
  );

  return buildReadResponse(
    {
      ok: true as const,
      scheduled_backup_uuid: parsed.scheduled_backup_uuid,
      deleted: true as const,
      delete_s3: deleteS3,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleDatabaseBackupNow(
  parsed: BackupNowAction,
  env: EnvConfig,
): Promise<DatabaseBackupNowResult> {
  const dbUuid = await resolveDatabaseUuid(parsed, env);

  const raw = await updateDatabaseBackup(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    parsed.scheduled_backup_uuid,
    { backup_now: true },
    env.COOLIFY_VERIFY_SSL,
  );

  const response = isRecord(raw) ? raw : {};

  return buildReadResponse(
    {
      scheduled_backup_uuid: parsed.scheduled_backup_uuid,
      triggered: true as const,
      message:
        typeof response.message === 'string' ? response.message : undefined,
      ...(typeof response.uuid === 'string' ? { uuid: response.uuid } : {}),
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

export async function handleDatabaseAction(
  args: unknown,
  env: EnvConfig,
): Promise<DatabaseActionResult> {
  try {
    const parsed = parseDatabaseAction(args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'create':
        return await handleDatabaseCreate(parsed, routingEnv);
      case 'update':
        return await handleDatabaseUpdate(parsed, routingEnv);
      case 'delete':
        return await handleDatabaseDelete(parsed, routingEnv);
      case 'delete_preview':
        return await handleDatabaseDeletePreview(parsed, routingEnv);
      case 'envs:list':
        return await handleDatabaseEnvsList(parsed, routingEnv);
      case 'envs:get':
        return await handleDatabaseEnvsGet(parsed, routingEnv);
      case 'envs:create':
        return await handleDatabaseEnvsCreate(parsed, routingEnv);
      case 'envs:update':
        return await handleDatabaseEnvsUpdate(parsed, routingEnv);
      case 'envs:delete':
        return await handleDatabaseEnvsDelete(parsed, routingEnv);
      case 'envs:bulk-update':
        return await handleDatabaseEnvsBulkUpdate(parsed, routingEnv);
      case 'backup:create':
        return await handleDatabaseBackupCreate(parsed, routingEnv);
      case 'backup:list':
        return await handleDatabaseBackupList(parsed, routingEnv);
      case 'backup:history':
        return await handleDatabaseBackupHistory(parsed, routingEnv);
      case 'backup:update':
        return await handleDatabaseBackupUpdate(parsed, routingEnv);
      case 'backup:delete':
        return await handleDatabaseBackupDelete(parsed, routingEnv);
      case 'backup:now':
        return await handleDatabaseBackupNow(parsed, routingEnv);
      case 'start':
      case 'stop':
      case 'restart':
        return await handleDatabaseMutation(parsed, routingEnv);
      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const resolvedUuid = await resolveDatabaseUuid(parsed, routingEnv);

        const raw = await fetchDatabase(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          resolvedUuid,
          routingEnv.COOLIFY_VERIFY_SSL,
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

        const lookup = await buildProjectEnvironmentIndex(routingEnv);
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
