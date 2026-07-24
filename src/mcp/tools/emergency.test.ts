import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  emergencyToolSchema,
  handleEmergencyAction,
  isEmergencyErrorResult,
  resolveProjectUuid,
  validateConfirmGate,
} from './emergency.js';
import { CoolifyApiError } from '../../utils/errors.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  triggerAppStop: vi.fn(),
  triggerAppRestart: vi.fn(),
  triggerDeploy: vi.fn(),
  fetchDeployment: vi.fn(),
}));

vi.mock('../../utils/deploy-poll.js', () => ({
  pollDeploymentUntilTerminal: vi.fn(),
}));

import {
  fetchResources,
  fetchProjects,
  fetchProject,
  triggerAppStop,
  triggerAppRestart,
  triggerDeploy,
  fetchDeployment,
} from '../../api/client.js';
import { pollDeploymentUntilTerminal } from '../../utils/deploy-poll.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mixedResourcesFixture = [
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
    type: 'application',
    uuid: 'app-other-project',
    name: 'Other Project App',
    status: 'exited',
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

describe('emergencyToolSchema', () => {
  it('accepts stop_all without confirm (handler defaults to false)', () => {
    const parsed = emergencyToolSchema.safeParse({ action: 'stop_all' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.confirm).toBeUndefined();
  });

  it('rejects redeploy_project without project identifier', () => {
    expect(
      emergencyToolSchema.safeParse({ action: 'redeploy_project' }).success,
    ).toBe(false);
  });

  it('accepts redeploy_project with project_uuid', () => {
    expect(
      emergencyToolSchema.safeParse({
        action: 'redeploy_project',
        project_uuid: 'p1',
      }).success,
    ).toBe(true);
  });

  it('accepts restart_project with project_name', () => {
    expect(
      emergencyToolSchema.safeParse({
        action: 'restart_project',
        project_name: 'p1',
      }).success,
    ).toBe(true);
  });

  it('rejects restart_project with force via strict()', () => {
    expect(
      emergencyToolSchema.safeParse({
        action: 'restart_project',
        project_uuid: 'p1',
        force: true,
      }).success,
    ).toBe(false);
  });

  it('rejects restart_project with wait via strict()', () => {
    expect(
      emergencyToolSchema.safeParse({
        action: 'restart_project',
        project_uuid: 'p1',
        wait: true,
      }).success,
    ).toBe(false);
  });
});

describe('validateConfirmGate', () => {
  it('throws COOLIFY_CONFIRM_REQUIRED with preview when confirm is false', async () => {
    await expect(
      validateConfirmGate(
        'stop_all',
        false,
        [
          { uuid: 'a', name: 'A' },
          { uuid: 'b', name: 'B' },
        ],
      ),
    ).rejects.toMatchObject({
      envelope: {
        code: 'COOLIFY_CONFIRM_REQUIRED',
        data: {
          would_affect: 2,
          sample_uuids: ['a', 'b'],
          action: 'stop_all',
        },
      },
    });

    try {
      await validateConfirmGate('stop_all', false, [{ uuid: 'a', name: 'A' }]);
    } catch (error) {
      expect(error).toBeInstanceOf(CoolifyApiError);
      const apiError = error as CoolifyApiError;
      expect(
        apiError.envelope.recoveryHints.some((hint) =>
          hint.includes('Retry with confirm: true'),
        ),
      ).toBe(true);
    }
  });

  it('returns void when confirm is true', async () => {
    await expect(
      validateConfirmGate('stop_all', true, [{ uuid: 'a', name: 'A' }]),
    ).resolves.toBeUndefined();
  });
});

describe('resolveProjectUuid', () => {
  beforeEach(() => {
    vi.mocked(fetchProjects).mockReset();
  });

  it('returns project_uuid without calling fetchProjects', async () => {
    const uuid = await resolveProjectUuid('p-uuid', undefined, testEnv);
    expect(uuid).toBe('p-uuid');
    expect(fetchProjects).not.toHaveBeenCalled();
  });

  it('throws COOLIFY_404 when project_name has zero matches', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([]);
    await expect(
      resolveProjectUuid(undefined, 'nonexistent', testEnv),
    ).rejects.toMatchObject({
      envelope: { code: 'COOLIFY_404' },
    });
  });

  it('throws COOLIFY_AMBIGUOUS_MATCH with ranked list on multi match', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'my-proj-alpha' },
      { uuid: 'proj-2', name: 'my-proj-beta' },
    ]);
    await expect(
      resolveProjectUuid(undefined, 'proj', testEnv),
    ).rejects.toMatchObject({
      envelope: {
        code: 'COOLIFY_AMBIGUOUS_MATCH',
        recoveryHints: expect.arrayContaining([
          '- my-proj-alpha (proj-1)',
          '- my-proj-beta (proj-2)',
        ]),
      },
    });
  });

  it('returns uuid on single project_name match', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-uuid-1', name: 'my-proj' },
    ]);
    await expect(
      resolveProjectUuid(undefined, 'proj', testEnv),
    ).resolves.toBe('proj-uuid-1');
  });
});

