import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  diagnoseToolSchema,
  handleDiagnoseAction,
  isDiagnoseErrorResult,
} from './diagnose.js';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

vi.mock('../../api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchApplicationEnvs: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchResources: vi.fn(),
  fetchServer: vi.fn(),
  fetchServerResources: vi.fn(),
  fetchServerDomains: vi.fn(),
  fetchServers: vi.fn(),
  triggerServerValidate: vi.fn(),
}));

import {
  fetchApplication,
  fetchApplicationEnvs,
  fetchAppDeployments,
  fetchResources,
  fetchServer,
  fetchServerResources,
  fetchServerDomains,
  fetchServers,
  triggerServerValidate,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockHealthyApp = {
  uuid: 'app-unhealthy',
  name: 'failing-node-app',
  status: 'unhealthy',
  health_check_status: 'unhealthy',
  fqdn: 'https://fail.example.com',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'online-node', uuid: 'srv-online' },
  updated_at: '2026-07-12T02:30:00.000Z',
};

const mockMixedAppEnvs = [
  { id: 1, key: 'PORT', value: '3000', is_buildtime: false },
  { id: 2, key: 'MODE', value: 'production', is_buildtime: false },
];

const mockMixedAppDeployments = [
  {
    id: 101,
    deployment_uuid: 'dep-1',
    git_commit_sha: 'abc123',
    status: 'finished',
    created_at: '2026-07-12T01:00:00.000Z',
    updated_at: '2026-07-12T01:05:00.000Z',
    finished_at: '2026-07-12T01:05:00.000Z',
  },
  {
    id: 102,
    deployment_uuid: 'dep-2',
    git_commit_sha: 'def456',
    status: 'failed',
    created_at: '2026-07-12T02:00:00.000Z',
    updated_at: '2026-07-12T02:10:00.000Z',
    finished_at: '2026-07-12T02:10:00.000Z',
  },
  {
    id: 103,
    deployment_uuid: 'dep-3',
    git_commit_sha: 'ghi789',
    status: 'queued',
    created_at: '2026-07-12T03:00:00.000Z',
    updated_at: '2026-07-12T03:00:00.000Z',
    finished_at: null,
  },
];

const mockMixedResources = [
  {
    uuid: 'app-unhealthy',
    name: 'failing-node-app',
    type: 'application' as const,
    status: 'unhealthy',
    fqdn: 'https://fail.example.com',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-07-12T02:30:00.000Z',
  },
  {
    uuid: 'db-stopped',
    name: 'stopped-postgres',
    type: 'database' as const,
    status: 'exited:0',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-07-12T02:45:00.000Z',
  },
];

const mockMixedServers = [
  {
    uuid: 'srv-offline',
    name: 'offline-node',
    ip: '1.2.3.4',
    settings: { is_reachable: false },
    updated_at: '2026-07-12T01:00:00.000Z',
  },
  {
    uuid: 'srv-online',
    name: 'online-node',
    ip: '5.6.7.8',
    settings: { is_reachable: true },
    updated_at: '2026-07-12T02:00:00.000Z',
  },
];

const mockOnlineServer = {
  uuid: 'srv-online',
  name: 'online-node',
  ip: '5.6.7.8',
  settings: { is_reachable: true },
  updated_at: '2026-07-12T02:00:00.000Z',
};

const mockOfflineServer = {
  uuid: 'srv-offline',
  name: 'offline-node',
  ip: '1.2.3.4',
  settings: { is_reachable: false },
  updated_at: '2026-07-12T01:00:00.000Z',
};

const mockMixedServerResources = [
  {
    uuid: 'app-unhealthy',
    name: 'failing-node-app',
    type: 'application',
    status: 'unhealthy',
    fqdn: 'https://fail.example.com',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-07-12T02:30:00.000Z',
  },
  {
    uuid: 'db-stopped',
    name: 'stopped-postgres',
    type: 'database',
    status: 'exited:0',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-07-12T02:45:00.000Z',
  },
  {
    uuid: 'svc-running',
    name: 'healthy-redis',
    type: 'service',
    status: 'running',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-07-12T03:00:00.000Z',
  },
];

