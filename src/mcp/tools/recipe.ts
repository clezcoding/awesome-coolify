import * as z from 'zod/v4';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { EnvConfig } from '../config/env.js';
import {
  bulkUpdateEnvs,
  createClickhouseDatabase,
  createDragonflyDatabase,
  createKeydbDatabase,
  createMariadbDatabase,
  createMongodbDatabase,
  createMysqlDatabase,
  createPostgresqlDatabase,
  createPublicApplication,
  createRedisDatabase,
  createService,
  fetchDatabase,
  triggerDatabaseStart,
  triggerDeploy,
} from '../../api/client.js';
import { sanitizeFullProjection } from '../../utils/projections.js';
import {
  resolveEnvironmentUuid,
  resolveProjectUuid,
} from '../../utils/project-lookup.js';
import { fetchServiceTemplates } from '../../utils/service-templates.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  createFlatActionSchema,
  mutationResponseParamsFlatShape,
  resolveRoutingEnv,
  safeParseWithInstanceRouting,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

const MANIFEST_HINT =
  'Tip: pass `instance` to target a registered Coolify instance or use the manifest tool to record context (D-20 soft manifest hint).';

function appendManifestHint(hints: string[]): string[] {
  if (hints.includes(MANIFEST_HINT)) {
    return hints;
  }
  return [...hints, MANIFEST_HINT];
}

function rethrowGitAppApiErrorWithManifestHint(error: unknown): never {
  if (error instanceof CoolifyApiError) {
    throw new CoolifyApiError({
      ...error.envelope,
      recoveryHints: appendManifestHint(error.envelope.recoveryHints),
    });
  }
  throw error;
}

export const recipeActionsCatalog =
  'Actions: create-git-app(server_uuid, git_repository, git_branch, repo_path?, build_pack?) · create-app-db(server_uuid, app_name, db_name, db_engine, env_key?) · create-one-click(server_uuid, type, instant_deploy?)';

export const recipeSafetyFooter =
  'Safety: optional instance · reveal opt-in only';