describe('handleEmergencyAction stop_all', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerAppStop).mockReset();
    vi.mocked(fetchResources).mockResolvedValue(mixedResourcesFixture);
    vi.mocked(triggerAppStop).mockResolvedValue({});
  });

  it('rejects confirm:false with preview and does not call triggerAppStop', async () => {
    const result = await handleEmergencyAction(
      { action: 'stop_all', confirm: false },
      testEnv,
    );
    expect(isEmergencyErrorResult(result)).toBe(true);
    if (!isEmergencyErrorResult(result)) return;
    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(result.structuredContent.error.data).toMatchObject({
      would_affect: 2,
      sample_uuids: ['app-running-1', 'app-running-2'],
      action: 'stop_all',
    });
    expect(triggerAppStop).not.toHaveBeenCalled();
  });

  it('rejects when confirm omitted (defaults false)', async () => {
    const result = await handleEmergencyAction({ action: 'stop_all' }, testEnv);
    expect(isEmergencyErrorResult(result)).toBe(true);
    if (!isEmergencyErrorResult(result)) return;
    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(triggerAppStop).not.toHaveBeenCalled();
  });

  it('stops running apps only when confirm:true', async () => {
    const result = await handleEmergencyAction(
      { action: 'stop_all', confirm: true },
      testEnv,
    );
    expect(isEmergencyErrorResult(result)).toBe(false);
    if (isEmergencyErrorResult(result)) return;
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
    expect(triggerAppStop).toHaveBeenNthCalledWith(
      1,
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-running-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(triggerAppStop).toHaveBeenNthCalledWith(
      2,
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-running-2',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('continues best-effort when one stop fails', async () => {
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

describe('handleEmergencyAction redeploy_project', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchProject).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(pollDeploymentUntilTerminal).mockReset();
    vi.mocked(fetchResources).mockResolvedValue(mixedResourcesFixture);
    vi.mocked(fetchProject).mockResolvedValue({
      uuid: 'p1',
      environments: [],
    });
    vi.mocked(triggerDeploy).mockResolvedValue({
      deployments: [{ deployment_uuid: 'd1' }],
    });
    vi.mocked(fetchDeployment).mockResolvedValue({ status: 'finished' });
    vi.mocked(pollDeploymentUntilTerminal).mockResolvedValue({
      status: 'finished',
      commit: 'abc',
      created_at: '2026-01-01',
      finished_at: '2026-01-02',
    });
  });

  it('rejects confirm:false with project app count preview', async () => {
    const result = await handleEmergencyAction(
      { action: 'redeploy_project', project_uuid: 'p1', confirm: false },
      testEnv,
    );
    expect(isEmergencyErrorResult(result)).toBe(true);
    if (!isEmergencyErrorResult(result)) return;
    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(result.structuredContent.error.data).toMatchObject({
      would_affect: 2,
      sample_uuids: expect.arrayContaining(['app-running-1', 'app-running-2']),
      action: 'redeploy_project',
    });
    expect(triggerDeploy).not.toHaveBeenCalled();
  });

  it('deploys each project app with force:false by default', async () => {
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

  it('passes force:true to triggerDeploy', async () => {
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

  it('polls deployments when wait:true', async () => {
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
      commit: 'abc',
      logs_available: expect.any(Object),
    });
  });

  it('throws COOLIFY_404 for project_name with zero matches', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([]);
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

  it('throws COOLIFY_AMBIGUOUS_MATCH for project_name with multi matches', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'my-proj-alpha' },
      { uuid: 'proj-2', name: 'my-proj-beta' },
    ]);
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
    expect(triggerDeploy).not.toHaveBeenCalled();
  });

  it('continues best-effort when one deploy fails', async () => {
    vi.mocked(triggerDeploy)
      .mockRejectedValueOnce(new Error('deploy failed'))
      .mockResolvedValueOnce({ deployments: [{ deployment_uuid: 'd2' }] });
    const result = await handleEmergencyAction(
      {
        action: 'redeploy_project',
        project_uuid: 'p1',
        confirm: true,
      },
      testEnv,
    );
    expect(isEmergencyErrorResult(result)).toBe(false);
    if (isEmergencyErrorResult(result)) return;
    expect(result.data.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uuid: 'app-running-1',
          status: 'failed',
          error: 'deploy failed',
        }),
        expect.objectContaining({
          uuid: 'app-running-2',
          status: 'queued',
        }),
      ]),
    );
  });
});

