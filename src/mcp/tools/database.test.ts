import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  databaseActionSchema,
  handleDatabaseAction,
  isDatabaseErrorResult,
} from './database.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchDatabase: vi.fn(),
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchEnvironments: vi.fn(),
  triggerDatabaseStart: vi.fn(),
  triggerDatabaseStop: vi.fn(),
  triggerDatabaseRestart: vi.fn(),
  createPostgresqlDatabase: vi.fn(),
  createMysqlDatabase: vi.fn(),
  createMariadbDatabase: vi.fn(),
  createMongodbDatabase: vi.fn(),
  createRedisDatabase: vi.fn(),
  createClickhouseDatabase: vi.fn(),
  createDragonflyDatabase: vi.fn(),
  createKeydbDatabase: vi.fn(),
  updateDatabase: vi.fn(),
  deleteDatabase: vi.fn(),
  fetchEnvs: vi.fn(),
  createEnv: vi.fn(),
  updateEnvViaBulk: vi.fn(),
  bulkUpdateEnvs: vi.fn(),
  deleteEnv: vi.fn(),
  fetchDatabaseBackups: vi.fn(),
  createDatabaseBackup: vi.fn(),
  updateDatabaseBackup: vi.fn(),
  deleteDatabaseBackup: vi.fn(),
  fetchBackupExecutions: vi.fn(),
}));

vi.mock('../../utils/manifest.js', () => ({
  ManifestManager: {
    autoUpsert: vi.fn(),
    autoRemove: vi.fn(),
  },
}));

import {
  fetchDatabase,
  fetchResources,
  fetchProjects,
  fetchProject,
  fetchEnvironments,
  triggerDatabaseRestart,
  triggerDatabaseStart,
  triggerDatabaseStop,
  createPostgresqlDatabase,
  createMysqlDatabase,
  createMariadbDatabase,
  createMongodbDatabase,
  createRedisDatabase,
  createClickhouseDatabase,
  createDragonflyDatabase,
  createKeydbDatabase,
  updateDatabase,
  deleteDatabase,
  fetchEnvs,
  createEnv,
  updateEnvViaBulk,
  bulkUpdateEnvs,
  deleteEnv,
  fetchDatabaseBackups,
  createDatabaseBackup,
  updateDatabaseBackup,
  deleteDatabaseBackup,
  fetchBackupExecutions,
} from '../../api/client.js';
import { ManifestManager } from '../../utils/manifest.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockDatabase = {
  uuid: 'db-uuid-1',
  name: 'postgres',
  type: 'postgresql',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  server: { name: 'srv-2', uuid: 'srv-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
  password: 'db-secret-password',
  internal_db_url: 'postgres://user:db-secret@internal:5432/db',
  external_db_url: 'postgres://user:db-secret@external:5432/db',
};

