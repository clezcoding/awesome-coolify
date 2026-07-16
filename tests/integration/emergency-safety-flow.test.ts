import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../src/config/env.js';
import {
  emergencyToolSchema,
  handleEmergencyAction,
  isEmergencyErrorResult,
} from '../../src/mcp/tools/emergency.js';
import {
  handleApplicationAction,
  isApplicationErrorResult,
} from '../../src/mcp/tools/application.js';
import {
  handleServiceAction,
  isServiceErrorResult,
} from '../../src/mcp/tools/service.js';
import {
  handleDatabaseAction,
  isDatabaseErrorResult,
} from '../../src/mcp/tools/database.js';
import {
  diagnoseToolSchema,
  handleDiagnoseAction,
  isDiagnoseErrorResult,
} from '../../src/mcp/tools/diagnose.js';
import {
  handleDeploymentAction,
  isDeploymentErrorResult,
} from '../../src/mcp/tools/deployment.js';
import { CoolifyApiError } from '../../src/utils/errors.js';

vi.mock('../../src/api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchApplication: vi.fn(),
  fetchService: vi.fn(),
  fetchDatabase: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
  triggerDeploy: vi.fn(),
  fetchDeployment: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchApplicationEnvs: vi.fn(),
}));

vi.mock('../../src/utils/deploy-poll.js', () => ({
  pollDeploymentUntilTerminal: vi.fn(),
}));

import {
  fetchResources,
  fetchProjects,
  fetchProject,
  fetchApplication,
  fetchService,
  fetchDatabase,
  triggerAppStop,
  triggerAppRestart,
  triggerDeploy,
  fetchDeployment,
  fetchAppDeployments,
  fetchApplicationEnvs,
} from '../../src/api/client.js';
import { pollDeploymentUntilTerminal } from '../../src/utils/deploy-poll.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: false,
  COOLIFY_MCP_LOG: 'error',
};

const mockResourcesWithRunningApps = [
  {
    type: 'application',
    uuid: 'app-running-1',
    name: 'Running App 1',
    status: 'running:healthy',
    project: { uuid: 'p1', name: 'Project One' },
  },
  {
    type: 'application',
    uuid: 'app-running-2',
    name: 'Running App 2',
    status: 'running:unhealthy',
    project: { uuid: 'p1', name: 'Project One' },
  },
  {
    type: 'application',
    uuid: 'app-stopped',
    name: 'Stopped App',
    status: 'stopped',
    project: { uuid: 'p2', name: 'Project Two' },
  },
  {
    type: 'service',
    uuid: 'svc-1',
    name: 'Service',
    status: 'running:healthy',
  },
  {
    type: 'database',
    uuid: 'db-1',
    name: 'Database',
    status: 'running:healthy',
  },
];

const mockResourcesWithProjectApps = [
  ...mockResourcesWithRunningApps,
  {
    type: 'application',
    uuid: 'app-other-project',
    name: 'Other Project App',
    status: 'exited',
    project: { uuid: 'p2', name: 'Project Two' },
  },
];

const mockProjectsWithZeroMatches: unknown[] = [];

const mockProjectsWithMultiMatch = [
  { uuid: 'proj-1', name: 'my-proj-alpha' },
  { uuid: 'proj-2', name: 'my-proj-beta' },
];

const mockAppWithSecrets = {
  uuid: 'app-1',
  name: 'my-app',
  status: 'running:healthy',
  fqdn: 'https://app.example.com',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  server: { name: 'srv-1', uuid: 'srv-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  password: 'hunter2',
  token: 'tok-123',
};

const mockServiceWithSecrets = {
  uuid: 'svc-1',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  token: 'tok-123',
};

const mockDatabaseWithSecrets = {
  uuid: 'db-1',
  type: 'database',
  name: 'pg',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  password: 'pg-pw',
};

const mockDiagnoseApp = {
  uuid: 'app-1',
  name: 'failing-app',
  status: 'unhealthy',
  fqdn: 'https://fail.example.com',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'online-node', uuid: 'srv-online' },
  updated_at: '2026-07-12T02:30:00.000Z',
  secret_env: 'env-secret',
};

const mockDeploymentWithSecrets = {
  deployment_uuid: 'd1',
  git_commit_sha: 'commit-sha-1',
  status: 'finished',
  created_at: '2026-07-12T01:00:00.000Z',
  finished_at: '2026-07-12T01:05:00.000Z',
  api_token: 'tok-reveal-test',
};

const mockDeploymentQueued = {
  deployments: [{ deployment_uuid: 'd1' }],
};

