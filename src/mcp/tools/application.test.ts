import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applicationActionSchema,
  handleApplicationAction,
  isApplicationErrorResult,
} from './application.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchResources: vi.fn(),
  triggerAppStart: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
}));

import {
  fetchApplication,
  fetchResources,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
} from '../../api/client.js';

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

const mockResourceApp1 = {
  uuid: 'app-uuid-1',
  type: 'application',
  name: 'myapp',
  status: 'running:healthy',
  fqdn: 'https://app.example.com',
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceApp2 = {
  uuid: 'app-uuid-2',
  type: 'application',
  name: 'myapp-staging',
  status: 'running:healthy',
  fqdn: 'https://staging.example.com',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('handleApplicationAction lifecycle mutations (APP-03)', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerAppStart).mockReset();
    vi.mocked(triggerAppStop).mockReset();
    vi.mocked(triggerAppRestart).mockReset();
    vi.mocked(triggerAppStart).mockResolvedValue({ message: 'started' });
    vi.mocked(triggerAppStop).mockResolvedValue({ message: 'stopped' });
    vi.mocked(triggerAppRestart).mockResolvedValue({ message: 'restarted' });
  });

  it('start by uuid calls triggerAppStart with correct uuid', async () => {
    const result = await handleApplicationAction(
      { action: 'start', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(triggerAppStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name single-hit resolves and calls triggerAppStart', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    const result = await handleApplicationAction(
      { action: 'start', name: 'myapp' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(triggerAppStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('stop by name single-hit calls triggerAppStop', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    const result = await handleApplicationAction(
      { action: 'stop', name: 'myapp' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(triggerAppStop).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('restart by fqdn single-hit calls triggerAppRestart', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    const result = await handleApplicationAction(
      { action: 'restart', fqdn: 'example.com' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(triggerAppRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH without mutation', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceApp1,
      mockResourceApp2,
    ]);

    const result = await handleApplicationAction(
      { action: 'start', name: 'app' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    const hints = result.structuredContent.error.recoveryHints.join(' ');
    expect(hints).toContain('myapp');
    expect(hints).toContain('app-uuid-1');
    expect(triggerAppStart).not.toHaveBeenCalled();
  });

  it('start zero-match returns COOLIFY_404', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    const result = await handleApplicationAction(
      { action: 'start', name: 'nope' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    expect(triggerAppStart).not.toHaveBeenCalled();
  });

  it('restart rejects force param per D-22', () => {
    const parsed = applicationActionSchema.safeParse({
      action: 'restart',
      uuid: 'app-uuid-1',
      force: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('start with no identifier fails Zod parse with COOLIFY_422', () => {
    const parsed = applicationActionSchema.safeParse({ action: 'start' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find(
      (i) => (i as { params?: { code?: string } }).params?.code === 'COOLIFY_422',
    );
    expect(issue).toBeDefined();
  });
});