describe('databaseActionSchema', () => {
  it('accepts get action with uuid only per D-02', () => {
    expect(
      databaseActionSchema.safeParse({
        action: 'get',
        uuid: 'db-uuid-1',
      }).success,
    ).toBe(true);
  });

  it('accepts get action with name only', () => {
    expect(
      databaseActionSchema.safeParse({
        action: 'get',
        name: 'mcp-uat-test-db',
      }).success,
    ).toBe(true);
  });

  it('rejects get action with neither uuid nor name', () => {
    expect(
      databaseActionSchema.safeParse({
        action: 'get',
      }).success,
    ).toBe(false);
  });

  it('rejects list action', () => {
    expect(
      databaseActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(false);
  });
});

describe('handleDatabaseAction get', () => {
  beforeEach(() => {
    vi.mocked(fetchDatabase).mockReset();
    vi.mocked(fetchDatabase).mockResolvedValue(mockDatabase);
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('returns summary projection by default', async () => {
    const result = await handleDatabaseAction(
      { action: 'get', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'db-uuid-1',
      name: 'postgres',
      type: 'postgresql',
      status: 'running:healthy',
      project_name: 'proj-b',
      server_name: 'srv-2',
    });
    expect(result._formattedText).toBeTruthy();
  });

  it('returns sanitized full projection with include_full alias', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'get',
        uuid: 'db-uuid-1',
        include_full: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.password).toBe('***');
    expect(data.internal_db_url).toBe('***');
    expect(data.external_db_url).toBe('***');
  });

  it('rejects format table on full projection per D-11', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'get',
        uuid: 'db-uuid-1',
        projection: 'full',
        format: 'table',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(fetchDatabase).not.toHaveBeenCalled();
  });

  it('includes start hint for stopped database per OUT-06 D-16', async () => {
    vi.mocked(fetchDatabase).mockResolvedValue({
      ...mockDatabase,
      status: 'exited:0',
    });

    const result = await handleDatabaseAction(
      { action: 'get', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.hints)).toBe(true);
    const hints = data.hints as Array<Record<string, unknown>>;
    expect(hints.some((h) => h.action === 'start' && h.available_in_phase === 5)).toBe(
      true,
    );
    expect(result.data).toMatchObject({
      uuid: 'db-uuid-1',
      name: 'postgres',
    });
  });

  it('returns empty hints for healthy running database', async () => {
    const result = await handleDatabaseAction(
      { action: 'get', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.hints).toEqual([]);
  });

  it('get by name single-hit resolves uuid and returns summary', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceDatabase1]);

    const result = await handleDatabaseAction(
      { action: 'get', name: 'postgres' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(fetchDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.data).toMatchObject({
      uuid: 'db-uuid-1',
      name: 'postgres',
    });
  });

  it('get by name zero-match returns COOLIFY_404', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceDatabase1]);

    const result = await handleDatabaseAction(
      { action: 'get', name: 'nope' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    expect(fetchDatabase).not.toHaveBeenCalled();
  });
});