const mockDeploymentFinished = {
  status: 'finished',
  git_commit_sha: 'abc123',
  created_at: '2026-07-12T01:00:00.000Z',
  finished_at: '2026-07-12T01:05:00.000Z',
};

function setupEmergencyMocks(): void {
  vi.mocked(fetchResources).mockResolvedValue(mockResourcesWithRunningApps);
  vi.mocked(fetchProjects).mockResolvedValue([]);
  vi.mocked(fetchProject).mockResolvedValue({ uuid: 'p1', environments: [] });
  vi.mocked(triggerAppStop).mockResolvedValue({});
  vi.mocked(triggerAppRestart).mockResolvedValue({});
  vi.mocked(triggerDeploy).mockResolvedValue(mockDeploymentQueued);
  vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFinished);
  vi.mocked(pollDeploymentUntilTerminal).mockResolvedValue({
    status: 'finished',
    commit: 'abc123',
    created_at: '2026-07-12T01:00:00.000Z',
    finished_at: '2026-07-12T01:05:00.000Z',
  });
}

describe('emergency-safety-flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEmergencyMocks();
  });

  describe('EMG-01 stop_all', () => {
    it('confirm:false returns COOLIFY_CONFIRM_REQUIRED with preview and does not call triggerAppStop', async () => {
      const result = await handleEmergencyAction(
        { action: 'stop_all', confirm: false },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.ok).toBe(false);
      expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
      expect(result.structuredContent.error.data).toMatchObject({
        would_affect: 2,
        sample_uuids: ['app-running-1', 'app-running-2'],
        action: 'stop_all',
      });
      expect(
        result.structuredContent.error.recoveryHints.some((h) =>
          h.includes('Retry with confirm: true'),
        ),
      ).toBe(true);
      expect(triggerAppStop).not.toHaveBeenCalled();
    });

    it('confirm:true stops running apps only (apps-only filter)', async () => {
      const result = await handleEmergencyAction(
        { action: 'stop_all', confirm: true },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(false);
      if (isEmergencyErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.results).toHaveLength(2);
      expect(result.data.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uuid: 'app-running-1',
            status: 'stopped',
          }),
          expect.objectContaining({
            uuid: 'app-running-2',
            status: 'stopped',
          }),
        ]),
      );
      expect(triggerAppStop).toHaveBeenCalledTimes(2);
      expect(triggerAppStop).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-running-1',
        testEnv.COOLIFY_VERIFY_SSL,
      );
      expect(triggerAppStop).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'svc-1',
        expect.anything(),
      );
      expect(triggerAppStop).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'db-1',
        expect.anything(),
      );
    });

    it('confirm:true continues best-effort when first stop fails', async () => {
      vi.mocked(triggerAppStop)
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce({});

      const result = await handleEmergencyAction(
        { action: 'stop_all', confirm: true },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(false);
      if (isEmergencyErrorResult(result)) return;

      expect(result.data.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uuid: 'app-running-1',
            status: 'failed',
            error: 'not found',
          }),
          expect.objectContaining({
            uuid: 'app-running-2',
            status: 'stopped',
          }),
        ]),
      );
      expect(triggerAppStop).toHaveBeenCalledTimes(2);
    });
  });

  describe('EMG-02 redeploy_project', () => {
    beforeEach(() => {
      vi.mocked(fetchResources).mockResolvedValue(mockResourcesWithProjectApps);
    });

    it('confirm:false returns COOLIFY_CONFIRM_REQUIRED with project app count preview', async () => {
      const result = await handleEmergencyAction(
        { action: 'redeploy_project', project_uuid: 'p1', confirm: false },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
      expect(result.structuredContent.error.data).toMatchObject({
        would_affect: 2,
        action: 'redeploy_project',
      });
      expect(result.structuredContent.error.data?.sample_uuids).toEqual(
        expect.arrayContaining(['app-running-1', 'app-running-2']),
      );
      expect(triggerDeploy).not.toHaveBeenCalled();
    });

    it('confirm:true deploys each project app with force:false', async () => {
      const result = await handleEmergencyAction(
        {
          action: 'redeploy_project',
          project_uuid: 'p1',
          confirm: true,
          force: false,
        },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(false);
      if (isEmergencyErrorResult(result)) return;

      expect(result.data.results).toHaveLength(2);
      expect(triggerDeploy).toHaveBeenCalledTimes(2);
      expect(triggerDeploy).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-running-1',
        false,
        testEnv.COOLIFY_VERIFY_SSL,
      );
      expect(result.data.results[0]).toMatchObject({
        uuid: 'app-running-1',
        deployment_uuid: 'd1',
        status: 'queued',
        logs_available: expect.objectContaining({
          tool: 'application',
          action: 'logs',
        }),
      });
    });

    it('confirm:true passes force:true to triggerDeploy', async () => {
      await handleEmergencyAction(
        {
          action: 'redeploy_project',
          project_uuid: 'p1',
          confirm: true,
          force: true,
        },
        testEnv,
      );

      expect(triggerDeploy).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-running-1',
        true,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('confirm:true wait:true polls each deployment to terminal', async () => {
      const result = await handleEmergencyAction(
        {
          action: 'redeploy_project',
          project_uuid: 'p1',
          confirm: true,
          wait: true,
          timeout: 30,
        },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(false);
      if (isEmergencyErrorResult(result)) return;

      expect(pollDeploymentUntilTerminal).toHaveBeenCalledTimes(2);
      expect(pollDeploymentUntilTerminal).toHaveBeenCalledWith(
        expect.any(Function),
        30_000,
      );
      expect(result.data.results[0]).toMatchObject({
        uuid: 'app-running-1',
        status: 'finished',
        commit: 'abc123',
        created_at: '2026-07-12T01:00:00.000Z',
        finished_at: '2026-07-12T01:05:00.000Z',
        logs_available: expect.any(Object),
      });
    });

    it('project_name zero matches returns COOLIFY_404', async () => {
      vi.mocked(fetchProjects).mockResolvedValue(mockProjectsWithZeroMatches);

      const result = await handleEmergencyAction(
        {
          action: 'redeploy_project',
          project_name: 'nonexistent',
          confirm: true,
        },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_404');
      expect(triggerDeploy).not.toHaveBeenCalled();
    });

    it('project_name multi match returns COOLIFY_AMBIGUOUS_MATCH with ranked list', async () => {
      vi.mocked(fetchProjects).mockResolvedValue(mockProjectsWithMultiMatch);

      const result = await handleEmergencyAction(
        {
          action: 'redeploy_project',
          project_name: 'proj',
          confirm: true,
        },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
      const hints = result.structuredContent.error.recoveryHints.join(' ');
      expect(hints).toContain('- my-proj-alpha (proj-1)');
      expect(hints).toContain('- my-proj-beta (proj-2)');
      expect(triggerDeploy).not.toHaveBeenCalled();
    });

    it('neither project_uuid nor project_name rejected by superRefine COOLIFY_422', () => {
      const parsed = emergencyToolSchema.safeParse({ action: 'redeploy_project' });
      expect(parsed.success).toBe(false);
      if (parsed.success) return;
      expect(
        parsed.error.issues.some(
          (i) =>
            (i as { params?: { code?: string } }).params?.code === 'COOLIFY_422',
        ),
      ).toBe(true);
    });
  });

  describe('EMG-03 restart_project', () => {
    beforeEach(() => {
      vi.mocked(fetchResources).mockResolvedValue(mockResourcesWithProjectApps);
    });

    it('confirm:false returns COOLIFY_CONFIRM_REQUIRED with project app count', async () => {
      const result = await handleEmergencyAction(
        { action: 'restart_project', project_uuid: 'p1', confirm: false },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
      expect(result.structuredContent.error.data?.would_affect).toBe(2);
      expect(triggerAppRestart).not.toHaveBeenCalled();
    });

    it('confirm:true restarts each project app without calling triggerDeploy', async () => {
      const result = await handleEmergencyAction(
        { action: 'restart_project', project_uuid: 'p1', confirm: true },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(false);
      if (isEmergencyErrorResult(result)) return;

      expect(result.data.results).toHaveLength(2);
      expect(result.data.results[0]).toMatchObject({
        uuid: 'app-running-1',
        status: 'requested',
      });
      expect(triggerAppRestart).toHaveBeenCalledTimes(2);
      expect(triggerDeploy).not.toHaveBeenCalled();
    });

    it('rejects force via strict() on restart schema', () => {
      expect(
        emergencyToolSchema.safeParse({
          action: 'restart_project',
          project_uuid: 'p1',
          force: true,
        }).success,
      ).toBe(false);
    });

    it('rejects wait via strict() on restart schema', () => {
      expect(
        emergencyToolSchema.safeParse({
          action: 'restart_project',
          project_uuid: 'p1',
          wait: true,
        }).success,
      ).toBe(false);
    });
  });

  describe('OUT-02 reveal', () => {
    beforeEach(() => {
      vi.mocked(fetchApplication).mockResolvedValue(mockAppWithSecrets);
      vi.mocked(fetchService).mockResolvedValue(mockServiceWithSecrets);
      vi.mocked(fetchDatabase).mockResolvedValue(mockDatabaseWithSecrets);
      vi.mocked(fetchApplicationEnvs).mockResolvedValue([]);
      vi.mocked(fetchAppDeployments).mockResolvedValue([]);
      vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentWithSecrets);
    });

    it('application.get projection:full reveal:false masks secrets', async () => {
      const result = await handleApplicationAction(
        { action: 'get', uuid: 'app-1', projection: 'full' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      expect(data.password).toBe('***');
      expect(data.token).toBe('***');
    });

    it('application.get projection:full reveal:true returns plaintext secrets', async () => {
      const result = await handleApplicationAction(
        {
          action: 'get',
          uuid: 'app-1',
          projection: 'full',
          reveal: true,
        },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      expect(data.password).toBe('hunter2');
      expect(data.token).toBe('tok-123');
    });

    it('application.get projection:summary reveal:true omits secret fields', async () => {
      const result = await handleApplicationAction(
        {
          action: 'get',
          uuid: 'app-1',
          projection: 'summary',
          reveal: true,
        },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('token');
    });

    it('service.get projection:full reveal:true returns plaintext secrets', async () => {
      const result = await handleServiceAction(
        {
          action: 'get',
          uuid: 'svc-1',
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

    it('database.get projection:full reveal:true returns plaintext secrets', async () => {
      const result = await handleDatabaseAction(
        {
          action: 'get',
          uuid: 'db-1',
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

    it('diagnose app projection:full reveal:true returns plaintext raw_application secrets', async () => {
      vi.mocked(fetchApplication).mockResolvedValue(mockDiagnoseApp);

      const result = await handleDiagnoseAction(
        diagnoseToolSchema.parse({
          action: 'app',
          uuid: 'app-1',
          projection: 'full',
          reveal: true,
        }),
        testEnv,
      );

      expect(isDiagnoseErrorResult(result)).toBe(false);
      if (isDiagnoseErrorResult(result)) return;
      if ('matches' in result.data) return;

      const raw = result.data.raw_application as Record<string, unknown>;
      expect(raw.secret_env).toBe('env-secret');
    });

    it('diagnose app projection:summary reveal:true omits raw_application', async () => {
      vi.mocked(fetchApplication).mockResolvedValue(mockDiagnoseApp);

      const result = await handleDiagnoseAction(
        diagnoseToolSchema.parse({
          action: 'app',
          uuid: 'app-1',
          projection: 'summary',
          reveal: true,
        }),
        testEnv,
      );

      expect(isDiagnoseErrorResult(result)).toBe(false);
      if (isDiagnoseErrorResult(result)) return;
      if ('matches' in result.data) return;

      expect(result.data).not.toHaveProperty('raw_application');
    });

    it('deployment.get projection:full reveal:true returns plaintext raw_deployment secrets', async () => {
      const result = await handleDeploymentAction(
        {
          action: 'get',
          deployment_uuid: 'd1',
          projection: 'full',
          reveal: true,
        },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      const data = result.data as { raw_deployment: Record<string, unknown> };
      expect(data.raw_deployment.api_token).toBe('tok-reveal-test');
    });

    it('deployment.get projection:summary reveal:true omits raw_deployment', async () => {
      const result = await handleDeploymentAction(
        {
          action: 'get',
          deployment_uuid: 'd1',
          projection: 'summary',
          reveal: true,
        },
        testEnv,
      );

      expect(isDeploymentErrorResult(result)).toBe(false);
      if (isDeploymentErrorResult(result)) return;

      expect(result.data).not.toHaveProperty('raw_deployment');
    });

    it('application.get reveal:true redacts error messages on fetch failure', async () => {
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
          uuid: 'app-1',
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

  describe('OUT-07 confirm gate backstop', () => {
    beforeEach(() => {
      vi.mocked(fetchResources).mockResolvedValue(mockResourcesWithProjectApps);
    });

    it('stop_all with confirm omitted returns COOLIFY_CONFIRM_REQUIRED', async () => {
      const result = await handleEmergencyAction({ action: 'stop_all' }, testEnv);

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    });

    it('redeploy_project with confirm omitted returns COOLIFY_CONFIRM_REQUIRED', async () => {
      const result = await handleEmergencyAction(
        { action: 'redeploy_project', project_uuid: 'p1' },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    });

    it('restart_project with confirm omitted returns COOLIFY_CONFIRM_REQUIRED', async () => {
      const result = await handleEmergencyAction(
        { action: 'restart_project', project_uuid: 'p1' },
        testEnv,
      );

      expect(isEmergencyErrorResult(result)).toBe(true);
      if (!isEmergencyErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    });
  });
});
