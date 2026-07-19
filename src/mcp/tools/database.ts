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
  fetchDatabase,
  fetchResources,
  triggerDatabaseRestart,
  triggerDatabaseStart,
  triggerDatabaseStop,
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
): void {
  if (data.is_public === true && data.confirm !== true) {
    ctx.addIssue({
      code: 'custom',
      message:
        'is_public: true requires confirm: true for database create — COOLIFY_CONFIRM_REQUIRED',
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
      requireConfirmForPublicAccess(data, ctx);
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

export const databaseActionSchema = z.discriminatedUnion('action', [
  getActionSchema,
  startActionSchema,
  stopActionSchema,
  restartActionSchema,
  createDatabaseSchema,
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

export type DatabaseActionResult =
  | DatabaseGetResult
  | DatabaseMutationResult
  | DatabaseCreateResult
  | McpErrorResult;

type DatabaseMatchable = FindableResource & { environment_name: string };

type DatabaseIdentifierInput = {
  uuid?: string;
  name?: string;
};

type MutationAction = z.infer<typeof startActionSchema>;
type CreateAction = z.infer<typeof createDatabaseSchema>;

function throwValidationError(error: z.ZodError, args: unknown): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  let code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? undefined;

  if (!code && isRecord(args) && args.action === 'create') {
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
  const dbUuid = String(created.uuid ?? '');
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
          error: message,
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

export async function handleDatabaseAction(
  args: unknown,
  env: EnvConfig,
): Promise<DatabaseActionResult> {
  try {
    const parsed = parseDatabaseAction(args);

    switch (parsed.action) {
      case 'create':
        return await handleDatabaseCreate(parsed, env);
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