describe('handleDatabaseAction get reveal (OUT-02)', () => {
  beforeEach(() => {
    vi.mocked(fetchDatabase).mockReset();
    vi.mocked(fetchDatabase).mockResolvedValue({
      ...mockDatabase,
      password: 'pg-pw',
    });
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('masks secrets on full projection when reveal is false', async () => {
    const result = await handleDatabaseAction(
      { action: 'get', uuid: 'db-uuid-1', projection: 'full' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.password).toBe('***');
  });

  it('returns plaintext secrets on full projection when reveal is true', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'get',
        uuid: 'db-uuid-1',
        projection: 'full',
        reveal: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.password).toBe('pg-pw');
    expect(data.internal_db_url).toBe(
      'postgres://user:db-secret@internal:5432/db',
    );
    expect(data.external_db_url).toBe(
      'postgres://user:db-secret@external:5432/db',
    );
  });
});

const mockResourceDatabase1 = {
  uuid: 'db-uuid-1',
  type: 'standalone-postgresql',
  name: 'postgres',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceDatabase2 = {
  uuid: 'db-uuid-2',
  type: 'standalone-redis',
  name: 'postgres-staging',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

describe('handleDatabaseAction lifecycle mutations (SVC-03)', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerDatabaseStart).mockReset();
    vi.mocked(triggerDatabaseStop).mockReset();
    vi.mocked(triggerDatabaseRestart).mockReset();
    vi.mocked(triggerDatabaseStart).mockResolvedValue({
      message: 'Database started.',
    });
    vi.mocked(triggerDatabaseStop).mockResolvedValue({
      message: 'Database stopped.',
    });
    vi.mocked(triggerDatabaseRestart).mockResolvedValue({
      message: 'Database restarting request queued.',
    });
  });

  it('start by uuid calls triggerDatabaseStart with correct uuid', async () => {
    const result = await handleDatabaseAction(
      { action: 'start', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(triggerDatabaseStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name single-hit resolves and calls triggerDatabaseStart', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceDatabase1]);

    const result = await handleDatabaseAction(
      { action: 'start', name: 'postgres' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(triggerDatabaseStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('stop by name single-hit calls triggerDatabaseStop', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceDatabase1]);

    const result = await handleDatabaseAction(
      { action: 'stop', name: 'postgres' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(triggerDatabaseStop).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('restart by name single-hit calls triggerDatabaseRestart with no latest param', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceDatabase1]);

    const result = await handleDatabaseAction(
      { action: 'restart', name: 'postgres' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(triggerDatabaseRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH with project+env context', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabase1,
      mockResourceDatabase2,
    ]);

    const result = await handleDatabaseAction(
      { action: 'start', name: 'postgres' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    const hints = result.structuredContent.error.recoveryHints.join(' ');
    expect(hints).toContain('postgres');
    expect(hints).toContain('db-uuid-1');
    expect(hints).toContain('project=proj-a');
    expect(hints).toContain('environment=production');
    expect(hints).toContain('project=proj-b');
    expect(hints).toContain('environment=staging');
    expect(triggerDatabaseStart).not.toHaveBeenCalled();
  });

  it('zero-match returns COOLIFY_404', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceDatabase1]);

    const result = await handleDatabaseAction(
      { action: 'start', name: 'nope' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    expect(triggerDatabaseStart).not.toHaveBeenCalled();
  });

  it('restart rejects pull_latest param per D-16/D-18', () => {
    expect(
      databaseActionSchema.safeParse({
        action: 'restart',
        uuid: 'db-uuid-1',
        pull_latest: true,
      }).success,
    ).toBe(false);
  });

  it('rejects deploy action per D-18', () => {
    expect(
      databaseActionSchema.safeParse({
        action: 'deploy',
        uuid: 'db-uuid-1',
      }).success,
    ).toBe(false);
  });
});

const baseDatabaseCreateScope = {
  project_uuid: 'proj-uuid-1',
  environment_name: 'production',
  server_uuid: 'srv-uuid-1',
};

const baseDatabaseCreateFields = {
  ...baseDatabaseCreateScope,
  postgres_user: 'postgres',
  postgres_password: 'plain-secret',
  postgres_db: 'appdb',
};

const mockResourceDatabaseDup1 = {
  uuid: 'db-uuid-1',
  type: 'standalone-postgresql',
  name: 'postgres',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceDatabaseDup2 = {
  uuid: 'db-uuid-2',
  type: 'standalone-postgresql',
  name: 'postgres',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

const engineClientMap = {
  postgresql: createPostgresqlDatabase,
  mysql: createMysqlDatabase,
  mariadb: createMariadbDatabase,
  mongodb: createMongodbDatabase,
  redis: createRedisDatabase,
  clickhouse: createClickhouseDatabase,
  dragonfly: createDragonflyDatabase,
  keydb: createKeydbDatabase,
} as const;

describe('database create', () => {
  beforeEach(() => {
    vi.mocked(ManifestManager.autoUpsert).mockReset();
    vi.mocked(ManifestManager.autoRemove).mockReset();
    vi.mocked(ManifestManager.autoUpsert).mockResolvedValue(undefined);
    vi.mocked(ManifestManager.autoRemove).mockResolvedValue(undefined);
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-uuid-1', name: 'production' },
    ]);
    Object.values(engineClientMap).forEach((fn) => fn.mockReset());
    vi.mocked(triggerDatabaseStart).mockReset();
    vi.mocked(triggerDatabaseStart).mockResolvedValue({
      message: 'Database start queued',
    });
    vi.mocked(createPostgresqlDatabase).mockResolvedValue({
      uuid: 'db-new-uuid',
      postgres_password: 'plain-secret',
    });
  });

  it('creates postgresql database and masks postgres_password unless reveal per DB-01', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(createPostgresqlDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        postgres_user: 'postgres',
        postgres_password: 'plain-secret',
        postgres_db: 'appdb',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.postgres_password).toBe('***');
  });

  it.each([
    ['postgresql', createPostgresqlDatabase],
    ['mysql', createMysqlDatabase],
    ['mariadb', createMariadbDatabase],
    ['mongodb', createMongodbDatabase],
    ['redis', createRedisDatabase],
    ['clickhouse', createClickhouseDatabase],
    ['dragonfly', createDragonflyDatabase],
    ['keydb', createKeydbDatabase],
  ] as const)(
    'dispatches create to correct client for engine %s per DB-01',
    async (engine, clientFn) => {
      vi.mocked(clientFn).mockResolvedValue({ uuid: `db-${engine}-uuid` });

      await handleDatabaseAction(
        {
          action: 'create',
          engine,
          ...baseDatabaseCreateScope,
        },
        testEnv,
      );

      expect(clientFn).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        expect.objectContaining({
          server_uuid: 'srv-uuid-1',
          project_uuid: 'proj-uuid-1',
        }),
        testEnv.COOLIFY_VERIFY_SSL,
      );
    },
  );

  it('defaults instant_deploy to true on create per D-11', async () => {
    await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
      },
      testEnv,
    );

    expect(createPostgresqlDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ instant_deploy: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when is_public:true without confirm per DB-04', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
        is_public: true,
        public_port: 5432,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(result.structuredContent.error.message).toMatch(/database create/);
    expect(createPostgresqlDatabase).not.toHaveBeenCalled();
  });

  it('creates public database when is_public:true and confirm:true per DB-04', async () => {
    await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
        is_public: true,
        public_port: 5432,
        confirm: true,
      },
      testEnv,
    );

    expect(createPostgresqlDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        is_public: true,
        public_port: 5432,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns plaintext postgres_password when reveal:true per SAF-04', async () => {
    vi.mocked(createPostgresqlDatabase).mockResolvedValue({
      uuid: 'db-new-uuid',
      postgres_password: 'plain-secret',
    });

    const result = await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
        reveal: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.postgres_password).toBe('plain-secret');
  });

  it('rejects create with unknown field before API call per SAF-03', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
        unexpected_field: 'foo',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createPostgresqlDatabase).not.toHaveBeenCalled();
  });

  it('rejects create without project_uuid or project_name per D-02', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        environment_name: 'production',
        server_uuid: 'srv-uuid-1',
        postgres_user: 'postgres',
        postgres_password: 'plain-secret',
        postgres_db: 'appdb',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createPostgresqlDatabase).not.toHaveBeenCalled();
  });

  it('surfaces _meta.manifestWarning when autoUpsert fails without failing create', async () => {
    vi.mocked(ManifestManager.autoUpsert).mockRejectedValue(
      new Error('EACCES: permission denied'),
    );

    const result = await handleDatabaseAction(
      {
        action: 'create',
        engine: 'postgresql',
        ...baseDatabaseCreateFields,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ uuid: 'db-new-uuid' });
    expect(result._meta).toMatchObject({
      manifestWarning: expect.stringContaining(
        'Failed to update local manifest cache: EACCES: permission denied',
      ),
    });
  });
});

