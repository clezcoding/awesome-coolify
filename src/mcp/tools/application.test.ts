import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applicationActionSchema,
  handleApplicationAction,
  isApplicationErrorResult,
} from './application.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchApplication: vi.fn(),
}));

import { fetchApplication } from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockApplication = {
  uuid: 'app-uuid-1',
  name: 'my-app',
  status: 'running:healthy',
  fqdn: 'https://app.example.com',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  server: { name: 'srv-1', uuid: 'srv-uuid-1' },
  destination: { uuid: 'dest-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  env: { DATABASE_PASSWORD: 'super-secret' },
};

describe('applicationActionSchema', () => {
  it('accepts get action with uuid and shared read params', () => {
    expect(
      applicationActionSchema.safeParse({
        action: 'get',
        uuid: 'app-uuid-1',
      }).success,
    ).toBe(true);
  });

  it('rejects list action per D-02 get-only domain tools', () => {
    expect(
      applicationActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(false);
  });
});

describe('handleApplicationAction get', () => {
  beforeEach(() => {
    vi.mocked(fetchApplication).mockReset();
    vi.mocked(fetchApplication).mockResolvedValue(mockApplication);
  });

  it('returns summary projection by default', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      uuid: 'app-uuid-1',
      name: 'my-app',
      status: 'running:healthy',
      fqdn: 'https://app.example.com',
      project_name: 'proj-a',
      server_name: 'srv-1',
      project_uuid: 'proj-uuid-1',
      server_uuid: 'srv-uuid-1',
      destination_uuid: 'dest-uuid-1',
    });
    expect(result._meta.max_chars).toBe(16000);
    expect(result._formattedText).toBeTruthy();
    expect(fetchApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns sanitized full projection with include_full alias per D-07', async () => {
    const result = await handleApplicationAction(
      {
        action: 'get',
        uuid: 'app-uuid-1',
        include_full: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'app-uuid-1',
      name: 'my-app',
    });
    const data = result.data as Record<string, unknown>;
    const env = data.env as Record<string, unknown>;
    expect(env.DATABASE_PASSWORD).toBe('***');
  });

  it('returns sanitized full projection when projection full', async () => {
    const result = await handleApplicationAction(
      {
        action: 'get',
        uuid: 'app-uuid-1',
        projection: 'full',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    const env = data.env as Record<string, unknown>;
    expect(env.DATABASE_PASSWORD).toBe('***');
  });

  it('rejects format table on full projection with recovery hint per D-11', async () => {
    const result = await handleApplicationAction(
      {
        action: 'get',
        uuid: 'app-uuid-1',
        projection: 'full',
        format: 'table',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(result.structuredContent.error.message).toContain('table');
    expect(result.structuredContent.error.recoveryHints.join(' ')).toContain(
      'pretty',
    );
    expect(fetchApplication).not.toHaveBeenCalled();
  });

  it('includes restart hint for unhealthy application per OUT-06 D-16', async () => {
    vi.mocked(fetchApplication).mockResolvedValue({
      ...mockApplication,
      status: 'unhealthy',
      health_check_status: 'unhealthy',
    });

    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.hints)).toBe(true);
    const hints = data.hints as Array<Record<string, unknown>>;
    expect(hints.some((h) => h.action === 'restart' && h.available_in_phase === 4)).toBe(
      true,
    );
    expect(result.data).toMatchObject({
      uuid: 'app-uuid-1',
      name: 'my-app',
      project_name: 'proj-a',
    });
  });

  it('returns empty hints for healthy running application', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.hints).toEqual([]);
  });

  it('includes hints in full projection per D-16', async () => {
    vi.mocked(fetchApplication).mockResolvedValue({
      ...mockApplication,
      status: 'unhealthy',
    });

    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1', projection: 'full' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.hints)).toBe(true);
    expect((data.hints as unknown[]).length).toBeGreaterThan(0);
  });
});
