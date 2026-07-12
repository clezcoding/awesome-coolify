import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { EnvConfig } from '../../src/config/env.js';
import {
  applicationActionSchema,
  handleApplicationAction,
  isApplicationErrorResult,
} from '../../src/mcp/tools/application.js';
import {
  handleDeploymentAction,
  isDeploymentErrorResult,
} from '../../src/mcp/tools/deployment.js';
import { CoolifyApiError } from '../../src/utils/errors.js';

vi.mock('../../src/api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchResources: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchDeployment: vi.fn(),
  triggerAppStart: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
  triggerDeploy: vi.fn(),
  cancelDeployment: vi.fn(),
}));

import {
  fetchResources,
  fetchAppDeployments,
  fetchDeployment,
  triggerAppStart,
  triggerAppStop,
  triggerAppRestart,
  triggerDeploy,
  cancelDeployment,
} from '../../src/api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: false,
  COOLIFY_MCP_LOG: 'error',
};

const mockApp = {
  uuid: 'app-uuid-1',
  type: 'application',
  name: 'myapp',
  status: 'running:healthy',
  fqdn: 'https://app.example.com',
  updated_at: '2026-07-01T00:00:00Z',
};

const mockApp2 = {
  uuid: 'app-uuid-2',
  type: 'application',
  name: 'myapp-staging',
  status: 'running:healthy',
  fqdn: 'https://staging.example.com',
  updated_at: '2026-07-01T00:00:00Z',
};

const mockDeploymentRunning = {
  deployment_uuid: 'dep-running',
  git_commit_sha: 'abc123',
  status: 'in_progress',
  created_at: '2026-07-12T01:00:00.000Z',
  finished_at: '',
};

const mockDeploymentFinished = {
  deployment_uuid: 'dep-finished',
  git_commit_sha: 'def456',
  status: 'finished',
  created_at: '2026-07-12T02:00:00.000Z',
  finished_at: '2026-07-12T02:10:00.000Z',
};

const mockDeploymentFailed = {
  deployment_uuid: 'dep-failed',
  git_commit_sha: 'ghi789',
  status: 'failed',
  created_at: '2026-07-12T03:00:00.000Z',
  finished_at: '2026-07-12T03:05:00.000Z',
};

const mockDeploymentCancelled = {
  deployment_uuid: 'dep-cancelled',
  git_commit_sha: 'jkl012',
  status: 'cancelled-by-user',
  created_at: '2026-07-12T04:00:00.000Z',
  finished_at: '2026-07-12T04:01:00.000Z',
};

const mockResourcesWithTags = [
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
];

const mockResourcesWithoutTags = [
  {
    uuid: 'app-no-tags',
    type: 'application',
    name: 'no-tags',
  },
];

const mockDeployResponse = (deploymentUuid: string, appUuid: string) => ({
  deployments: [
    {
      deployment_uuid: deploymentUuid,
      resource_uuid: appUuid,
      message: 'queued',
    },
  ],
});

const mockAppDeployments = [
  mockDeploymentFinished,
  mockDeploymentFailed,
  mockDeploymentRunning,
];

const mockDeploymentFull = {
  deployment_uuid: 'dep-uuid-1',
  git_commit_sha: 'commit-sha-1',
  status: 'finished',
  created_at: '2026-07-12T01:00:00.000Z',
  finished_at: '2026-07-12T01:05:00.000Z',
  logs: 'Build log line 1\nBuild log line 2\n'.repeat(500),
  env: { DATABASE_PASSWORD: 'super-secret', PORT: '3000' },
  api_token: 'token-value-xyz',
  password: 'pw-value',
  secret: 'secret-value',
  private: 'private-value',
};

function setupDefaultMocks(): void {
  vi.mocked(triggerAppStart).mockResolvedValue({ message: 'started' });
  vi.mocked(triggerAppStop).mockResolvedValue({ message: 'stopped' });
  vi.mocked(triggerAppRestart).mockResolvedValue({ message: 'restarted' });
  vi.mocked(triggerDeploy).mockResolvedValue(
    mockDeployResponse('dep-uuid-1', 'app-uuid-1'),
  );
  vi.mocked(fetchResources).mockResolvedValue([mockApp]);
  vi.mocked(fetchAppDeployments).mockResolvedValue(mockAppDeployments);
  vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFinished);
  vi.mocked(cancelDeployment).mockResolvedValue({ message: 'cancelled' });
}