describe('database update', () => {
  beforeEach(() => {
    vi.mocked(ManifestManager.autoUpsert).mockReset();
    vi.mocked(ManifestManager.autoRemove).mockReset();
    vi.mocked(ManifestManager.autoUpsert).mockResolvedValue(undefined);
    vi.mocked(ManifestManager.autoRemove).mockResolvedValue(undefined);
    vi.mocked(updateDatabase).mockReset();
    vi.mocked(fetchDatabase).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(updateDatabase).mockResolvedValue({
      ...mockDatabase,
      is_public: false,
    });
    vi.mocked(fetchDatabase).mockResolvedValue(mockDatabase);
  });

  it('patches curated fields via updateDatabase per DB-02', async () => {
    await handleDatabaseAction(
      {
        action: 'update',
        uuid: 'db-uuid-1',
        is_public: false,
        public_port: 5432,
      },
      testEnv,
    );

    expect(updateDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      expect.objectContaining({
        is_public: false,
        public_port: 5432,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('includes mongo_initdb_root_password in update PATCH body', async () => {
    await handleDatabaseAction(
      {
        action: 'update',
        uuid: 'db-uuid-1',
        mongo_initdb_root_password: 'rotated-mongo-secret',
      },
      testEnv,
    );

    expect(updateDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      expect.objectContaining({
        mongo_initdb_root_password: 'rotated-mongo-secret',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when enabling is_public without confirm per DB-02', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'update',
        uuid: 'db-uuid-1',
        is_public: true,
        public_port: 5432,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(updateDatabase).not.toHaveBeenCalled();
  });

  it('masks postgres_password on update unless reveal:true per SAF-04', async () => {
    vi.mocked(fetchDatabase).mockResolvedValue({
      ...mockDatabase,
      postgres_password: 'plain-secret',
    });

    const result = await handleDatabaseAction(
      {
        action: 'update',
        uuid: 'db-uuid-1',
        postgres_password: 'plain-secret',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.postgres_password).toBe('***');
  });

  it('rejects unknown update fields via strict schema per SAF-03', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'update',
        uuid: 'db-uuid-1',
        unexpected_field: 'foo',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(updateDatabase).not.toHaveBeenCalled();
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on update by name multi-match per D-18', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      {
        action: 'update',
        name: 'postgres',
        is_public: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(updateDatabase).not.toHaveBeenCalled();
  });
});

describe('database delete', () => {
  beforeEach(() => {
    vi.mocked(ManifestManager.autoUpsert).mockReset();
    vi.mocked(ManifestManager.autoRemove).mockReset();
    vi.mocked(ManifestManager.autoUpsert).mockResolvedValue(undefined);
    vi.mocked(ManifestManager.autoRemove).mockResolvedValue(undefined);
    vi.mocked(deleteDatabase).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(deleteDatabase).mockResolvedValue({ message: 'Database deleted.' });
  });

  it('deletes database when confirm:true with safe defaults per DB-03', async () => {
    const result = await handleDatabaseAction(
      { action: 'delete', uuid: 'db-uuid-1', confirm: true },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(deleteDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      {
        delete_volumes: false,
        delete_configurations: false,
        docker_cleanup: false,
        delete_connected_networks: false,
      },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isDatabaseErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'db-uuid-1' });
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per DB-03', async () => {
    const result = await handleDatabaseAction(
      { action: 'delete', uuid: 'db-uuid-1', confirm: false },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteDatabase).not.toHaveBeenCalled();
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on delete by name multi-match per D-18', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      { action: 'delete', name: 'postgres', confirm: true },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(deleteDatabase).not.toHaveBeenCalled();
  });
});

describe('database delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deleteDatabase).mockReset();
    vi.mocked(fetchDatabase).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchDatabase).mockResolvedValue(mockDatabase);
  });

  it('returns would_delete preview without calling deleteDatabase', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      { uuid: 'child-1', name: 'linked-app', type: 'application' },
    ]);

    const result = await handleDatabaseAction(
      { action: 'delete_preview', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(deleteDatabase).not.toHaveBeenCalled();
    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'db-uuid-1',
      would_delete: true,
    });
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.child_resources)).toBe(true);
  });

  it('includes resources with database_uuid parent link and warning', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'child-1',
        name: 'linked-app',
        type: 'application',
        database_uuid: 'db-uuid-1',
      },
      { uuid: 'other', name: 'unrelated', type: 'application' },
    ]);

    const result = await handleDatabaseAction(
      { action: 'delete_preview', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.child_resources).toEqual([
      { uuid: 'child-1', name: 'linked-app', type: 'application' },
    ]);
    expect(data.warning).toMatch(/child resources/i);
  });
});