function requireProjectAndEnvironment(
  data: {
    project_uuid?: string;
    project_name?: string;
    environment_name?: string;
    environment_uuid?: string;
  },
  ctx: z.RefinementCtx,
  actionLabel: string,
): void {
  if (!data.project_uuid && !data.project_name) {
    ctx.addIssue({
      code: 'custom',
      message: `Either project_uuid or project_name is required for ${actionLabel}`,
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
  if (!data.environment_name && !data.environment_uuid) {
    ctx.addIssue({
      code: 'custom',
      message: `Either environment_name or environment_uuid is required for ${actionLabel}`,
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

function rejectDockercomposeBuildPack(
  data: { build_pack?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.build_pack === 'dockercompose') {
    ctx.addIssue({
      code: 'custom',
      message:
        "build_pack='dockercompose' is not supported on create-git-app — use service.create or create-one-click",
      params: { code: 'COOLIFY_VALIDATION_ERROR' },
    });
  }
}

export const recipeActionSchema = createFlatActionSchema(
  ['create-git-app', 'create-app-db', 'create-one-click'],
  {
    server_uuid: z.string().optional().describe('Target server UUID'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z.string().optional().describe('Project name for lookup'),
    environment_name: z.string().optional().describe('Environment name'),
    environment_uuid: z.string().optional().describe('Environment UUID'),
    app_name: z.string().optional().describe('Application name'),
    db_name: z.string().optional().describe('Database name'),
    db_engine: z
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
      .describe('Database engine'),
    env_key: z
      .string()
      .optional()
      .describe('Env key to wire (default DATABASE_URL)'),
    git_repository: z.string().optional().describe('Git repository URL'),
    git_branch: z.string().optional().describe('Git branch'),
    repo_path: z
      .string()
      .optional()
      .describe('Local filesystem path to repo'),
    build_pack: z
      .enum(['nixpacks', 'railpack', 'static', 'dockerfile', 'dockercompose'])
      .optional()
      .describe('Build pack override'),
    type: z.string().optional().describe('One-click service type'),
    instant_deploy: z
      .boolean()
      .optional()
      .describe('Start immediately (default true)'),
    reveal: z.boolean().optional().describe('Reveal masked values'),
    ...sharedReadParamsFlatShape,
    ...mutationResponseParamsFlatShape,
  },
  {
    'create-git-app': [
      'server_uuid',
      'git_repository',
      'git_branch',
      'repo_path',
      'build_pack',
      'instant_deploy',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'format',
      'max_chars',
    ],
    'create-app-db': [
      'server_uuid',
      'app_name',
      'db_name',
      'db_engine',
      'env_key',
      'instant_deploy',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'reveal',
      'format',
      'max_chars',
    ],
    'create-one-click': [
      'server_uuid',
      'type',
      'instant_deploy',
      'project_uuid',
      'project_name',
      'environment_name',
      'environment_uuid',
      'format',
      'max_chars',
    ],
  },
  {
    'create-git-app': ['server_uuid', 'git_repository', 'git_branch'],
    'create-app-db': ['server_uuid', 'app_name', 'db_name', 'db_engine'],
    'create-one-click': ['server_uuid', 'type'],
  },
  (data, ctx) => {
    if (data.action === 'create-git-app') {
      requireProjectAndEnvironment(data, ctx, 'create-git-app');
      rejectDockercomposeBuildPack(data, ctx);
      if (!data.repo_path && !data.build_pack) {
        ctx.addIssue({
          code: 'custom',
          message: 'build_pack is required when repo_path is omitted',
          path: ['build_pack'],
          params: { code: 'COOLIFY_VALIDATION_ERROR' },
        });
      }
    }
    if (data.action === 'create-app-db') {
      requireProjectAndEnvironment(data, ctx, 'create-app-db');
    }
    if (data.action === 'create-one-click') {
      requireProjectAndEnvironment(data, ctx, 'create-one-click');
    }
  },
);

export type RecipeAction = z.infer<typeof recipeActionSchema>;

type CreateGitAppAction = Extract<RecipeAction, { action: 'create-git-app' }>;
type CreateAppDbAction = Extract<RecipeAction, { action: 'create-app-db' }>;
type CreateOneClickAction = Extract<
  RecipeAction,
  { action: 'create-one-click' }
>;

export type RecipeActionResult = ReadResponse<Record<string, unknown>> | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function throwValidationError(error: z.ZodError, args: unknown): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code ===
      'string',
  );
  let code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)
      ?.params?.code as CoolifyErrorCode | undefined) ?? undefined;

  if (
    !code &&
    isRecord(args) &&
    (args.action === 'create-git-app' ||
      args.action === 'create-app-db' ||
      args.action === 'create-one-click')
  ) {
    code = 'COOLIFY_VALIDATION_ERROR';
  }

  const resolvedCode = code ?? 'COOLIFY_422';

  let recoveryHints =
    RECOVERY_HINTS[resolvedCode] ?? RECOVERY_HINTS.COOLIFY_422;

  if (isRecord(args) && args.action === 'create-git-app') {
    recoveryHints = appendManifestHint(recoveryHints);
  }

  throw new CoolifyApiError({
    code: resolvedCode,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints,
  });
}

function parseRecipeAction(
  args: unknown,
): RecipeAction & { instance?: string } {
  const parsed = safeParseWithInstanceRouting(recipeActionSchema, args);
  if (!parsed.success) {
    throwValidationError(parsed.error, args);
  }
  return parsed.data;
}

export function detectBuildPack(repoPath: string): 'dockerfile' | 'nixpacks' {
  try {
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    const stat = statSync(dockerfilePath);
    if (stat.isFile()) {
      return 'dockerfile';
    }
  } catch {
    // Missing Dockerfile — check Dockerfile.* glob next.
  }

  try {
    const entries = readdirSync(repoPath);
    if (entries.some((entry) => /^Dockerfile\..+$/.test(entry))) {
      return 'dockerfile';
    }
  } catch {
    // Unreadable repo_path — fall back to nixpacks.
  }

  return 'nixpacks';
}

async function handleCreateGitApp(
  parsed: CreateGitAppAction,
  env: EnvConfig,
): Promise<ReadResponse<Record<string, unknown>>> {
  const project_uuid = parsed.project_uuid
    ? parsed.project_uuid
    : await resolveProjectUuid(undefined, parsed.project_name, env);

  let environment_uuid = parsed.environment_uuid;
  if (parsed.environment_name) {
    environment_uuid = await resolveEnvironmentUuid(
      undefined,
      parsed.environment_name,
      project_uuid,
      env,
    );
  }

  const build_pack =
    parsed.build_pack ??
    (parsed.repo_path ? detectBuildPack(parsed.repo_path) : undefined);

  if (!build_pack) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'build_pack is required when repo_path is omitted',
      recoveryHints: appendManifestHint(RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR),
    });
  }

  const body = omitUndefined({
    server_uuid: parsed.server_uuid,
    project_uuid,
    environment_uuid,
    environment_name: parsed.environment_name,
    git_repository: parsed.git_repository,
    git_branch: parsed.git_branch,
    build_pack,
    name: parsed.app_name,
    instant_deploy: parsed.instant_deploy !== false,
  });

  let raw: unknown;
  try {
    raw = await createPublicApplication(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      body,
      env.COOLIFY_VERIFY_SSL,
    );
  } catch (error) {
    rethrowGitAppApiErrorWithManifestHint(error);
  }

  const created = isRecord(raw) ? raw : {};
  const application_uuid = String(created.uuid ?? '');

  if (parsed.instant_deploy !== false && application_uuid) {
    try {
      await triggerDeploy(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        application_uuid,
        env.COOLIFY_VERIFY_SSL,
      );
    } catch (error) {
      rethrowGitAppApiErrorWithManifestHint(error);
    }
  }

  return buildReadResponse(
    {
      application_uuid,
      build_pack,
      deploy: { status: 'queued' as const },
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

type DbEngine = CreateAppDbAction['db_engine'];

function readStringField(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

async function dispatchCreateDatabase(
  engine: DbEngine,
  env: EnvConfig,
  body: Record<string, unknown>,
): Promise<unknown> {
  switch (engine) {
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
    default: {
      const _exhaustive: never = engine;
      throw new Error(`Unsupported database engine: ${String(_exhaustive)}`);
    }
  }
}

export function constructFallbackUrl(
  engine: DbEngine,
  dbDetails: Record<string, unknown>,
  dbName: string,
): string {
  const host =
    readStringField(dbDetails, 'internal_hostname', 'hostname', 'host') ??
    'localhost';
  const encode = encodeURIComponent;

  switch (engine) {
    case 'postgresql': {
      const user = readStringField(dbDetails, 'postgres_user') ?? 'postgres';
      const password =
        readStringField(dbDetails, 'postgres_password', 'password') ?? '';
      const db = readStringField(dbDetails, 'postgres_db') ?? dbName;
      const port = String(dbDetails.port ?? dbDetails.public_port ?? 5432);
      return `postgresql://${encode(user)}:${encode(password)}@${host}:${port}/${db}`;
    }
    case 'mysql':
    case 'mariadb': {
      const prefix = engine === 'mysql' ? 'mysql' : 'mariadb';
      const user = readStringField(dbDetails, `${prefix}_user`) ?? prefix;
      const password =
        readStringField(dbDetails, `${prefix}_password`, 'password') ?? '';
      const db = readStringField(dbDetails, `${prefix}_database`) ?? dbName;
      const port = String(dbDetails.port ?? dbDetails.public_port ?? 3306);
      return `mysql://${encode(user)}:${encode(password)}@${host}:${port}/${db}`;
    }
    case 'mongodb': {
      const user =
        readStringField(
          dbDetails,
          'mongo_initdb_root_username',
          'mongo_user',
        ) ?? 'root';
      const password =
        readStringField(dbDetails, 'mongo_initdb_root_password', 'password') ??
        '';
      const db = readStringField(dbDetails, 'mongo_initdb_database') ?? dbName;
      const port = String(dbDetails.port ?? dbDetails.public_port ?? 27017);
      return `mongodb://${encode(user)}:${encode(password)}@${host}:${port}/${db}`;
    }
    case 'redis':
    case 'dragonfly':
    case 'keydb': {
      const password =
        readStringField(dbDetails, 'redis_password', 'password') ?? '';
      const port = String(dbDetails.port ?? dbDetails.public_port ?? 6379);
      return `redis://default:${encode(password)}@${host}:${port}`;
    }
    case 'clickhouse': {
      const user =
        readStringField(dbDetails, 'clickhouse_admin_user') ?? 'default';
      const password =
        readStringField(dbDetails, 'clickhouse_admin_password', 'password') ??
        '';
      const port = String(dbDetails.port ?? dbDetails.public_port ?? 8123);
      return `clickhouse://${encode(user)}:${encode(password)}@${host}:${port}/default`;
    }
    default: {
      const _exhaustive: never = engine;
      return String(_exhaustive);
    }
  }
}

async function handleCreateAppDb(
  parsed: CreateAppDbAction,
  env: EnvConfig,
): Promise<ReadResponse<Record<string, unknown>>> {
  const project_uuid = parsed.project_uuid
    ? parsed.project_uuid
    : await resolveProjectUuid(undefined, parsed.project_name, env);

  let environment_uuid = parsed.environment_uuid;
  if (parsed.environment_name) {
    environment_uuid = await resolveEnvironmentUuid(
      undefined,
      parsed.environment_name,
      project_uuid,
      env,
    );
  }

  const dbBody = omitUndefined({
    server_uuid: parsed.server_uuid,
    project_uuid,
    environment_uuid,
    environment_name: parsed.environment_name,
    name: parsed.db_name,
    instant_deploy: parsed.instant_deploy !== false,
  });

  const dbRaw = await dispatchCreateDatabase(parsed.db_engine, env, dbBody);
  const dbCreated = isRecord(dbRaw) ? dbRaw : {};
  const dbUuid = String(dbCreated.uuid ?? '');
  if (!dbUuid) {
    throw new CoolifyApiError({
      code: 'COOLIFY_500',
      message: 'Database create succeeded but response lacked uuid',
      recoveryHints: RECOVERY_HINTS.COOLIFY_500,
    });
  }

  if (parsed.instant_deploy !== false) {
    try {
      await triggerDatabaseStart(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        dbUuid,
        env.COOLIFY_VERIFY_SSL,
      );
    } catch {
      // Soft ignore DB start failure — continue wiring per D-16.
    }
  }

  let appUuid: string;
  try {
    const appRaw = await createPublicApplication(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      omitUndefined({
        server_uuid: parsed.server_uuid,
        project_uuid,
        environment_uuid,
        environment_name: parsed.environment_name,
        name: parsed.app_name,
        build_pack: 'nixpacks',
        instant_deploy: parsed.instant_deploy !== false,
      }),
      env.COOLIFY_VERIFY_SSL,
    );
    const appCreated = isRecord(appRaw) ? appRaw : {};
    appUuid = String(appCreated.uuid ?? '');
    if (!appUuid) {
      throw new Error('Application create succeeded but response lacked uuid');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoolifyApiError({
      code: 'COOLIFY_RECIPE_PARTIAL_FAILURE',
      message: `Database created successfully but application creation failed: ${message}`,
      recoveryHints: [
        'Do not delete the database; it is fully functional.',
        'Manually create the application and link the connection string.',
      ],
      data: { database_uuid: dbUuid },
    });
  }

  const dbDetailsRaw = await fetchDatabase(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    dbUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const dbDetails = isRecord(dbDetailsRaw) ? dbDetailsRaw : dbCreated;
  const internalUrl = readStringField(dbDetails, 'internal_db_url');
  const connectionString =
    internalUrl ??
    constructFallbackUrl(parsed.db_engine, dbDetails, parsed.db_name);
  const envKey = parsed.env_key ?? 'DATABASE_URL';

  try {
    await bulkUpdateEnvs(
      'application',
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      appUuid,
      [{ key: envKey, value: connectionString }],
      env.COOLIFY_VERIFY_SSL,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CoolifyApiError({
      code: 'COOLIFY_RECIPE_PARTIAL_FAILURE',
      message: `Application and database created but env wiring failed: ${message}`,
      recoveryHints: [
        'Both resources are created and running.',
        'Manually set the env var on the application using the database connection string.',
        MANIFEST_HINT,
      ],
      data: { application_uuid: appUuid, database_uuid: dbUuid },
    });
  }

  if (parsed.instant_deploy !== false) {
    try {
      await triggerDeploy(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        appUuid,
        env.COOLIFY_VERIFY_SSL,
      );
    } catch {
      // Soft ignore deploy queue failure per D-16.
    }
  }

  const maskedConnection = sanitizeFullProjection(
    { connection_string: connectionString },
    parsed.reveal,
  ) as { connection_string: string };

  return buildReadResponse(
    {
      application_uuid: appUuid,
      database_uuid: dbUuid,
      connection_string: maskedConnection.connection_string,
      env_key: envKey,
      deploy: { status: 'queued' as const },
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

async function handleCreateOneClick(
  parsed: CreateOneClickAction,
  env: EnvConfig,
): Promise<ReadResponse<Record<string, unknown>>> {
  const templates = await fetchServiceTemplates(env);

  if (!(parsed.type in templates)) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `Unknown one-click type '${parsed.type}'. Call service.list-types for valid IDs.`,
      recoveryHints: [
        'Run service action list-types to fetch valid one-click type IDs.',
        'Type must match a key in the official service-templates.json catalog.',
        MANIFEST_HINT,
      ],
    });
  }

  const project_uuid = parsed.project_uuid
    ? parsed.project_uuid
    : await resolveProjectUuid(undefined, parsed.project_name, env);

  let environment_uuid = parsed.environment_uuid;
  if (parsed.environment_name) {
    environment_uuid = await resolveEnvironmentUuid(
      undefined,
      parsed.environment_name,
      project_uuid,
      env,
    );
  }

  const body = omitUndefined({
    server_uuid: parsed.server_uuid,
    project_uuid,
    environment_uuid,
    environment_name: parsed.environment_name,
    type: parsed.type,
    instant_deploy: parsed.instant_deploy !== false,
  });

  const raw = await createService(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    body,
    env.COOLIFY_VERIFY_SSL,
  );

  const created = isRecord(raw) ? raw : {};
  const service_uuid = String(created.uuid ?? '');

  return buildReadResponse(
    {
      service_uuid,
      type: parsed.type,
      deploy: { status: 'queued' as const },
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

export async function handleRecipeAction(
  args: unknown,
  env: EnvConfig,
): Promise<RecipeActionResult> {
  try {
    const parsed = parseRecipeAction(args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'create-git-app':
        return await handleCreateGitApp(parsed, routingEnv);
      case 'create-app-db':
        return await handleCreateAppDb(parsed, routingEnv);
      case 'create-one-click':
        return await handleCreateOneClick(parsed, routingEnv);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown recipe action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isRecipeErrorResult(
  result: RecipeActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
