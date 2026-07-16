import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../src/config/env.js';
import {
  applicationActionSchema,
  handleApplicationAction,
  isApplicationErrorResult,
} from '../../src/mcp/tools/application.js';
import {
  serviceActionSchema,
  handleServiceAction,
  isServiceErrorResult,
} from '../../src/mcp/tools/service.js';
import {
  databaseActionSchema,
  handleDatabaseAction,
  isDatabaseErrorResult,
} from '../../src/mcp/tools/database.js';

vi.mock('../../src/api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchApplicationLogs: vi.fn(),
  fetchResources: vi.fn(),
  fetchDeployment: vi.fn(),
  fetchService: vi.fn(),
  fetchDatabase: vi.fn(),
  triggerAppStart: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
  triggerDeploy: vi.fn(),
  triggerServiceStart: vi.fn(),
  triggerServiceStop: vi.fn(),
  triggerServiceRestart: vi.fn(),
  triggerDatabaseStart: vi.fn(),
  triggerDatabaseStop: vi.fn(),
  triggerDatabaseRestart: vi.fn(),
  cancelDeployment: vi.fn(),
}));

import {
  fetchApplicationLogs,
  fetchResources,
  fetchDeployment,
  triggerServiceStart,
  triggerServiceStop,
  triggerServiceRestart,
  triggerDatabaseStart,
  triggerDatabaseStop,
  triggerDatabaseRestart,
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

const mockRuntimeLogsEnvelope = { logs: 'line1\nline2\nline3' };

const mockServiceRedisProd = {
  uuid: 'svc-uuid-prod',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockServiceRedisStaging = {
  uuid: 'svc-uuid-staging',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockDatabasePgProd = {
  uuid: 'db-uuid-prod',
  type: 'database',
  name: 'pg',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockDatabasePgStaging = {
  uuid: 'db-uuid-staging',
  type: 'database',
  name: 'pg',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourcesWithServiceAndDatabase = [
  mockServiceRedisProd,
  mockServiceRedisStaging,
  mockDatabasePgProd,
  mockDatabasePgStaging,
];

function setupDefaultMocks(): void {
  vi.mocked(fetchApplicationLogs).mockResolvedValue(mockRuntimeLogsEnvelope);
  vi.mocked(fetchResources).mockResolvedValue([mockApp]);
  vi.mocked(triggerServiceStart).mockResolvedValue({ message: 'started' });
  vi.mocked(triggerServiceStop).mockResolvedValue({ message: 'stopped' });
  vi.mocked(triggerServiceRestart).mockResolvedValue({ message: 'restarted' });
  vi.mocked(triggerDatabaseStart).mockResolvedValue({ message: 'started' });
  vi.mocked(triggerDatabaseStop).mockResolvedValue({ message: 'stopped' });
  vi.mocked(triggerDatabaseRestart).mockResolvedValue({ message: 'restarted' });
}

describe('logs-service-db-flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe('APP-10 runtime logs', () => {
    it('runtime logs by uuid calls fetchApplicationLogs and returns logs_lines', async () => {
      const result = await handleApplicationAction(
        { action: 'logs', uuid: 'app-uuid-1', lines: 50 },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.logs_lines).toEqual(['line1', 'line2', 'line3']);
      expect(typeof result.data.logs_truncated).toBe('boolean');
      expect(typeof result.data.total_lines).toBe('number');
      expect(fetchApplicationLogs).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        50,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('max_chars cap truncates oversized runtime log blob', async () => {
      vi.mocked(fetchApplicationLogs).mockResolvedValue({
        logs: 'x'.repeat(30000),
      });

      const result = await handleApplicationAction(
        { action: 'logs', uuid: 'app-uuid-1', max_chars: 20000 },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.logs_truncated).toBe(true);
    });

    it('superRefine rejects neither uuid nor deployment_uuid', async () => {
      await expect(
        handleApplicationAction({ action: 'logs' }, testEnv),
      ).rejects.toThrow();
    });

    it('superRefine rejects both uuid and deployment_uuid', async () => {
      await expect(
        handleApplicationAction(
          { action: 'logs', uuid: 'x', deployment_uuid: 'y' },
          testEnv,
        ),
      ).rejects.toThrow();
    });

    it('rejects follow:true per D-05', () => {
      const parsed = applicationActionSchema.safeParse({
        action: 'logs',
        uuid: 'x',
        follow: true,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('APP-11 build logs', () => {
    it('build logs happy path returns entries metadata', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({
        status: 'finished',
        logs: JSON.stringify([
          { output: 'build line1', type: 'stdout', hidden: false },
          { output: 'build line2', type: 'stdout', hidden: false },
        ]),
      });

      const result = await handleApplicationAction(
        { action: 'logs', deployment_uuid: 'dep-uuid' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.deployment_uuid).toBe('dep-uuid');
      expect(result.data.status).toBe('finished');
      expect(result.data.logs_lines).toEqual(['build line1', 'build line2']);
      expect(result.data.logs_truncated).toBe(false);
      expect(result.data.entries_total).toBe(2);
      expect(result.data.entries_hidden).toBe(0);
      expect(result.data.entries_shown).toBe(2);
    });

    it('build logs hidden filter excludes hidden entries by default', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({
        status: 'finished',
        logs: JSON.stringify([
          { output: 'build line1', type: 'stdout', hidden: false },
          { output: 'build line2', type: 'stdout', hidden: false },
          { output: 'hidden line', type: 'stdout', hidden: true },
        ]),
      });

      const result = await handleApplicationAction(
        { action: 'logs', deployment_uuid: 'dep-uuid' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.data.logs_lines).not.toContain('hidden line');
      expect(result.data.entries_total).toBe(3);
      expect(result.data.entries_hidden).toBe(1);
      expect(result.data.entries_shown).toBe(2);
    });

    it('build logs include_hidden:true shows hidden entries', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({
        status: 'finished',
        logs: JSON.stringify([
          { output: 'build line1', type: 'stdout', hidden: false },
          { output: 'build line2', type: 'stdout', hidden: false },
          { output: 'hidden line', type: 'stdout', hidden: true },
        ]),
      });

      const result = await handleApplicationAction(
        {
          action: 'logs',
          deployment_uuid: 'dep-uuid',
          include_hidden: true,
        },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.data.logs_lines).toContain('hidden line');
      expect(result.data.entries_shown).toBe(3);
    });

    it('build logs type stderr filter returns only stderr entries', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({
        status: 'finished',
        logs: JSON.stringify([
          { output: 'stdout line', type: 'stdout', hidden: false },
          { output: 'stderr line', type: 'stderr', hidden: false },
          { output: 'stderr line2', type: 'stderr', hidden: false },
        ]),
      });

      const result = await handleApplicationAction(
        {
          action: 'logs',
          deployment_uuid: 'dep-uuid',
          type: 'stderr',
        },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.data.logs_lines).toEqual(['stderr line', 'stderr line2']);
      expect(result.data.entries_shown).toBe(2);
    });

    it('build logs without logs field returns COOLIFY_403_SENSITIVE_REQUIRED', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({ status: 'finished' });

      const result = await handleApplicationAction(
        { action: 'logs', deployment_uuid: 'dep-uuid' },
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

    it('build logs defensive fallback slices non-JSON logs string', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({
        status: 'finished',
        logs: 'plain line1\nplain line2\nplain line3',
      });

      const result = await handleApplicationAction(
        { action: 'logs', deployment_uuid: 'dep-uuid' },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      expect(result.data.logs_lines).toEqual([
        'plain line1',
        'plain line2',
        'plain line3',
      ]);
      expect(result.data.entries_total).toBe(result.data.total_lines);
      expect(result.data.entries_hidden).toBe(0);
    });

    it('build logs offset pagination applies after parse+filter+flatten', async () => {
      vi.mocked(fetchDeployment).mockResolvedValue({
        status: 'finished',
        logs: JSON.stringify(
          Array.from({ length: 10 }, (_, i) => ({
            output: `build line${i + 1}`,
            type: 'stdout',
            hidden: false,
          })),
        ),
      });

      const result = await handleApplicationAction(
        {
          action: 'logs',
          deployment_uuid: 'dep-uuid',
          offset: 2,
          lines: 5,
        },
        testEnv,
      );

      expect(isApplicationErrorResult(result)).toBe(false);
      if (isApplicationErrorResult(result)) return;

      // sliceLogBlob: skip offset lines, then return last `lines` of remainder (tail-of-tail)
      expect(result.data.logs_lines).toEqual([
        'build line6',
        'build line7',
        'build line8',
        'build line9',
        'build line10',
      ]);
    });
  });

  describe('SVC-03 service lifecycle', () => {
    beforeEach(() => {
      vi.mocked(fetchResources).mockResolvedValue([mockServiceRedisProd]);
    });

    it('start by uuid calls triggerServiceStart', async () => {
      const result = await handleServiceAction(
        { action: 'start', uuid: 'svc-uuid-prod' },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        uuid: 'svc-uuid-prod',
        action: 'start',
        status: 'requested',
      });
      expect(triggerServiceStart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'svc-uuid-prod',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('stop by name single-hit calls triggerServiceStop', async () => {
      const result = await handleServiceAction(
        { action: 'stop', name: 'redis' },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerServiceStop).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'svc-uuid-prod',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('restart by name single-hit calls triggerServiceRestart with latest=false', async () => {
      const result = await handleServiceAction(
        { action: 'restart', name: 'redis' },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerServiceRestart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'svc-uuid-prod',
        false,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('multi-match name returns COOLIFY_AMBIGUOUS_MATCH with project+env context', async () => {
      vi.mocked(fetchResources).mockResolvedValue(
        mockResourcesWithServiceAndDatabase,
      );

      const result = await handleServiceAction(
        { action: 'start', name: 'redis' },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(true);
      if (!isServiceErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
      const hints = result.structuredContent.error.recoveryHints.join(' ');
      expect(hints).toContain('project=proj-a');
      expect(hints).toContain('environment=production');
      expect(hints).toContain('project=proj-b');
      expect(hints).toContain('environment=staging');
      expect(triggerServiceStart).not.toHaveBeenCalled();
    });
  });

  describe('SVC-03 database lifecycle', () => {
    beforeEach(() => {
      vi.mocked(fetchResources).mockResolvedValue([mockDatabasePgProd]);
    });

    it('start by uuid calls triggerDatabaseStart', async () => {
      const result = await handleDatabaseAction(
        { action: 'start', uuid: 'db-uuid-prod' },
        testEnv,
      );

      expect(isDatabaseErrorResult(result)).toBe(false);
      if (isDatabaseErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerDatabaseStart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'db-uuid-prod',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('stop by name single-hit calls triggerDatabaseStop', async () => {
      const result = await handleDatabaseAction(
        { action: 'stop', name: 'pg' },
        testEnv,
      );

      expect(isDatabaseErrorResult(result)).toBe(false);
      if (isDatabaseErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerDatabaseStop).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'db-uuid-prod',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('restart by name single-hit calls triggerDatabaseRestart without latest param', async () => {
      const result = await handleDatabaseAction(
        { action: 'restart', name: 'pg' },
        testEnv,
      );

      expect(isDatabaseErrorResult(result)).toBe(false);
      if (isDatabaseErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(triggerDatabaseRestart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'db-uuid-prod',
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('multi-match name returns COOLIFY_AMBIGUOUS_MATCH with project+env context', async () => {
      vi.mocked(fetchResources).mockResolvedValue(
        mockResourcesWithServiceAndDatabase,
      );

      const result = await handleDatabaseAction(
        { action: 'start', name: 'pg' },
        testEnv,
      );

      expect(isDatabaseErrorResult(result)).toBe(true);
      if (!isDatabaseErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
      const hints = result.structuredContent.error.recoveryHints.join(' ');
      expect(hints).toContain('project=proj-a');
      expect(hints).toContain('environment=production');
      expect(triggerDatabaseStart).not.toHaveBeenCalled();
    });

    it('database.deploy action rejected by Zod per D-18', () => {
      expect(
        databaseActionSchema.safeParse({
          action: 'deploy',
          uuid: 'db-uuid-prod',
        }).success,
      ).toBe(false);
    });

    it('database.restart rejects pull_latest per D-16', () => {
      expect(
        databaseActionSchema.safeParse({
          action: 'restart',
          uuid: 'db-uuid-prod',
          pull_latest: true,
        }).success,
      ).toBe(false);
    });
  });

  describe('SVC-05 service deploy', () => {
    beforeEach(() => {
      vi.mocked(fetchResources).mockResolvedValue([mockServiceRedisProd]);
    });

    it('deploy pull_latest=false maps to triggerServiceRestart latest=false', async () => {
      const result = await handleServiceAction(
        { action: 'deploy', uuid: 'svc-uuid-prod', pull_latest: false },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        uuid: 'svc-uuid-prod',
        action: 'deploy',
        status: 'requested',
        pull_latest: false,
      });
      expect(triggerServiceRestart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'svc-uuid-prod',
        false,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('deploy pull_latest=true maps to triggerServiceRestart latest=true', async () => {
      const result = await handleServiceAction(
        { action: 'deploy', uuid: 'svc-uuid-prod', pull_latest: true },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.ok).toBe(true);
      expect(result.data.pull_latest).toBe(true);
      expect(triggerServiceRestart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'svc-uuid-prod',
        true,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('deploy defaults pull_latest to false', async () => {
      const result = await handleServiceAction(
        { action: 'deploy', uuid: 'svc-uuid-prod' },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.data.pull_latest).toBe(false);
      expect(triggerServiceRestart).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'svc-uuid-prod',
        false,
        testEnv.COOLIFY_VERIFY_SSL,
      );
    });

    it('deploy response has no deployment_uuid or wait field per D-20', async () => {
      const result = await handleServiceAction(
        { action: 'deploy', uuid: 'svc-uuid-prod' },
        testEnv,
      );

      expect(isServiceErrorResult(result)).toBe(false);
      if (isServiceErrorResult(result)) return;

      expect(result.data).not.toHaveProperty('deployment_uuid');
      expect(result.data).not.toHaveProperty('wait');
    });
  });

  describe('backstop cases', () => {
    it('service.restart rejects pull_latest per D-16', () => {
      expect(
        serviceActionSchema.safeParse({
          action: 'restart',
          uuid: 'svc-uuid-prod',
          pull_latest: true,
        }).success,
      ).toBe(false);
    });

    it('runtime logs multi-match returns COOLIFY_AMBIGUOUS_MATCH', async () => {
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

    it('service.logs action rejected by Zod per D-04 amended', () => {
      expect(
        serviceActionSchema.safeParse({
          action: 'logs',
          uuid: 'svc-uuid-prod',
        }).success,
      ).toBe(false);
    });

    it('database.logs action rejected by Zod per D-04 amended', () => {
      expect(
        databaseActionSchema.safeParse({
          action: 'logs',
          uuid: 'db-uuid-prod',
        }).success,
      ).toBe(false);
    });
  });
});