const FAKE_DB_SECRET = 'FAKE_DB_SECRET_VALUE';

const mockDatabaseEnv = {
  uuid: 'env-db-uuid-1',
  key: 'POSTGRES_PASSWORD',
  value: FAKE_DB_SECRET,
  is_literal: true,
  is_multiline: false,
  is_shown_once: false,
};

const mockDatabaseEnvList = [mockDatabaseEnv];

function databaseResponseIncludesAskHumanReveal(payload: unknown): boolean {
  return JSON.stringify(payload).includes('ask_human_reveal');
}

describe('database envs:list', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvs).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchEnvs).mockResolvedValue(mockDatabaseEnvList);
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('returns masked env summaries by default per D-14', async () => {
    const result = await handleDatabaseAction(
      { action: 'envs:list', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Array<Record<string, unknown>>;
    expect(data[0]?.value).toBe('***');
    expect(JSON.stringify(data)).not.toContain(FAKE_DB_SECRET);
  });

  it('surfaces ask_human_reveal recovery hint when reveal:true per D-15', async () => {
    const result = await handleDatabaseAction(
      { action: 'envs:list', uuid: 'db-uuid-1', reveal: true },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(databaseResponseIncludesAskHumanReveal(result)).toBe(true);
  });
});

describe('database envs:get', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvs).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchEnvs).mockResolvedValue(mockDatabaseEnvList);
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('returns single env by env_uuid with masked value', async () => {
    const result = await handleDatabaseAction(
      { action: 'envs:get', uuid: 'db-uuid-1', env_uuid: 'env-db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.value).toBe('***');
  });

  it('returns single env by key with masked value', async () => {
    const result = await handleDatabaseAction(
      { action: 'envs:get', uuid: 'db-uuid-1', key: 'POSTGRES_PASSWORD' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.key).toBe('POSTGRES_PASSWORD');
    expect(data.value).toBe('***');
  });
});

describe('database envs:create', () => {
  beforeEach(() => {
    vi.mocked(createEnv).mockReset();
    vi.mocked(fetchEnvs).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(createEnv).mockResolvedValue({ uuid: 'env-db-new', key: 'NEW_KEY' });
    vi.mocked(fetchEnvs).mockResolvedValue([
      {
        uuid: 'env-db-new',
        key: 'NEW_KEY',
        value: FAKE_DB_SECRET,
        is_literal: true,
        is_multiline: true,
        is_shown_once: false,
      },
    ]);
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('accepts three supported flags and round-trips via envs:get per ENV-06 D-16', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:create',
        uuid: 'db-uuid-1',
        key: 'NEW_KEY',
        value: FAKE_DB_SECRET,
        is_literal: true,
        is_multiline: true,
        is_shown_once: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    const getResult = await handleDatabaseAction(
      {
        action: 'envs:get',
        uuid: 'db-uuid-1',
        env_uuid: 'env-db-new',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(getResult)).toBe(false);
    if (isDatabaseErrorResult(getResult)) return;

    expect(getResult.data).toMatchObject({
      is_literal: true,
      is_multiline: true,
      is_shown_once: false,
    });
  });

  it('rejects is_preview with COOLIFY_VALIDATION_ERROR per D-16 Pitfall 1', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:create',
        uuid: 'db-uuid-1',
        key: 'NEW_KEY',
        value: FAKE_DB_SECRET,
        is_preview: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createEnv).not.toHaveBeenCalled();
  });
});

describe('database envs:update', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvs).mockReset();
    vi.mocked(updateEnvViaBulk).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchEnvs).mockResolvedValue(mockDatabaseEnvList);
    vi.mocked(updateEnvViaBulk).mockResolvedValue({ updated: 1 });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('resolves key from env_uuid then bulk-patches one element', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:update',
        uuid: 'db-uuid-1',
        env_uuid: 'env-db-uuid-1',
        value: 'updated',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(updateEnvViaBulk).toHaveBeenCalled();
  });

  it('rejects is_preview with COOLIFY_VALIDATION_ERROR per D-16', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:update',
        uuid: 'db-uuid-1',
        env_uuid: 'env-db-uuid-1',
        value: 'updated',
        is_preview: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(updateEnvViaBulk).not.toHaveBeenCalled();
  });
});

