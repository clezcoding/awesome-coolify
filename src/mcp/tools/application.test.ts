import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applicationActionSchema,
  handleApplicationAction,
  isApplicationErrorResult,
} from './application.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchApplicationLogs: vi.fn(),
  fetchResources: vi.fn(),
  triggerAppStart: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
  triggerDeploy: vi.fn(),
  fetchDeployment: vi.fn(),
}));

import {
  fetchApplication,
  fetchApplicationLogs,
  fetchResources,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
  triggerDeploy,
  fetchDeployment,
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

const mockDeployResponse = {
  deployments: [
    {
      deployment_uuid: 'dep-uuid-1',
      resource_uuid: 'app-uuid-1',
      message: 'queued',
    },
  ],
};

describe('handleApplicationAction deploy (APP-04/05/06, DEP-01/03)', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(triggerDeploy).mockResolvedValue(mockDeployResponse);
  });

  it('deploy by uuid calls triggerDeploy with force=false', async () => {
    const result = await handleApplicationAction(
      { action: 'deploy', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(triggerDeploy).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );

    if (isApplicationErrorResult(result)) return;
    expect(result.ok).toBe(true);
    expect(result.data.deployment_uuid).toBe('dep-uuid-1');
    expect(result.data.status).toBe('queued');
    expect(result.data.logs_available).toEqual({
      tool: 'application',
      action: 'logs',
      args: { deployment_uuid: 'dep-uuid-1' },
      label: 'View build logs',
      available_in_phase: 5,
    });
    expect(result.data).not.toHaveProperty('logs');
  });

  it('deploy with force=true passes force to triggerDeploy', async () => {
    await handleApplicationAction(
      { action: 'deploy', uuid: 'app-uuid-1', force: true },
      testEnv,
    );

    expect(triggerDeploy).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      true,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by name single-hit resolves uuid and calls triggerDeploy', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    await handleApplicationAction(
      { action: 'deploy', name: 'myapp' },
      testEnv,
    );

    expect(triggerDeploy).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH without triggerDeploy', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceApp1,
      mockResourceApp2,
    ]);

    const result = await handleApplicationAction(
      { action: 'deploy', name: 'app' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(triggerDeploy).not.toHaveBeenCalled();
  });

  it('wait:true returns finished status when fetchDeployment terminal on first poll', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-uuid-1',
      git_commit_sha: 'abc123',
      status: 'finished',
      created_at: '2026-07-01T00:00:00Z',
      finished_at: '2026-07-01T00:05:00Z',
    });

    const resultPromise = handleApplicationAction(
      { action: 'deploy', uuid: 'app-uuid-1', wait: true, timeout: 10 },
      testEnv,
    );

    const result = await resultPromise;

    vi.useRealTimers();

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.data.status).toBe('finished');
    expect(result.data.finished_at).toBe('2026-07-01T00:05:00Z');
    expect(result.data.logs_available.action).toBe('logs');
    expect(result.data.logs_available.available_in_phase).toBe(5);
    expect(result.data).not.toHaveProperty('logs');
  });

  it('wait:true timeout returns status timeout with re-call hint', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-uuid-1',
      status: 'in_progress',
    });

    const resultPromise = handleApplicationAction(
      { action: 'deploy', uuid: 'app-uuid-1', wait: true, timeout: 10 },
      testEnv,
    );

    await vi.runAllTimersAsync();

    const result = await resultPromise;

    vi.useRealTimers();

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.data.status).toBe('timeout');
    expect(result.data.hint).toContain('deployment.get');
    expect(result.data.hint).toContain('dep-uuid-1');
    expect(result.data.logs_available).toBeDefined();
  });

  it('deploy with no identifier fails Zod parse with COOLIFY_422', () => {
    const parsed = applicationActionSchema.safeParse({ action: 'deploy' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find(
      (i) => (i as { params?: { code?: string } }).params?.code === 'COOLIFY_422',
    );
    expect(issue).toBeDefined();
  });

  it('timeout:9999 fails Zod parse at max 1800', () => {
    const parsed = applicationActionSchema.safeParse({
      action: 'deploy',
      uuid: 'app-uuid-1',
      timeout: 9999,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('handleApplicationAction batch deploy (DEP-02/03)', () => {
  const mockDeployResponseFor = (deploymentUuid: string, appUuid: string) => ({
    deployments: [
      {
        deployment_uuid: deploymentUuid,
        resource_uuid: appUuid,
        message: 'queued',
      },
    ],
  });

  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) =>
      mockDeployResponseFor(`dep-${uuid}`, uuid),
    );
  });

  it('deploy uuids array calls triggerDeploy per uuid with queued results', async () => {
    const result = await handleApplicationAction(
      { action: 'deploy', uuids: ['a', 'b'] },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).toHaveBeenCalledTimes(2);
    expect(triggerDeploy).toHaveBeenNthCalledWith(
      1,
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'a',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(triggerDeploy).toHaveBeenNthCalledWith(
      2,
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'b',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );

    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results).toHaveLength(2);
    expect(data.results[0]).toMatchObject({
      uuid: 'a',
      status: 'queued',
      deployment_uuid: 'dep-a',
    });
    expect(data.results[1]).toMatchObject({
      uuid: 'b',
      status: 'queued',
      deployment_uuid: 'dep-b',
    });
    for (const entry of data.results) {
      expect(entry.logs_available).toEqual({
        tool: 'application',
        action: 'logs',
        args: { deployment_uuid: entry.deployment_uuid },
        label: 'View build logs',
        available_in_phase: 5,
      });
    }
  });

  it('deploy tags array resolves and deploys matching apps', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-web-1',
        type: 'application',
        name: 'web-1',
        tags: ['web'],
      },
      {
        uuid: 'app-web-2',
        type: 'application',
        name: 'web-2',
        tags: ['web', 'api'],
      },
      {
        uuid: 'app-api-1',
        type: 'application',
        name: 'api-1',
        tags: ['api'],
      },
    ]);

    const result = await handleApplicationAction(
      { action: 'deploy', tags: ['web'] },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).toHaveBeenCalledTimes(2);
    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results).toHaveLength(2);
    const uuids = data.results.map((r) => r.uuid);
    expect(uuids).toContain('app-web-1');
    expect(uuids).toContain('app-web-2');
  });

  it('deploy uuids and tags dedup when uuid also matches tag', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'a',
        type: 'application',
        name: 'app-a',
        tags: ['web'],
      },
      {
        uuid: 'b',
        type: 'application',
        name: 'app-b',
        tags: ['web'],
      },
    ]);

    const result = await handleApplicationAction(
      { action: 'deploy', uuids: ['a'], tags: ['web'] },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).toHaveBeenCalledTimes(2);
    const data = result.data as { results: Array<Record<string, unknown>> };
    const uuids = data.results.map((r) => r.uuid);
    expect(new Set(uuids).size).toBe(2);
    expect(uuids).toContain('a');
    expect(uuids).toContain('b');
  });

  it('deploy single tag field expands to tags array', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-web-1',
        type: 'application',
        name: 'web-1',
        tags: ['web'],
      },
    ]);

    const result = await handleApplicationAction(
      { action: 'deploy', tag: 'web' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).toHaveBeenCalledTimes(1);
    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results[0]).toMatchObject({
      uuid: 'app-web-1',
      status: 'queued',
    });
  });

  it('unmatched tag surfaces failed entry without aborting matched tags', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-web-1',
        type: 'application',
        name: 'web-1',
        tags: ['web'],
      },
    ]);

    const result = await handleApplicationAction(
      { action: 'deploy', tags: ['web', 'nonexistent'] },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).toHaveBeenCalledTimes(1);
    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results).toHaveLength(2);
    expect(data.results[0]).toMatchObject({
      tag: 'nonexistent',
      status: 'failed',
      error: "No applications matched tag 'nonexistent'",
    });
    expect(data.results[1]).toMatchObject({
      uuid: 'app-web-1',
      status: 'queued',
    });
  });

  it('wait:true batch deploys and polls sequentially in input order', async () => {
    vi.useFakeTimers();
    const deployOrder: string[] = [];

    vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) => {
      deployOrder.push(uuid);
      return mockDeployResponseFor(`dep-${uuid}`, uuid);
    });

    vi.mocked(fetchDeployment).mockImplementation(async (_url, _token, depUuid) => ({
      deployment_uuid: depUuid,
      status: 'finished',
      finished_at: '2026-07-01T00:05:00Z',
    }));

    const resultPromise = handleApplicationAction(
      { action: 'deploy', uuids: ['a', 'b'], wait: true, timeout: 10 },
      testEnv,
    );

    const result = await resultPromise;
    vi.useRealTimers();

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(deployOrder).toEqual(['a', 'b']);
    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results).toHaveLength(2);
    expect(data.results[0]).toMatchObject({ uuid: 'a', status: 'finished' });
    expect(data.results[1]).toMatchObject({ uuid: 'b', status: 'finished' });
    for (const entry of data.results) {
      expect(entry.logs_available?.available_in_phase).toBe(5);
    }
  });

  it('partial failure on one uuid does not abort others', async () => {
    vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) => {
      if (uuid === 'a') {
        throw new Error('Application not found');
      }
      return mockDeployResponseFor(`dep-${uuid}`, uuid);
    });

    const result = await handleApplicationAction(
      { action: 'deploy', uuids: ['a', 'b'] },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).toHaveBeenCalledTimes(2);
    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results[0]).toMatchObject({
      uuid: 'a',
      status: 'failed',
      error: 'Application not found',
    });
    expect(data.results[1]).toMatchObject({
      uuid: 'b',
      status: 'queued',
      deployment_uuid: 'dep-b',
    });
  });

  it('missing tags field on resources surfaces per-tag error without crash', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-no-tags',
        type: 'application',
        name: 'no-tags',
      },
    ]);

    const result = await handleApplicationAction(
      { action: 'deploy', tags: ['web'] },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(triggerDeploy).not.toHaveBeenCalled();
    const data = result.data as { results: Array<Record<string, unknown>> };
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toMatchObject({
      tag: 'web',
      status: 'failed',
      error: "No applications matched tag 'web'",
    });
  });
});