const mockMixedServerDomains = [
  {
    ip: '5.6.7.8',
    ipv4: '5.6.7.8',
    ipv6: null,
    domain: 'online-node.example.com',
  },
];

function makeManyDeployments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    deployment_uuid: `dep-${i + 1}`,
    git_commit_sha: `sha${i}`,
    status: 'finished',
    created_at: `2026-07-12T0${i % 10}:00:00.000Z`,
    updated_at: `2026-07-12T0${i % 10}:05:00.000Z`,
    finished_at: `2026-07-12T0${i % 10}:05:00.000Z`,
  }));
}

describe('diagnoseToolSchema', () => {
  it('parses valid app action with uuid', () => {
    const result = diagnoseToolSchema.safeParse({ action: 'app', uuid: 'app-1' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.action).toBe('app');
    if (result.data.action === 'app') {
      expect(result.data.uuid).toBe('app-1');
      expect(result.data.limit).toBeUndefined();
    }
  });

  it('parses valid app action with limit 25', () => {
    const result = diagnoseToolSchema.safeParse({
      action: 'app',
      uuid: 'x',
      limit: 25,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    if (result.data.action === 'app') {
      expect(result.data.limit).toBe(25);
    }
  });

  it('defaults limit to 10 when omitted', () => {
    const result = diagnoseToolSchema.safeParse({ action: 'app', uuid: 'x' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    if (result.data.action === 'app') {
      expect(result.data.limit).toBeUndefined();
    }
  });

  it('rejects limit above 50', () => {
    expect(
      diagnoseToolSchema.safeParse({ action: 'app', uuid: 'x', limit: 51 }).success,
    ).toBe(false);
  });

  it('accepts limit 50', () => {
    const result = diagnoseToolSchema.safeParse({
      action: 'app',
      uuid: 'x',
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it('parses valid server action with uuid', () => {
    const result = diagnoseToolSchema.safeParse({
      action: 'server',
      uuid: 'srv-1',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    if (result.data.action === 'server') {
      expect(result.data.trigger_validate).toBeUndefined();
    }
  });

  it('parses valid scan action without identifier', () => {
    const result = diagnoseToolSchema.safeParse({ action: 'scan' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.action).toBe('scan');
  });

  it('rejects missing action', () => {
    expect(diagnoseToolSchema.safeParse({ uuid: 'x' }).success).toBe(false);
  });

  it('rejects app action without identifier', () => {
    expect(
      diagnoseToolSchema.safeParse({ action: 'app', limit: 10 }).success,
    ).toBe(false);
  });

  it('rejects app action with no identifier and no limit', () => {
    expect(diagnoseToolSchema.safeParse({ action: 'app' }).success).toBe(false);
  });

  it('rejects server action without identifier', () => {
    expect(
      diagnoseToolSchema.safeParse({ action: 'server', limit: 10 }).success,
    ).toBe(false);
  });
});

describe('handleDiagnoseAction app', () => {
  beforeEach(() => {
    vi.mocked(fetchApplication).mockReset();
    vi.mocked(fetchApplicationEnvs).mockReset();
    vi.mocked(fetchAppDeployments).mockReset();
    vi.mocked(fetchResources).mockReset();

    vi.mocked(fetchApplication).mockResolvedValue(mockHealthyApp);
    vi.mocked(fetchApplicationEnvs).mockResolvedValue(mockMixedAppEnvs);
    vi.mocked(fetchAppDeployments).mockResolvedValue(mockMixedAppDeployments);
    vi.mocked(fetchResources).mockResolvedValue(mockMixedResources);
  });

  it('returns zero-match with hint when no applications match', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', query: 'nonexistent-app-xyz' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;

    expect(result.data).toMatchObject({
      matches: [],
      hint: 'Re-run diagnose with a specific UUID',
    });
    expect(fetchApplication).not.toHaveBeenCalled();
  });

  it('returns multi-match ranked Top 10 with hint', async () => {
    const manyApps = Array.from({ length: 12 }, (_, i) => ({
      uuid: `app-${i}`,
      name: `web-app-${i}`,
      type: 'application',
      status: 'running',
      fqdn: `https://app${i}.example.com`,
      project: { name: 'prod' },
      server: { name: 'srv' },
      updated_at: '2026-07-12T00:00:00.000Z',
    }));
    vi.mocked(fetchResources).mockResolvedValue(manyApps);

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', query: 'web-app' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;

    expect('matches' in result.data).toBe(true);
    if (!('matches' in result.data)) return;

    expect(result.data.matches.length).toBe(10);
    expect(result.data.hint).toBe('Re-run diagnose with a specific UUID');
    expect(fetchApplication).not.toHaveBeenCalled();
  });

  it('returns D-05 fields on single match via query', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', query: 'failing-node' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) {
      throw new Error('expected single-match diagnose data');
    }

    expect(result.data).toMatchObject({
      uuid: 'app-unhealthy',
      name: 'failing-node-app',
      fqdn: 'https://fail.example.com',
      project_name: 'prod',
      server_name: 'online-node',
      status: 'unhealthy',
      health_check_status: 'unhealthy',
      env_count: 2,
      updated_at: '2026-07-12T02:30:00.000Z',
    });
    expect(result.data.last_deployment).toMatchObject({
      commit: 'abc123',
      status: 'finished',
    });
    expect(result.data.recent_deployments.length).toBeLessThanOrEqual(10);
    expect(result.data.hints.length).toBeGreaterThan(0);
    expect(result.data.hints[0]).toMatchObject({
      tool: expect.any(String),
      action: expect.any(String),
      args: expect.any(Object),
      label: expect.any(String),
      available_in_phase: expect.any(Number),
    });
  });

  it('skips matching when uuid is explicit', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', uuid: 'app-unhealthy' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) {
      throw new Error('expected single-match diagnose data');
    }

    expect(fetchResources).not.toHaveBeenCalled();
    expect(fetchApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-unhealthy',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.data.uuid).toBe('app-unhealthy');
  });

  it('never serializes env values — env_count is integer only', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', uuid: 'app-unhealthy' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(typeof result.data.env_count).toBe('number');
    expect(Array.isArray(result.data.env_count)).toBe(false);
    const serialized = JSON.stringify(result.data);
    expect(serialized).not.toContain('DATABASE_URL');
    expect(serialized).not.toContain('3000');
    expect(serialized).not.toContain('production');
  });

  it('degrades env_count to null on 403 while keeping deployments', async () => {
    vi.mocked(fetchApplicationEnvs).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_401',
        message: 'Coolify API returned HTTP 403',
        recoveryHints: ['Check token scopes'],
        httpStatus: 403,
      }),
    );

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', uuid: 'app-unhealthy' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.env_count).toBeNull();
    expect(result.data.recent_deployments.length).toBeGreaterThan(0);
  });

  it('returns COOLIFY_404 when fetchApplication fails', async () => {
    vi.mocked(fetchApplication).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_404',
        message: 'Coolify API returned HTTP 404',
        recoveryHints: ['Check UUID'],
        httpStatus: 404,
      }),
    );

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', uuid: 'missing-app' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(true);
    if (isDiagnoseErrorResult(result)) {
      expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    }
  });

  it('defaults recent_deployments to limit 10', async () => {
    vi.mocked(fetchAppDeployments).mockResolvedValue(makeManyDeployments(15));

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'app', uuid: 'app-unhealthy' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.recent_deployments.length).toBe(10);
  });

  it('honors limit 50 for recent_deployments', async () => {
    vi.mocked(fetchAppDeployments).mockResolvedValue(makeManyDeployments(60));

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'app',
        uuid: 'app-unhealthy',
        limit: 50,
      }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.recent_deployments.length).toBe(50);
  });

  it('returns full projection with raw_application and deployment logs', async () => {
    const deploymentsWithLogs = [
      {
        ...mockMixedAppDeployments[0],
        logs: 'Build step 1 complete\nBuild step 2 complete',
      },
    ];
    vi.mocked(fetchAppDeployments).mockResolvedValue(deploymentsWithLogs);

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'app',
        uuid: 'app-unhealthy',
        projection: 'full',
      }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect('raw_application' in result.data).toBe(true);
    expect('deployments' in result.data).toBe(true);
    if ('deployments' in result.data) {
      expect(result.data.deployments[0]).toHaveProperty('logs');
    }
  });

  it('rejects table+full with COOLIFY_422', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'app',
        uuid: 'app-unhealthy',
        projection: 'full',
        format: 'table',
      }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(true);
    if (isDiagnoseErrorResult(result)) {
      expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    }
  });
});