describe('database envs:delete', () => {
  beforeEach(() => {
    vi.mocked(deleteEnv).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(deleteEnv).mockResolvedValue({ deleted: true });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('throws COOLIFY_CONFIRM_REQUIRED without confirm per D-13', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:delete',
        uuid: 'db-uuid-1',
        env_uuid: 'env-db-uuid-1',
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteEnv).not.toHaveBeenCalled();
  });
});

describe('database envs:bulk-update', () => {
  beforeEach(() => {
    vi.mocked(bulkUpdateEnvs).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(bulkUpdateEnvs).mockResolvedValue({ updated: 1 });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('applies entries when confirm:true per D-11', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:bulk-update',
        uuid: 'db-uuid-1',
        entries: [{ key: 'A', value: '1' }],
        confirm: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(bulkUpdateEnvs).toHaveBeenCalled();
  });

  it('rejects is_preview in any entry with COOLIFY_VALIDATION_ERROR per D-16', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'envs:bulk-update',
        uuid: 'db-uuid-1',
        entries: [{ key: 'A', value: '1', is_preview: true }],
        confirm: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(bulkUpdateEnvs).not.toHaveBeenCalled();
  });
});

const FAKE_S3_SECRET = 'FAKE_S3_SECRET_VALUE';

const mockBackupSchedule = {
  uuid: 'backup-sched-uuid-1',
  frequency: 'daily',
  enabled: true,
  save_s3: true,
  s3_storage_uuid: 's3-dest-uuid-1',
  secret_key: FAKE_S3_SECRET,
  database_backup_retention_amount_locally: 7,
  database_backup_retention_days_locally: 30,
};

