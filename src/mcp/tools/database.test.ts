import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  databaseActionSchema,
  handleDatabaseAction,
  isDatabaseErrorResult,
} from './database.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchDatabase: vi.fn(),
}));

import { fetchDatabase } from '../../api/client.js';

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
});
