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
  triggerDatabaseStart: vi.fn(),
  triggerDatabaseStop: vi.fn(),
  triggerDatabaseRestart: vi.fn(),
}));

import {
  fetchDatabase,
  fetchResources,
  fetchProjects,
  fetchProject,
  triggerDatabaseRestart,
  triggerDatabaseStart,
  triggerDatabaseStop,
} from '../../api/client.js';

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
  });
});

const mockResourceDatabase1 = {
  uuid: 'db-uuid-1',
  type: 'database',
  name: 'postgres',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceDatabase2 = {
  uuid: 'db-uuid-2',
  type: 'database',
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