const mockBackupScheduleList = [mockBackupSchedule];

const mockBackupExecutions = {
  executions: [
    {
      uuid: 'exec-uuid-1',
      filename: 'backup-2026-07-21.sql',
      size: 1024,
      created_at: '2026-07-21T00:00:00Z',
      status: 'finished',
      message: 'Backup completed.',
    },
  ],
};

describe('database backup:create', () => {
  beforeEach(() => {
    vi.mocked(createDatabaseBackup).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(createDatabaseBackup).mockResolvedValue({
      uuid: 'backup-sched-uuid-1',
      message: 'Backup schedule created.',
      ...mockBackupSchedule,
    });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('creates backup with daily preset and masks S3 credentials per D-15', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:create',
        uuid: 'db-uuid-1',
        frequency: 'daily',
        save_s3: true,
        s3_storage_uuid: 's3-dest-uuid-1',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(createDatabaseBackup).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      expect.objectContaining({
        frequency: 'daily',
        save_s3: true,
        s3_storage_uuid: 's3-dest-uuid-1',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );

    const data = result.data as Record<string, unknown>;
    expect(data.uuid).toBe('backup-sched-uuid-1');
    expect(data.secret_key).toBe('***');
    expect(JSON.stringify(data)).not.toContain(FAKE_S3_SECRET);
  });

  it('accepts cron expression frequency on create per D-04', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:create',
        uuid: 'db-uuid-1',
        frequency: '0 12 * * *',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(createDatabaseBackup).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      expect.objectContaining({ frequency: '0 12 * * *' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('throws COOLIFY_VALIDATION_ERROR when save_s3:true without s3_storage_uuid per D-06', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:create',
        uuid: 'db-uuid-1',
        frequency: 'daily',
        save_s3: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createDatabaseBackup).not.toHaveBeenCalled();
  });

  it('supports backup_now:true on create per D-07', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:create',
        uuid: 'db-uuid-1',
        frequency: 'daily',
        backup_now: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(createDatabaseBackup).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      expect.objectContaining({ frequency: 'daily', backup_now: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('does not require confirm per D-10', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:create',
        uuid: 'db-uuid-1',
        frequency: 'daily',
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on create by name multi-match per D-03', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      {
        action: 'backup:create',
        name: 'postgres',
        frequency: 'daily',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(createDatabaseBackup).not.toHaveBeenCalled();
  });
});

describe('database backup:list', () => {
  beforeEach(() => {
    vi.mocked(fetchDatabaseBackups).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchDatabaseBackups).mockResolvedValue(mockBackupScheduleList);
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('returns masked backup schedule summaries by default per D-15', async () => {
    const result = await handleDatabaseAction(
      { action: 'backup:list', uuid: 'db-uuid-1' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(fetchDatabaseBackups).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );

    const data = result.data as Array<Record<string, unknown>>;
    expect(data[0]?.secret_key).toBe('***');
    expect(data[0]?.frequency).toBe('daily');
    expect(JSON.stringify(data)).not.toContain(FAKE_S3_SECRET);
  });

  it('surfaces ask_human_reveal recovery hint when reveal:true per D-16', async () => {
    const result = await handleDatabaseAction(
      { action: 'backup:list', uuid: 'db-uuid-1', reveal: true },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(databaseResponseIncludesAskHumanReveal(result)).toBe(true);
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on list by name multi-match per D-03', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      { action: 'backup:list', name: 'postgres' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(fetchDatabaseBackups).not.toHaveBeenCalled();
  });
});

describe('database backup:update', () => {
  beforeEach(() => {
    vi.mocked(updateDatabaseBackup).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(updateDatabaseBackup).mockResolvedValue({
      message: 'Backup schedule updated.',
    });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('updates backup with hourly preset per D-04', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:update',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        frequency: 'hourly',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(updateDatabaseBackup).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      'backup-sched-uuid-1',
      expect.objectContaining({ frequency: 'hourly' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('rejects cron expression frequency with COOLIFY_VALIDATION_ERROR per Pitfall 1', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:update',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        frequency: '0 12 * * *',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(updateDatabaseBackup).not.toHaveBeenCalled();
  });

  it('does not require confirm per D-10', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:update',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        frequency: 'daily',
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on update by name multi-match per D-03', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      {
        action: 'backup:update',
        name: 'postgres',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        frequency: 'daily',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(updateDatabaseBackup).not.toHaveBeenCalled();
  });
});

describe('database backup:delete', () => {
  beforeEach(() => {
    vi.mocked(deleteDatabaseBackup).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(deleteDatabaseBackup).mockResolvedValue({
      message: 'Backup schedule deleted.',
    });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('throws COOLIFY_CONFIRM_REQUIRED without confirm per D-08', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:delete',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteDatabaseBackup).not.toHaveBeenCalled();
  });

  it('deletes backup with confirm:true and delete_s3 defaults false per D-09', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:delete',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        confirm: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(deleteDatabaseBackup).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      'backup-sched-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isDatabaseErrorResult(result)) return;

    expect(result.data).toMatchObject({
      ok: true,
      scheduled_backup_uuid: 'backup-sched-uuid-1',
      delete_s3: false,
    });
  });

  it('throws COOLIFY_CONFIRM_REQUIRED when delete_s3:true without confirm per D-09', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:delete',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        delete_s3: true,
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteDatabaseBackup).not.toHaveBeenCalled();
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on delete by name multi-match per D-03', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      {
        action: 'backup:delete',
        name: 'postgres',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        confirm: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(deleteDatabaseBackup).not.toHaveBeenCalled();
  });
});

describe('database backup:now', () => {
  beforeEach(() => {
    vi.mocked(updateDatabaseBackup).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(updateDatabaseBackup).mockResolvedValue({
      message: 'Backup triggered.',
      uuid: 'exec-uuid-1',
    });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('requires parent DB identity and scheduled_backup_uuid per D-13', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:now',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(updateDatabaseBackup).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      'backup-sched-uuid-1',
      { backup_now: true },
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('PATCHes with backup_now:true per D-12', async () => {
    await handleDatabaseAction(
      {
        action: 'backup:now',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
      },
      testEnv,
    );

    expect(updateDatabaseBackup).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'db-uuid-1',
      'backup-sched-uuid-1',
      { backup_now: true },
      expect.any(Boolean),
    );
  });

  it('does not require confirm per D-10', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:now',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on now by name multi-match per D-03', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      {
        action: 'backup:now',
        name: 'postgres',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(updateDatabaseBackup).not.toHaveBeenCalled();
  });
});

describe('database backup:history', () => {
  beforeEach(() => {
    vi.mocked(fetchBackupExecutions).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchBackupExecutions).mockResolvedValue(mockBackupExecutions);
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('returns executions with status, timestamps, and size per D-14', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:history',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(fetchBackupExecutions).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      'backup-sched-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );

    const data = result.data as { executions: Array<Record<string, unknown>> };
    expect(data.executions[0]).toMatchObject({
      status: 'finished',
      size: 1024,
      created_at: '2026-07-21T00:00:00Z',
    });
  });

  it('surfaces ask_human_reveal recovery hint when reveal:true per D-16', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:history',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        reveal: true,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(databaseResponseIncludesAskHumanReveal(result)).toBe(true);
  });

  it('does not require confirm per D-10', async () => {
    const result = await handleDatabaseAction(
      {
        action: 'backup:history',
        uuid: 'db-uuid-1',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
        confirm: false,
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on history by name multi-match per D-03', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceDatabaseDup1,
      mockResourceDatabaseDup2,
    ]);

    const result = await handleDatabaseAction(
      {
        action: 'backup:history',
        name: 'postgres',
        scheduled_backup_uuid: 'backup-sched-uuid-1',
      },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(true);
    if (!isDatabaseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(fetchBackupExecutions).not.toHaveBeenCalled();
  });
});