describe('handleApplicationAction logs (RED)', () => {
  const buildLogsFixture = JSON.stringify([
    { output: 'a', type: 'stdout', hidden: false },
    { output: 'b', type: 'stderr', hidden: true },
    { output: 'c', type: 'stdout', hidden: false },
  ]);

  beforeEach(() => {
    vi.mocked(fetchApplicationLogs).mockReset();
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(fetchResources).mockReset();
  });

  it('runtime logs with uuid calls fetchApplicationLogs and returns logs_lines', async () => {
    vi.mocked(fetchApplicationLogs).mockResolvedValue({
      logs: 'line1\nline2\nline3',
    });

    const result = await handleApplicationAction(
      { action: 'logs', uuid: 'app-uuid-1', lines: 50 },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(fetchApplicationLogs).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      50,
      testEnv.COOLIFY_VERIFY_SSL,
    );
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.logs_lines)).toBe(true);
    expect(typeof data.logs_truncated).toBe('boolean');
    expect(typeof data.total_lines).toBe('number');
  });

  it('build logs with deployment_uuid returns filter metadata shape', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      status: 'finished',
      logs: buildLogsFixture,
    });

    const result = await handleApplicationAction(
      { action: 'logs', deployment_uuid: 'dep-uuid-1' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.deployment_uuid).toBe('dep-uuid-1');
    expect(Array.isArray(data.logs_lines)).toBe(true);
    expect(typeof data.entries_total).toBe('number');
    expect(typeof data.entries_hidden).toBe('number');
    expect(typeof data.entries_shown).toBe('number');
  });

  it('rejects logs with neither uuid nor deployment_uuid', async () => {
    await expect(
      handleApplicationAction({ action: 'logs' }, testEnv),
    ).rejects.toThrow();
  });

  it('rejects logs with both uuid and deployment_uuid', async () => {
    await expect(
      handleApplicationAction(
        { action: 'logs', uuid: 'x', deployment_uuid: 'y' },
        testEnv,
      ),
    ).rejects.toThrow();
  });

  it('multi-match uuid returns COOLIFY_AMBIGUOUS_MATCH without calling fetchApplicationLogs', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      { uuid: 'app-1', type: 'application', name: 'multi' },
      { uuid: 'app-2', type: 'application', name: 'multi-app' },
    ]);

    const result = await handleApplicationAction(
      { action: 'logs', name: 'multi' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(fetchApplicationLogs).not.toHaveBeenCalled();
  });

  it('build logs without logs field returns COOLIFY_403_SENSITIVE_REQUIRED', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({ status: 'finished' });

    const result = await handleApplicationAction(
      { action: 'logs', deployment_uuid: 'dep-no-logs' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe(
      'COOLIFY_403_SENSITIVE_REQUIRED',
    );
    expect(
      result.structuredContent.error.recoveryHints.some((h) =>
        h.includes('api.sensitive'),
      ),
    ).toBe(true);
  });

  it('include_hidden:true includes hidden entries in build logs', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      status: 'finished',
      logs: buildLogsFixture,
    });

    const result = await handleApplicationAction(
      {
        action: 'logs',
        deployment_uuid: 'dep-uuid-1',
        include_hidden: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.entries_shown).toBe(3);
    expect(data.logs_lines).toEqual(['a', 'b', 'c']);
  });

  it('type stderr filters build logs to stderr entries only', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      status: 'finished',
      logs: buildLogsFixture,
    });

    const result = await handleApplicationAction(
      {
        action: 'logs',
        deployment_uuid: 'dep-uuid-1',
        type: 'stderr',
        include_hidden: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.logs_lines).toEqual(['b']);
    expect(data.entries_shown).toBe(1);
  });

  it('max_chars cap sets logs_truncated on runtime logs', async () => {
    vi.mocked(fetchApplicationLogs).mockResolvedValue({
      logs: 'x'.repeat(30000),
    });

    const result = await handleApplicationAction(
      { action: 'logs', uuid: 'app-uuid-1', max_chars: 20000 },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.logs_truncated).toBe(true);
  });
});