describe('handleDiagnoseAction app reveal (OUT-02)', () => {
  beforeEach(() => {
    vi.mocked(fetchApplication).mockReset();
    vi.mocked(fetchApplicationEnvs).mockReset();
    vi.mocked(fetchAppDeployments).mockReset();
    vi.mocked(fetchApplication).mockResolvedValue({
      ...mockHealthyApp,
      secret_env: 'env-secret',
    });
    vi.mocked(fetchApplicationEnvs).mockResolvedValue([]);
    vi.mocked(fetchAppDeployments).mockResolvedValue(mockMixedAppDeployments);
  });

  it('masks raw_application secrets when reveal is false on full projection', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'app',
        uuid: 'app-unhealthy',
        projection: 'full',
      }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    const raw = result.data.raw_application as Record<string, unknown>;
    expect(raw.secret_env).toBe('***');
  });

  it('returns plaintext raw_application secrets when reveal is true on full projection', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'app',
        uuid: 'app-unhealthy',
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

  it('omits raw_application on summary projection even when reveal is true', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'app',
        uuid: 'app-unhealthy',
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
});

describe('handleDiagnoseAction server', () => {
  beforeEach(() => {
    vi.mocked(fetchServer).mockReset();
    vi.mocked(fetchServerResources).mockReset();
    vi.mocked(fetchServerDomains).mockReset();
    vi.mocked(fetchServers).mockReset();
    vi.mocked(triggerServerValidate).mockReset();

    vi.mocked(fetchServer).mockResolvedValue(mockOnlineServer);
    vi.mocked(fetchServerResources).mockResolvedValue(mockMixedServerResources);
    vi.mocked(fetchServerDomains).mockResolvedValue(mockMixedServerDomains);
    vi.mocked(fetchServers).mockResolvedValue(mockMixedServers);
    vi.mocked(triggerServerValidate).mockResolvedValue(undefined);
  });

  it('returns zero-match with hint when no servers match', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', query: 'nonexistent-server-xyz' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;

    expect(result.data).toMatchObject({
      matches: [],
      hint: 'Re-run diagnose with a specific UUID',
    });
    expect(fetchServer).not.toHaveBeenCalled();
  });

  it('returns multi-match ranked Top 10 with hint', async () => {
    const manyServers = Array.from({ length: 12 }, (_, i) => ({
      uuid: `srv-${i}`,
      name: `node-${i}`,
      ip: `10.0.0.${i}`,
      settings: { is_reachable: true },
      updated_at: '2026-07-12T00:00:00.000Z',
    }));
    vi.mocked(fetchServers).mockResolvedValue(manyServers);

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', query: 'node' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;

    expect('matches' in result.data).toBe(true);
    if (!('matches' in result.data)) return;

    expect(result.data.matches.length).toBe(10);
    expect(result.data.hint).toBe('Re-run diagnose with a specific UUID');
    expect(fetchServer).not.toHaveBeenCalled();
  });

  it('returns D-09 fields on single match via query', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', query: 'online-node' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) {
      throw new Error('expected single-match diagnose data');
    }

    expect(result.data).toMatchObject({
      uuid: 'srv-online',
      name: 'online-node',
      ip: '5.6.7.8',
      status: 'running',
      is_reachable: true,
      validation_started: true,
      updated_at: '2026-07-12T02:00:00.000Z',
    });
    expect(result.data.resources_counts.applications.total).toBe(1);
    expect(result.data.resources_counts.databases.total).toBe(1);
    expect(result.data.resources_counts.services.total).toBe(1);
    expect(result.data).not.toHaveProperty('resources');
    expect(result.data.domains[0]).toEqual({
      ip: '5.6.7.8',
      ipv4: '5.6.7.8',
      ipv6: null,
      domain: 'online-node.example.com',
    });
    expect(Array.isArray(result.data.hints)).toBe(true);
    expect(triggerServerValidate).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'srv-online',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('skips matching when uuid is explicit', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', uuid: 'srv-online' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) {
      throw new Error('expected single-match diagnose data');
    }

    expect(fetchServers).not.toHaveBeenCalled();
    expect(fetchServer).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'srv-online',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.data.uuid).toBe('srv-online');
  });

  it('returns resources_counts with zeros on 403 for resources', async () => {
    vi.mocked(fetchServerResources).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_401',
        message: 'Coolify API returned HTTP 403',
        recoveryHints: ['Check token scopes'],
        httpStatus: 403,
      }),
    );

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', uuid: 'srv-online' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.resources_counts.applications.total).toBe(0);
    expect(result.data.resources_counts.databases.total).toBe(0);
    expect(result.data.resources_counts.services.total).toBe(0);
    expect(result.data.name).toBe('online-node');
  });

  it('returns domains empty array on 403 for domains', async () => {
    vi.mocked(fetchServerDomains).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_401',
        message: 'Coolify API returned HTTP 403',
        recoveryHints: ['Check token scopes'],
        httpStatus: 403,
      }),
    );

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', uuid: 'srv-online' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.domains).toEqual([]);
    expect(result.data.resources_counts.applications.total).toBe(1);
  });

  it('returns validation_started false on validate failure while keeping response', async () => {
    vi.mocked(triggerServerValidate).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_500',
        message: 'Coolify API returned HTTP 500',
        recoveryHints: ['Retry later'],
        httpStatus: 500,
      }),
    );

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', uuid: 'srv-online' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.validation_started).toBe(false);
    expect(result.data.uuid).toBe('srv-online');
    expect(result.data.domains.length).toBe(1);
  });

  it('returns COOLIFY_404 when fetchServer fails', async () => {
    vi.mocked(fetchServer).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_404',
        message: 'Coolify API returned HTTP 404',
        recoveryHints: ['Check UUID'],
        httpStatus: 404,
      }),
    );

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', uuid: 'missing-server' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(true);
    if (isDiagnoseErrorResult(result)) {
      expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    }
  });

  it('skips triggerServerValidate when trigger_validate is false', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'server',
        uuid: 'srv-online',
        trigger_validate: false,
      }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(triggerServerValidate).not.toHaveBeenCalled();
    expect(result.data.validation_started).toBe(false);
  });

  it('rejects table+full with COOLIFY_422', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({
        action: 'server',
        uuid: 'srv-online',
        projection: 'full',
        format: 'table',
      }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(true);
    if (isDiagnoseErrorResult(result)) {
      expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    }
  });

  it('yields unreachable server hint with diagnose server action phase 3', async () => {
    vi.mocked(fetchServer).mockResolvedValue(mockOfflineServer);

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'server', uuid: 'srv-offline' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.data.is_reachable).toBe(false);
    expect(result.data.hints).toContainEqual(
      expect.objectContaining({
        tool: 'diagnose',
        action: 'server',
        args: { uuid: 'srv-offline' },
        available_in_phase: 3,
      }),
    );
  });
});