describe('handleEmergencyAction restart_project', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchProject).mockReset();
    vi.mocked(triggerAppRestart).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(fetchResources).mockResolvedValue(mixedResourcesFixture);
    vi.mocked(fetchProject).mockResolvedValue({
      uuid: 'p1',
      environments: [],
    });
    vi.mocked(triggerAppRestart).mockResolvedValue({});
    vi.mocked(triggerDeploy).mockReset();
  });

  it('rejects confirm:false with preview', async () => {
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

  it('restarts each project app when confirm:true', async () => {
    const result = await handleEmergencyAction(
      { action: 'restart_project', project_uuid: 'p1', confirm: true },
      testEnv,
    );
    expect(isEmergencyErrorResult(result)).toBe(false);
    if (isEmergencyErrorResult(result)) return;
    expect(result.data.results).toHaveLength(2);
    expect(triggerAppRestart).toHaveBeenCalledTimes(2);
    expect(triggerDeploy).not.toHaveBeenCalled();
    expect(result.data.results[0]).toMatchObject({
      uuid: 'app-running-1',
      status: 'requested',
    });
  });

  it('matches Coolify 4.1 apps via environment_id when project nest missing', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        type: 'application',
        uuid: 'app-env-23',
        name: 'Env Matched App',
        status: 'running:healthy',
        environment_id: 23,
      },
      {
        type: 'application',
        uuid: 'app-env-99',
        name: 'Other Env App',
        status: 'running:healthy',
        environment_id: 99,
      },
    ]);
    vi.mocked(fetchProject).mockResolvedValue({
      uuid: 'p1',
      environments: [{ id: 23, uuid: 'env-prod', name: 'production' }],
    });

    const preview = await handleEmergencyAction(
      { action: 'restart_project', project_uuid: 'p1', confirm: false },
      testEnv,
    );
    expect(isEmergencyErrorResult(preview)).toBe(true);
    if (!isEmergencyErrorResult(preview)) return;
    expect(preview.structuredContent.error.data?.would_affect).toBe(1);
    expect(preview.structuredContent.error.data?.sample_uuids).toEqual([
      'app-env-23',
    ]);

    const result = await handleEmergencyAction(
      { action: 'restart_project', project_uuid: 'p1', confirm: true },
      testEnv,
    );
    expect(isEmergencyErrorResult(result)).toBe(false);
    if (isEmergencyErrorResult(result)) return;
    expect(result.data.results).toEqual([
      {
        uuid: 'app-env-23',
        name: 'Env Matched App',
        status: 'requested',
      },
    ]);
    expect(triggerAppRestart).toHaveBeenCalledTimes(1);
  });
});

describe('emergency tool server registration', () => {
  it('registers emergency tool with confirm guidance and openWorldHint', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    expect(source).toContain("registerTool(\n    'emergency'");
    const emergencyBlock = source.slice(
      source.indexOf("registerTool(\n    'emergency'"),
      source.indexOf("registerTool(\n    'deployment'") > source.indexOf(
        "registerTool(\n    'emergency'",
      )
        ? source.indexOf("registerTool(\n    'deployment'")
        : source.length,
    );
    // Cursor agent host drops tools annotated destructiveHint:true from the
    // exposed list — keep safety in confirm gate + description instead.
    expect(emergencyBlock).toMatch(/annotations:\s*\{\s*openWorldHint:\s*true\s*\}/);
    expect(emergencyBlock).not.toMatch(/annotations:\s*\{[^}]*destructiveHint:\s*true/);
    expect(emergencyBlock).toContain('emergencyActionsCatalog');
    expect(emergencyBlock).toContain('emergencySafetyFooter');
  });
});
