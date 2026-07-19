import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applicationActionSchema,
  applicationLogsSchema,
  handleApplicationAction,
  isApplicationErrorResult,
} from './application.js';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

vi.mock('../../api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchApplicationLogs: vi.fn(),
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  triggerAppStart: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
  triggerDeploy: vi.fn(),
  fetchDeployment: vi.fn(),
  createPublicApplication: vi.fn(),
  createPrivateGithubAppApplication: vi.fn(),
  createPrivateDeployKeyApplication: vi.fn(),
  createDockerfileApplication: vi.fn(),
  createDockerimageApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));

import {
  fetchApplication,
  fetchApplicationLogs,
  fetchResources,
  fetchProjects,
  fetchProject,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
  triggerDeploy,
  fetchDeployment,
  createPublicApplication,
  createPrivateGithubAppApplication,
  createPrivateDeployKeyApplication,
  createDockerfileApplication,
  createDockerimageApplication,
  updateApplication,
  deleteApplication,
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
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
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

  it('resolves project_name from environment_id for Coolify 4.1.x payloads', async () => {
    vi.mocked(fetchApplication).mockResolvedValue({
      uuid: 'app-41x',
      name: 'mcp-uat-nginx',
      status: 'running:healthy',
      environment_id: 22,
      updated_at: '2026-07-01T00:00:00Z',
    });
    vi.mocked(fetchProjects).mockResolvedValue([
      {
        uuid: 'h785essygwr360newm83inz6',
        name: 'MCP UAT Test',
        environments: [{ id: 22, name: 'production' }],
      },
    ]);

    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-41x' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({
      project_name: 'MCP UAT Test',
      project_uuid: 'h785essygwr360newm83inz6',
    });
    expect(result.data.project_name).not.toBe('default');
  });
});