describe('handleDiagnoseAction scan', () => {
  beforeEach(() => {
    vi.mocked(fetchServers).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchServers).mockResolvedValue(mockMixedServers);
    vi.mocked(fetchResources).mockResolvedValue(mockMixedResources);
  });

  it('enumerates fleet with exactly 2 HTTP calls', async () => {
    await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan' }),
      testEnv,
    );

    expect(fetchServers).toHaveBeenCalledTimes(1);
    expect(fetchResources).toHaveBeenCalledTimes(1);
    expect(fetchServers).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(fetchResources).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns mixed-health issues grouped by severity', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) {
      throw new Error('expected scan data with severity buckets');
    }

    expect(result.ok).toBe(true);
    expect(result.data.critical).toHaveLength(1);
    expect(result.data.critical[0]).toMatchObject({
      resource_type: 'server',
      uuid: 'srv-offline',
      name: 'offline-node',
      status: 'unreachable',
      issue: 'Server unreachable',
    });
    expect(result.data.high).toHaveLength(1);
    expect(result.data.high[0]).toMatchObject({
      resource_type: 'application',
      uuid: 'app-unhealthy',
      name: 'failing-node-app',
      status: 'unhealthy',
      issue: 'application unhealthy',
    });
    expect(result.data.info).toHaveLength(1);
    expect(result.data.info[0]).toMatchObject({
      resource_type: 'database',
      uuid: 'db-stopped',
      name: 'stopped-postgres',
      status: 'exited:0',
      issue: 'database stopped',
    });
  });

  it('returns empty buckets for empty fleet', async () => {
    vi.mocked(fetchServers).mockResolvedValue([]);
    vi.mocked(fetchResources).mockResolvedValue([]);

    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      critical: [],
      high: [],
      info: [],
    });
  });

  it('places stopped resources in info bucket not high per D-14', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) return;

    const stoppedUuid = 'db-stopped';
    expect(result.data.high.some((i) => i.uuid === stoppedUuid)).toBe(false);
    expect(result.data.info.some((i) => i.uuid === stoppedUuid)).toBe(true);
  });

  it('does not classify reachable servers as critical', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) return;

    expect(result.data.critical.some((i) => i.uuid === 'srv-online')).toBe(
      false,
    );
    expect(result.data.critical.every((i) => i.uuid === 'srv-offline')).toBe(
      true,
    );
  });

  it('returns structured FollowUpHint objects per D-15', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan' }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) return;

    const allIssues = [
      ...result.data.critical,
      ...result.data.high,
      ...result.data.info,
    ];
    expect(allIssues.length).toBeGreaterThan(0);

    for (const issue of allIssues) {
      expect(issue).toHaveProperty('resource_type');
      expect(issue).toHaveProperty('uuid');
      expect(issue).toHaveProperty('name');
      expect(issue).toHaveProperty('status');
      expect(issue).toHaveProperty('issue');
      expect(typeof issue.issue).toBe('string');
      expect(issue.hint).toMatchObject({
        tool: expect.any(String),
        action: expect.any(String),
        args: expect.any(Object),
        label: expect.any(String),
        available_in_phase: expect.any(Number),
      });
      expect(typeof issue.hint).toBe('object');
    }
  });

  it('includes pagination meta reflecting flattened issue count', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan', page: 1, per_page: 10 }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) return;

    const expectedTotal =
      result.data.critical.length +
      result.data.high.length +
      result.data.info.length;

    expect(result._meta.page).toBe(1);
    expect(result._meta.per_page).toBe(10);
    expect(result._meta.total).toBe(expectedTotal);
    expect(result._meta.total).toBe(3);
  });

  it('honors max_chars via buildReadResponse truncation', async () => {
    const result = await handleDiagnoseAction(
      diagnoseToolSchema.parse({ action: 'scan', max_chars: 1000 }),
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;

    expect(result._meta.max_chars).toBe(1000);
    expect(result._meta.truncated).toBe(true);
    expect(result._formattedText.length).toBeLessThanOrEqual(1000);
  });
});