describe('deploy-flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('APP-03 lifecycle', () => {
    it('start by uuid calls triggerAppStart', async () => {
      const result = await handleApplicationAction(
        { action: 'start', uuid: 'app-uuid-1' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        uuid: 'app-uuid-1',
        action: 'start',
        status: 'requested',
      });
      expect(triggerAppStart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('stop by name single-hit calls triggerAppStop', async () => {
      const result = await handleApplicationAction(
        { action: 'stop', name: 'myapp' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerAppStop).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('restart by fqdn single-hit calls triggerAppRestart', async () => {
      const result = await handleApplicationAction(
        { action: 'restart', fqdn: 'example.com' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerAppRestart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('multi-match name returns COOLIFY_AMBIGUOUS_MATCH without mutation', async () => {
      vi.mocked(fetchResources).mockResolvedValue([mockApp, mockApp2]);

      const result = await handleApplicationAction(
        { action: 'start', name: 'app' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(true);
      if (!isApplicationErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
      expect(triggerAppStart).not.toHaveBeenCalled();
      expect(triggerAppStop).not.toHaveBeenCalled();
      expect(triggerAppRestart).not.toHaveBeenCalled();
    });
  });

  describe('APP-04 single deploy', () => {
    it('deploy by uuid returns queued response with logs_available', async () => {
      const result = await handleApplicationAction(
        { action: 'deploy', uuid: 'app-uuid-1' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        deployment_uuid: 'dep-uuid-1',
        status: 'queued',
      });
      expect(result.data.logs_available).toEqual({
        tool: 'application',
        action: 'logs',
        args: { deployment_uuid: 'dep-uuid-1' },
        label: 'View build logs',
        available_in_phase: 5,
      });
      expect(result.data).not.toHaveProperty('logs');
      expect(triggerDeploy).toHaveBeenCalledTimes(1);
    });
  });

  describe('APP-05 force deploy', () => {
    it('deploy with force:true passes force to triggerDeploy', async () => {
      const result = await handleApplicationAction(
        { action: 'deploy', uuid: 'app-uuid-1', force: true },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      expect(triggerDeploy).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        true,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });
  });

  describe('APP-06 wait-mode', () => {
    it('wait:true polls until finished with logs_available and no inline logs', async () => {
      vi.useFakeTimers();
      let pollCount = 0;
      vi.mocked(fetchDeployment).mockImplementation(async () => {
        pollCount += 1;
        if (pollCount <= 2) {
          return mockDeploymentRunning;
        }
        return mockDeploymentFinished;
      });

      const resultPromise = handleApplicationAction(
        { action: 'deploy', uuid: 'app-uuid-1', wait: true, timeout: 60 },
        testEnv,
      );

      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(3000);

      const result = await resultPromise;

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.status).toBe('finished');
      expect(result.data.logs_available.available_in_phase).toBe(5);
      expect(result.data).not.toHaveProperty('logs');
      expect(pollCount).toBeGreaterThanOrEqual(3);
    });

    it('wait:true timeout returns status timeout with deployment.get hint', async () => {
      vi.useFakeTimers();
      vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentRunning);

      const resultPromise = handleApplicationAction(
        { action: 'deploy', uuid: 'app-uuid-1', wait: true, timeout: 10 },
        testEnv,
      );

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.status).toBe('timeout');
      expect(result.data.hint).toContain('deployment.get');
      expect(result.data.hint).toContain('dep-uuid-1');
      expect(result.data.logs_available).toBeDefined();
    });
  });

  describe('APP-07 deployment.list', () => {
    it('lists deployments by application_uuid with _meta total', async () => {
      const result = await handleDeploymentAction(
        { action: 'list', application_uuid: 'app-uuid-1' },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        deployment_uuid: 'dep-finished',
        status: 'finished',
      });
      expect(result._meta.total).toBe(3);
      expect(fetchAppDeployments).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });
  });

  describe('APP-08 deployment.get', () => {
    it('summary returns DeploymentSummary fields', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFinished);

      const result = await handleDeploymentAction(
        { action: 'get', deployment_uuid: 'dep-finished' },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        deployment_uuid: 'dep-finished',
        commit: 'def456',
        status: 'finished',
      });
      expect(result.data).not.toHaveProperty('logs');
      expect(result.data).not.toHaveProperty('raw_deployment');
    });

    it('full projection masks sensitive keys in raw_deployment', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFull);

      const result = await handleDeploymentAction(
        {
          action: 'get',
          deployment_uuid: 'dep-uuid-1',
          projection: 'full',
          max_chars: 1000,
        },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      expect(result.ok).toBe(true);
      const data = result.data as {
        logs?: string;
        raw_deployment: Record<string, unknown>;
      };
      expect(data.logs).toBeDefined();
      expect(data.raw_deployment).toMatchObject({
        env: { DATABASE_PASSWORD: '***', PORT: '3000' },
        api_token: '***',
        password: '***',
        secret: '***',
        private: '***',
      });
    });
  });

  describe('APP-09 deployment.cancel', () => {
    it('cancel in-progress returns cancelled true', async () => {
      vi.mocked(cancelDeployment).mockResolvedValue({ message: 'cancelled' });

      const result = await handleDeploymentAction(
        { action: 'cancel', deployment_uuid: 'dep-running' },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({
        cancelled: true,
        deployment_uuid: 'dep-running',
      });
    });

    it('cancel already-finished returns graceful envelope without isError', async () => {
      vi.mocked(cancelDeployment).mockRejectedValue(
        new CoolifyApiError({
          code: 'COOLIFY_422',
          message: 'Deployment already finished',
          recoveryHints: ['Review the request payload for missing or invalid fields.'],
          httpStatus: 400,
        }),
      );
      vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFinished);

      const result = await handleDeploymentAction(
        { action: 'cancel', deployment_uuid: 'dep-finished' },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({
        cancelled: false,
        already_finished: true,
        status: 'finished',
        deployment_uuid: 'dep-finished',
      });
      expect(fetchDeployment).toHaveBeenCalled();
    });
  });

  describe('DEP-01 deploy by name', () => {
    it('deploy by name substring resolves via fetchResources and calls triggerDeploy', async () => {
      const result = await handleApplicationAction(
        { action: 'deploy', name: 'myapp' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerDeploy).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        false,
        testEnv.COOLIFY_VERIFY_SSL,
      );
      expect(fetchResources).toHaveBeenCalled();
    });
  });

  describe('DEP-02 batch deploy', () => {
    beforeEach(() => {
      vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) =>
        mockDeployResponse(`dep-${uuid}`, uuid),
      );
    });

    it('batch by uuids deploys each app with results array length 2', async () => {
      const result = await handleApplicationAction(
        { action: 'deploy', uuids: ['a', 'b'] },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerDeploy).toHaveBeenCalledTimes(2);
      const data = result.data as { results: Array<Record<string, unknown>> };
      expect(data.results).toHaveLength(2);
    });

    it('batch by tags deploys matching apps from mockResourcesWithTags', async () => {
      vi.mocked(fetchResources).mockResolvedValue(mockResourcesWithTags);

      const result = await handleApplicationAction(
        { action: 'deploy', tags: ['web'] },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(triggerDeploy).toHaveBeenCalledTimes(2);
      const data = result.data as { results: Array<Record<string, unknown>> };
      const uuids = data.results.map((r) => r.uuid);
      expect(uuids).toContain('app-web-1');
      expect(uuids).toContain('app-web-2');
    });

    it('batch partial failure keeps other apps deployed', async () => {
      vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) => {
        if (uuid === 'a') {
          throw new CoolifyApiError({
            code: 'COOLIFY_404',
            message: 'Application not found',
            recoveryHints: ['Check that the resource UUID or path exists on this Coolify instance.'],
            httpStatus: 404,
          });
        }
        return mockDeployResponse(`dep-${uuid}`, uuid);
      });

      const result = await handleApplicationAction(
        { action: 'deploy', uuids: ['a', 'b'] },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      const data = result.data as { results: Array<Record<string, unknown>> };
      expect(data.results[0]).toMatchObject({ uuid: 'a', status: 'failed' });
      expect(data.results[1]).toMatchObject({
        uuid: 'b',
        status: 'queued',
        deployment_uuid: 'dep-b',
      });
    });

    it('batch sequential wait order preserves triggerDeploy call order', async () => {
      vi.useFakeTimers();
      const deployOrder: string[] = [];

      vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) => {
        deployOrder.push(uuid);
        return mockDeployResponse(`dep-${uuid}`, uuid);
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

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(deployOrder).toEqual(['a', 'b']);
    });
  });

  describe('DEP-03 logs_available hint', () => {
    it('single deploy response has logs_available with available_in_phase 5 and no logs field', async () => {
      const result = await handleApplicationAction(
        { action: 'deploy', uuid: 'app-uuid-1' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.data.logs_available.available_in_phase).toBe(5);
      expect(result.data).not.toHaveProperty('logs');
    });

    it('batch entry and wait terminal carry logs_available hint', async () => {
      vi.useFakeTimers();
      vi.mocked(triggerDeploy).mockImplementation(async (_url, _token, uuid) =>
        mockDeployResponse(`dep-${uuid}`, uuid),
      );
      vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFinished);

      const result = await handleApplicationAction(
        { action: 'deploy', uuids: ['a'], wait: true, timeout: 10 },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      const data = result.data as { results: Array<Record<string, unknown>> };
      expect(data.results[0].logs_available).toMatchObject({
        available_in_phase: 5,
      });
      expect(data.results[0]).not.toHaveProperty('logs');
    });
  });

  describe('backstop cases', () => {
    it('deployment.get full + table format returns COOLIFY_422', async () => {
      const result = await handleDeploymentAction(
        {
          action: 'get',
          deployment_uuid: 'dep-uuid-1',
          projection: 'full',
          format: 'table',
        },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(true);
      if (!isDeploymentErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_422');
      expect(fetchDeployment).not.toHaveBeenCalled();
    });

    it('application.restart with force field fails Zod parse per D-22', () => {
      const parsed = applicationActionSchema.safeParse({
        action: 'restart',
        uuid: 'app-uuid-1',
        force: true,
      });
      expect(parsed.success).toBe(false);
    });

    it('full deploy lifecycle: trigger → poll → terminal → cancel attempt', async () => {
      vi.useFakeTimers();
      let pollCount = 0;
      vi.mocked(fetchDeployment).mockImplementation(async () => {
        pollCount += 1;
        if (pollCount <= 1) {
          return mockDeploymentRunning;
        }
        return mockDeploymentFinished;
      });

      const deployResultPromise = handleApplicationAction(
        { action: 'deploy', uuid: 'app-uuid-1', wait: true, timeout: 30 },
        testEnv,
      );

      await vi.advanceTimersByTimeAsync(3000);
      const deployResolved = await deployResultPromise;

      expect(isApplicationErrorResult(deployResolved)).toBe(false);
      if (isApplicationErrorResult(deployResolved)) return;
      expect(deployResolved.data.status).toBe('finished');

      vi.mocked(cancelDeployment).mockRejectedValue(
        new CoolifyApiError({
          code: 'COOLIFY_422',
          message: 'Deployment already finished',
          recoveryHints: ['Review the request payload for missing or invalid fields.'],
          httpStatus: 400,
        }),
      );

      const cancelResult = await handleDeploymentAction(
        { action: 'cancel', deployment_uuid: 'dep-uuid-1' },
        testEnv,
      );

      expect(isDeploymentErrorResult(cancelResult)).toBe(false);
      if (isDeploymentErrorResult(cancelResult)) return;
      expect(cancelResult.data).toMatchObject({
        cancelled: false,
        already_finished: true,
      });
    });
  });
});
