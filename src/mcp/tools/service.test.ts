import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleServiceAction,
  isServiceErrorResult,
  serviceActionSchema,
} from './service.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchService: vi.fn(),
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  triggerServiceStart: vi.fn(),
  triggerServiceStop: vi.fn(),
  triggerServiceRestart: vi.fn(),
}));

import {
  fetchService,
  fetchResources,
  fetchProjects,
  fetchProject,
  triggerServiceRestart,
  triggerServiceStart,
  triggerServiceStop,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockService = {
  uuid: 'svc-uuid-1',
  name: 'redis',
  status: 'running:healthy',
  fqdn: 'https://redis.example.com',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  server: { name: 'srv-1', uuid: 'srv-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  env: { REDIS_PASSWORD: 'secret-redis' },
};

describe('serviceActionSchema', () => {
  it('accepts get action with uuid only per D-02', () => {
    expect(
      serviceActionSchema.safeParse({
        action: 'get',
        uuid: 'svc-uuid-1',
      }).success,
    ).toBe(true);
  });

  it('rejects list action', () => {
    expect(
      serviceActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(false);
  });
});

describe('handleServiceAction get', () => {
  beforeEach(() => {
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchService).mockResolvedValue(mockService);
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('returns summary projection by default', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      name: 'redis',
      status: 'running:healthy',
      fqdn: 'https://redis.example.com',
      project_name: 'proj-a',
      server_name: 'srv-1',
    });
    expect(result._formattedText).toBeTruthy();
  });

  it('returns sanitized full projection with include_full alias', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        include_full: true,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    const env = data.env as Record<string, unknown>;
    expect(env.REDIS_PASSWORD).toBe('***');
  });

  it('rejects format table on full projection per D-11', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        projection: 'full',
        format: 'table',
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(fetchService).not.toHaveBeenCalled();
  });

  it('includes restart hint for unhealthy service per OUT-06 D-16', async () => {
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      status: 'unhealthy',
    });

    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.hints)).toBe(true);
    const hints = data.hints as Array<Record<string, unknown>>;
    expect(hints.some((h) => h.action === 'restart' && h.available_in_phase === 5)).toBe(
      true,
    );
    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      name: 'redis',
    });
  });

  it('returns empty hints for healthy running service', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.hints).toEqual([]);
  });
});

describe('handleServiceAction get reveal (OUT-02)', () => {
  beforeEach(() => {
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      token: 'tok-123',
    });
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('masks secrets on full projection when reveal is false', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1', projection: 'full' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.token).toBe('***');
  });

  it('returns plaintext secrets on full projection when reveal is true', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        projection: 'full',
        reveal: true,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.token).toBe('tok-123');
  });
});

const mockResourceService1 = {
  uuid: 'svc-uuid-1',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceService2 = {
  uuid: 'svc-uuid-2',
  type: 'service',
  name: 'redis-staging',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

describe('handleServiceAction lifecycle mutations (SVC-03/SVC-05)', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerServiceStart).mockReset();
    vi.mocked(triggerServiceStop).mockReset();
    vi.mocked(triggerServiceRestart).mockReset();
    vi.mocked(triggerServiceStart).mockResolvedValue({
      message: 'Service starting request queued.',
    });
    vi.mocked(triggerServiceStop).mockResolvedValue({
      message: 'Service stopping request queued.',
    });
    vi.mocked(triggerServiceRestart).mockResolvedValue({
      message: 'Service restarting request queued.',
    });
  });

  it('start by uuid returns fire-and-forget response without deployment_uuid', async () => {
    const result = await handleServiceAction(
      { action: 'start', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toEqual({
      uuid: 'svc-uuid-1',
      action: 'start',
      status: 'requested',
    });
    expect(result.data).not.toHaveProperty('deployment_uuid');
    expect(result.data).not.toHaveProperty('wait');
  });

  it('deploy by uuid returns pull_latest in response without deployment_uuid', async () => {
    const result = await handleServiceAction(
      { action: 'deploy', uuid: 'svc-uuid-1', pull_latest: true },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toEqual({
      uuid: 'svc-uuid-1',
      action: 'deploy',
      status: 'requested',
      pull_latest: true,
    });
    expect(result.data).not.toHaveProperty('deployment_uuid');
    expect(result.data).not.toHaveProperty('wait');
  });

  it('start without identifier fails schema validation', () => {
    expect(serviceActionSchema.safeParse({ action: 'start' }).success).toBe(false);
  });

  it('start by uuid calls triggerServiceStart with correct uuid', async () => {
    const result = await handleServiceAction(
      { action: 'start', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name single-hit resolves and calls triggerServiceStart', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'start', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('stop by name single-hit calls triggerServiceStop', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'stop', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceStop).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('restart by name single-hit calls triggerServiceRestart with latest=false', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'restart', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by uuid with pull_latest=false calls triggerServiceRestart with latest=false', async () => {
    const result = await handleServiceAction(
      { action: 'deploy', uuid: 'svc-uuid-1', pull_latest: false },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by uuid with pull_latest=true calls triggerServiceRestart with latest=true', async () => {
    const result = await handleServiceAction(
      { action: 'deploy', uuid: 'svc-uuid-1', pull_latest: true },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      true,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by name single-hit resolves and calls triggerServiceRestart with pull_latest default', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'deploy', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH with project+env context', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceService1,
      mockResourceService2,
    ]);

    const result = await handleServiceAction(
      { action: 'start', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    const hints = result.structuredContent.error.recoveryHints.join(' ');
    expect(hints).toContain('redis');
    expect(hints).toContain('svc-uuid-1');
    expect(hints).toContain('project=proj-a');
    expect(hints).toContain('environment=production');
    expect(hints).toContain('project=proj-b');
    expect(hints).toContain('environment=staging');
    expect(triggerServiceStart).not.toHaveBeenCalled();
  });

  it('zero-match returns COOLIFY_404', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'start', name: 'nope' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    expect(triggerServiceStart).not.toHaveBeenCalled();
  });

  it('restart rejects pull_latest param per D-16', () => {
    expect(
      serviceActionSchema.safeParse({
        action: 'restart',
        uuid: 'svc-uuid-1',
        pull_latest: true,
      }).success,
    ).toBe(false);
  });
});