describe('handleApplicationAction get reveal (OUT-02)', () => {
  beforeEach(() => {
    vi.mocked(fetchApplication).mockReset();
    vi.mocked(fetchApplication).mockResolvedValue({
      ...mockApplication,
      password: 'hunter2',
    });
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('masks secrets on full projection when reveal is false (default)', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1', projection: 'full' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.password).toBe('***');
  });

  it('returns plaintext secrets on full projection when reveal is true', async () => {
    const result = await handleApplicationAction(
      {
        action: 'get',
        uuid: 'app-uuid-1',
        projection: 'full',
        reveal: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.password).toBe('hunter2');
  });

  it('omits raw secret fields on summary projection even when reveal is true', async () => {
    const result = await handleApplicationAction(
      {
        action: 'get',
        uuid: 'app-uuid-1',
        projection: 'summary',
        reveal: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('env');
  });

  it('redacts error messages even when reveal is true', async () => {
    vi.mocked(fetchApplication).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_401',
        message: 'Unauthorized password=hunter2-leak',
        recoveryHints: ['Verify token secret=leak-value'],
        httpStatus: 401,
      }),
    );

    const result = await handleApplicationAction(
      {
        action: 'get',
        uuid: 'app-uuid-1',
        projection: 'full',
        reveal: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    const errorText = result.content[0].text;
    expect(errorText).toContain('COOLIFY_401');
    expect(errorText).not.toContain('hunter2-leak');
    expect(errorText).not.toContain('leak-value');
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

describe('handleApplicationAction logs', () => {
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

  it('runtime logs default lines=100 when omitted', async () => {
    vi.mocked(fetchApplicationLogs).mockResolvedValue({ logs: 'a\nb' });

    await handleApplicationAction(
      { action: 'logs', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(fetchApplicationLogs).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      100,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('build logs default include_hidden:false filters hidden entries', async () => {
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
    expect(data.logs_lines).toEqual(['a', 'c']);
    expect(data.entries_total).toBe(3);
    expect(data.entries_hidden).toBe(1);
    expect(data.entries_shown).toBe(2);
  });

  it('applicationLogsSchema rejects follow param with unrecognized_keys', () => {
    const result = applicationLogsSchema.safeParse({
      action: 'logs',
      uuid: 'x',
      follow: true,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.code).toBe('unrecognized_keys');
  });

  it('build logs plain string fallback slices without throw', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      status: 'finished',
      logs: 'plain line one\nplain line two',
    });

    const result = await handleApplicationAction(
      { action: 'logs', deployment_uuid: 'dep-plain' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.logs_lines).toEqual(['plain line one', 'plain line two']);
  });

  it('build logs applies offset after flatten', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      status: 'finished',
      logs: JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({
          output: `line-${i}`,
          type: 'stdout',
          hidden: false,
        })),
      ),
    });

    const result = await handleApplicationAction(
      {
        action: 'logs',
        deployment_uuid: 'dep-offset',
        offset: 5,
        lines: 20,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.logs_lines).toEqual([
      'line-5',
      'line-6',
      'line-7',
      'line-8',
      'line-9',
    ]);
  });

  it('does not write log line content to stderr or console', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const consoleSpies = ['error', 'log', 'info', 'debug'].map((method) =>
      vi.spyOn(console, method as 'error').mockImplementation(() => undefined),
    );

    vi.mocked(fetchApplicationLogs).mockResolvedValue({
      logs: 'SECRET-LOG-LINE\nmore',
    });

    await handleApplicationAction(
      { action: 'logs', uuid: 'app-uuid-1' },
      testEnv,
    );

    const allCalls = [
      ...stderrSpy.mock.calls,
      ...consoleSpies.flatMap((spy) => spy.mock.calls),
    ];
    for (const call of allCalls) {
      const text = call.map((arg) => String(arg)).join(' ');
      expect(text).not.toContain('SECRET-LOG-LINE');
    }

    stderrSpy.mockRestore();
    consoleSpies.forEach((spy) => spy.mockRestore());
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
    const result = await handleApplicationAction({ action: 'logs' }, testEnv);
    expect(isApplicationErrorResult(result)).toBe(true);
  });

  it('rejects logs with both uuid and deployment_uuid', async () => {
    const result = await handleApplicationAction(
      { action: 'logs', uuid: 'x', deployment_uuid: 'y' },
      testEnv,
    );
    expect(isApplicationErrorResult(result)).toBe(true);
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

const baseCreateFields = {
  project_uuid: 'proj-uuid-1',
  environment_name: 'production',
  server_uuid: 'srv-uuid-1',
};

describe('application create', () => {
  beforeEach(() => {
    vi.mocked(createPublicApplication).mockReset();
    vi.mocked(createPrivateGithubAppApplication).mockReset();
    vi.mocked(createPrivateDeployKeyApplication).mockReset();
    vi.mocked(createDockerfileApplication).mockReset();
    vi.mocked(createDockerimageApplication).mockReset();
    vi.mocked(createPublicApplication).mockResolvedValue({
      uuid: 'app-new-uuid',
      name: 'new-app',
    });
    vi.mocked(createPrivateDeployKeyApplication).mockResolvedValue({
      uuid: 'app-deploy-key-uuid',
    });
    vi.mocked(createPrivateGithubAppApplication).mockResolvedValue({
      uuid: 'app-github-app-uuid',
    });
    vi.mocked(createDockerfileApplication).mockResolvedValue({
      uuid: 'app-dockerfile-uuid',
    });
    vi.mocked(createDockerimageApplication).mockResolvedValue({
      uuid: 'app-dockerimage-uuid',
    });
  });

  it('creates public_git application and calls createPublicApplication per APP-12', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        ...baseCreateFields,
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        project_uuid: 'proj-uuid-1',
        environment_name: 'production',
        server_uuid: 'srv-uuid-1',
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-new-uuid' });
  });

  it('creates private_deploy_key application and calls createPrivateDeployKeyApplication per APP-13', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'private_deploy_key',
        ...baseCreateFields,
        private_key_uuid: 'key-uuid-7',
        git_repository: 'git@github.com:example/private.git',
        git_branch: 'main',
        build_pack: 'nixpacks',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(createPrivateDeployKeyApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        private_key_uuid: 'key-uuid-7',
        server_uuid: 'srv-uuid-1',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-deploy-key-uuid' });
  });

  it('creates private_github_app application and calls createPrivateGithubAppApplication per APP-14', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'private_github_app',
        ...baseCreateFields,
        github_app_uuid: 'gh-app-uuid-1',
        git_repository: 'https://github.com/example/private',
        git_branch: 'main',
        build_pack: 'nixpacks',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(createPrivateGithubAppApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        github_app_uuid: 'gh-app-uuid-1',
        server_uuid: 'srv-uuid-1',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-github-app-uuid' });
  });

  it('creates dockerfile application and calls createDockerfileApplication per APP-15', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'dockerfile',
        ...baseCreateFields,
        dockerfile: 'FROM nginx:alpine',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(createDockerfileApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        dockerfile: 'FROM nginx:alpine',
        server_uuid: 'srv-uuid-1',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-dockerfile-uuid' });
  });

  it('creates dockerimage application and calls createDockerimageApplication per APP-16', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'dockerimage',
        ...baseCreateFields,
        docker_registry_image_name: 'nginx:alpine',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(createDockerimageApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        docker_registry_image_name: 'nginx:alpine',
        server_uuid: 'srv-uuid-1',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-dockerimage-uuid' });
  });

  it('returns deploy queued status and follow-up hints when instant_deploy:true per APP-20', async () => {
    vi.mocked(createPublicApplication).mockResolvedValue({
      uuid: 'app-instant-uuid',
      deployment_uuid: 'dep-instant-1',
    });

    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        ...baseCreateFields,
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
        instant_deploy: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    const deploy = data.deploy as Record<string, unknown>;
    expect(['queued', 'failed_to_queue']).toContain(deploy.status);
    expect(data.uuid).toBe('app-instant-uuid');
    expect(JSON.stringify(data)).toMatch(/deployment\.get|application\.deploy/);
  });

  it('maps HTTP 409 domain conflicts to COOLIFY_409 with force_domain_override hint per APP-21', async () => {
    const conflicts = [
      { domain: 'app.example.com', message: 'Domain already in use' },
    ];
    vi.mocked(createPublicApplication).mockRejectedValue(
      Object.assign(new Error('Conflict'), {
        response: {
          status: 409,
          _data: { conflicts },
        },
      }),
    );

    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        ...baseCreateFields,
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.conflicts).toEqual(conflicts);
    expect(
      result.structuredContent.error.recoveryHints.join(' '),
    ).toMatch(/force_domain_override:\s*true/i);
  });

  it('passes force_domain_override:true to createPublicApplication on happy path per APP-21', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        ...baseCreateFields,
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
        force_domain_override: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ force_domain_override: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-new-uuid' });
  });

  it('rejects create with missing server_uuid before any API call per SAF-03', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        project_uuid: 'proj-uuid-1',
        environment_name: 'production',
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createPublicApplication).not.toHaveBeenCalled();
  });

  it('rejects build_pack dockercompose with COOLIFY_VALIDATION_ERROR per D-04', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        ...baseCreateFields,
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'dockercompose',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error.recoveryHints.join(' ')).toMatch(
      /service\.create/i,
    );
    expect(createPublicApplication).not.toHaveBeenCalled();
  });

  it('rejects create without project_uuid or project_name per D-02', async () => {
    const result = await handleApplicationAction(
      {
        action: 'create',
        source_type: 'public_git',
        environment_name: 'production',
        server_uuid: 'srv-uuid-1',
        git_repository: 'https://github.com/example/repo',
        git_branch: 'main',
        build_pack: 'nixpacks',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createPublicApplication).not.toHaveBeenCalled();
  });
});

describe('application update', () => {
  beforeEach(() => {
    vi.mocked(updateApplication).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(updateApplication).mockResolvedValue({
      ...mockApplication,
      domains: 'https://new.example.com',
      build_command: 'npm run build',
      health_check_path: '/health',
      custom_labels: 'key=value',
    });
  });

  it.fails('patches curated fields via updateApplication per APP-17', async () => {
    const result = await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        domains: 'https://new.example.com',
        build_command: 'npm run build',
        health_check_path: '/health',
        custom_labels: 'key=value',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(updateApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      expect.objectContaining({
        domains: 'https://new.example.com',
        build_command: 'npm run build',
        health_check_path: '/health',
        custom_labels: 'key=value',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({
      domains: 'https://new.example.com',
      build_command: 'npm run build',
    });
  });

  it.fails('passes HTTP basic auth fields to updateApplication per APP-19', async () => {
    vi.mocked(updateApplication).mockResolvedValue({
      ...mockApplication,
      is_http_basic_auth_enabled: true,
      http_basic_auth_username: 'admin',
      http_basic_auth_password: 'plain-secret',
    });

    await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        is_http_basic_auth_enabled: true,
        http_basic_auth_username: 'admin',
        http_basic_auth_password: 'plain-secret',
      },
      testEnv,
    );

    expect(updateApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      expect.objectContaining({
        is_http_basic_auth_enabled: true,
        http_basic_auth_username: 'admin',
        http_basic_auth_password: 'plain-secret',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('masks http_basic_auth_password unless reveal:true per SAF-04', async () => {
    vi.mocked(updateApplication).mockResolvedValue({
      ...mockApplication,
      http_basic_auth_username: 'admin',
      http_basic_auth_password: 'plain-secret',
    });

    const result = await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        http_basic_auth_password: 'plain-secret',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.http_basic_auth_username).toBe('admin');
    expect(data.http_basic_auth_password).toBe('***');
  });

  it.fails('returns plaintext http_basic_auth_password when reveal:true per SAF-04', async () => {
    vi.mocked(updateApplication).mockResolvedValue({
      ...mockApplication,
      http_basic_auth_username: 'admin',
      http_basic_auth_password: 'plain-secret',
    });

    const result = await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        http_basic_auth_password: 'plain-secret',
        reveal: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.http_basic_auth_password).toBe('plain-secret');
  });

  it.fails('rejects unknown update fields via strict schema before API call per SAF-03', async () => {
    const result = await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        unexpected_field: 'foo',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(updateApplication).not.toHaveBeenCalled();
  });

  it.fails('maps update HTTP 409 to COOLIFY_409 with force_domain_override hint per APP-21', async () => {
    const conflicts = [{ domain: 'taken.example.com', message: 'in use' }];
    vi.mocked(updateApplication).mockRejectedValue(
      Object.assign(new Error('Conflict'), {
        response: {
          status: 409,
          _data: { conflicts },
        },
      }),
    );

    const result = await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        domains: 'https://taken.example.com',
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.conflicts).toEqual(conflicts);
    expect(
      result.structuredContent.error.recoveryHints.join(' '),
    ).toMatch(/force_domain_override:\s*true/i);
  });

  it.fails('passes force_domain_override:true on update happy path per APP-21', async () => {
    vi.mocked(updateApplication).mockResolvedValue({
      ...mockApplication,
      domains: 'https://override.example.com',
    });

    const result = await handleApplicationAction(
      {
        action: 'update',
        uuid: 'app-uuid-1',
        domains: 'https://override.example.com',
        force_domain_override: true,
      },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(updateApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      expect.objectContaining({ force_domain_override: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'app-uuid-1' });
  });

  it.fails('resolves update by name single-hit via fetchResources per D-21', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    await handleApplicationAction(
      {
        action: 'update',
        name: 'myapp',
        domains: 'https://by-name.example.com',
      },
      testEnv,
    );

    expect(updateApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      expect.objectContaining({ domains: 'https://by-name.example.com' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('returns COOLIFY_AMBIGUOUS_MATCH on update multi-match without mutation per D-21', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceApp1,
      mockResourceApp2,
    ]);

    const result = await handleApplicationAction(
      { action: 'update', name: 'app', domains: 'https://x.example.com' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(updateApplication).not.toHaveBeenCalled();
  });
});

describe('application delete', () => {
  beforeEach(() => {
    vi.mocked(deleteApplication).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(deleteApplication).mockResolvedValue({ message: 'Deleted.' });
  });

  it.fails('deletes application when confirm:true with safe defaults per APP-18', async () => {
    const result = await handleApplicationAction(
      { action: 'delete', uuid: 'app-uuid-1', confirm: true },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    expect(deleteApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      {
        delete_volumes: false,
        delete_configurations: false,
        docker_cleanup: false,
        delete_connected_networks: false,
      },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'app-uuid-1' });
  });

  it.fails('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per SAF-01', async () => {
    const result = await handleApplicationAction(
      { action: 'delete', uuid: 'app-uuid-1', confirm: false },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(true);
    if (!isApplicationErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteApplication).not.toHaveBeenCalled();
  });

  it.fails('passes all four safe-delete flags false by default per SAF-02', async () => {
    await handleApplicationAction(
      { action: 'delete', uuid: 'app-uuid-1', confirm: true },
      testEnv,
    );

    expect(deleteApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      {
        delete_volumes: false,
        delete_configurations: false,
        docker_cleanup: false,
        delete_connected_networks: false,
      },
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('resolves delete by fqdn single-hit per D-21', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceApp1]);

    await handleApplicationAction(
      { action: 'delete', fqdn: 'example.com', confirm: true },
      testEnv,
    );

    expect(deleteApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      expect.objectContaining({ delete_volumes: false }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });
});

describe('application delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deleteApplication).mockReset();
    vi.mocked(fetchApplication).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchApplication).mockResolvedValue(mockApplication);
  });

  it.fails('returns would_delete preview without calling deleteApplication per Phase 8/9 parity', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      { uuid: 'dep-1', name: 'latest-deploy', type: 'deployment' },
    ]);

    const result = await handleApplicationAction(
      { action: 'delete_preview', uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(deleteApplication).not.toHaveBeenCalled();
    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'app-uuid-1',
      would_delete: true,
    });
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.child_resources)).toBe(true);
  });
});
