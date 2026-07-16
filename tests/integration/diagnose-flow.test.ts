import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../src/config/env.js';
import {
  handleDiagnoseAction,
  isDiagnoseErrorResult,
} from '../../src/mcp/tools/diagnose.js';
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
  mockMixedServers,
  mockMixedResources,
  mockMixedAppEnvs,
  mockMixedAppDeployments,
  mockMixedServerResources,
  mockMixedServerDomains,
} from '../fixtures/coolify-mixed-health.js';
import { emptyServers, emptyResources } from '../fixtures/coolify-empty.js';
import { malformedEnvs } from '../fixtures/coolify-malformed.js';

vi.mock('../../src/api/client.js', () => ({
  fetchApplication: vi.fn(),
  fetchApplicationEnvs: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchServer: vi.fn(),
  fetchServerResources: vi.fn(),
  fetchServerDomains: vi.fn(),
  fetchServers: vi.fn(),
  triggerServerValidate: vi.fn(),
  fetchService: vi.fn(),
  fetchDatabase: vi.fn(),
}));

import {
  fetchApplication,
  fetchApplicationEnvs,
  fetchAppDeployments,
  fetchResources,
  fetchProjects,
  fetchProject,
  fetchServer,
  fetchServerResources,
  fetchServerDomains,
  fetchServers,
  triggerServerValidate,
  fetchService,
  fetchDatabase,
} from '../../src/api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: false,
  COOLIFY_MCP_LOG: 'error',
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

const mockOfflineServer = {
  uuid: 'srv-offline',
  name: 'offline-node',
  ip: '1.2.3.4',
  settings: { is_reachable: false },
  updated_at: '2026-07-12T01:00:00.000Z',
};

const mockUnhealthyService = {
  uuid: 'svc-unhealthy',
  name: 'failing-redis',
  status: 'unhealthy',
  fqdn: 'https://redis.example.com',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'online-node', uuid: 'srv-online' },
  updated_at: '2026-07-12T03:00:00.000Z',
};

const mockStoppedDatabase = {
  uuid: 'db-stopped',
  name: 'stopped-postgres',
  status: 'exited:0',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'online-node', uuid: 'srv-online' },
  updated_at: '2026-07-12T02:45:00.000Z',
};

function setupMixedHealthMocks(): void {
  vi.mocked(fetchApplication).mockResolvedValue(mockHealthyApp);
  vi.mocked(fetchApplicationEnvs).mockResolvedValue(mockMixedAppEnvs);
  vi.mocked(fetchAppDeployments).mockResolvedValue(mockMixedAppDeployments);
  vi.mocked(fetchResources).mockResolvedValue(mockMixedResources);
  vi.mocked(fetchProjects).mockResolvedValue([]);
  vi.mocked(fetchProject).mockResolvedValue({});
  vi.mocked(fetchServer).mockResolvedValue(mockOfflineServer);
  vi.mocked(fetchServerResources).mockResolvedValue(mockMixedServerResources);
  vi.mocked(fetchServerDomains).mockResolvedValue(mockMixedServerDomains);
  vi.mocked(fetchServers).mockResolvedValue(mockMixedServers);
  vi.mocked(triggerServerValidate).mockResolvedValue(undefined);
  vi.mocked(fetchService).mockResolvedValue(mockUnhealthyService);
  vi.mocked(fetchDatabase).mockResolvedValue(mockStoppedDatabase);
}

describe('diagnose-flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMixedHealthMocks();
  });

  it('diagnose app returns D-05 fields with hints and updated_at', async () => {
    const result = await handleDiagnoseAction(
      { action: 'app', uuid: 'app-unhealthy' },
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) {
      throw new Error('expected single-match diagnose data');
    }

    expect(result.ok).toBe(true);
    expect(result.data.uuid).toBe('app-unhealthy');
    expect(Array.isArray(result.data.hints)).toBe(true);
    expect(typeof result.data.updated_at).toBe('string');
    expect(result.data.hints.length).toBeGreaterThan(0);
  });

  it('diagnose server returns D-09 composed view with validation_started', async () => {
    const result = await handleDiagnoseAction(
      { action: 'server', uuid: 'srv-offline' },
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) {
      throw new Error('expected single-match diagnose data');
    }

    expect(result.ok).toBe(true);
    expect(typeof result.data.validation_started).toBe('boolean');
    expect(result.data.resources_counts).toMatchObject({
      applications: expect.any(Object),
      databases: expect.any(Object),
      services: expect.any(Object),
    });
    expect(result.data.domains.length).toBeGreaterThan(0);
  });

  it('diagnose scan returns severity buckets with pagination meta', async () => {
    const result = await handleDiagnoseAction({ action: 'scan' }, testEnv);

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if (!('critical' in result.data)) {
      throw new Error('expected scan data with severity buckets');
    }

    expect(result.ok).toBe(true);
    expect(result.data.critical).toHaveLength(1);
    expect(result.data.high).toHaveLength(1);
    expect(result.data.info).toHaveLength(1);
    expect(result._meta.total).toBe(3);
    expect(result._meta.page).toBe(1);
    expect(result._meta.per_page).toBeGreaterThan(0);
  });

  it('application get includes restart hint per OUT-06', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-unhealthy' },
      testEnv,
    );

    expect(isApplicationErrorResult(result)).toBe(false);
    if (isApplicationErrorResult(result)) return;

    expect(result.ok).toBe(true);
    const hints = result.data.hints as Array<Record<string, unknown>>;
    expect(hints.some((h) => h.action === 'restart')).toBe(true);
  });

  it('service get includes hints per OUT-06', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-unhealthy' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.ok).toBe(true);
    const hints = result.data.hints as Array<Record<string, unknown>>;
    expect(Array.isArray(hints)).toBe(true);
    expect(hints.length).toBeGreaterThan(0);
  });

  it('database get includes hints per OUT-06', async () => {
    const result = await handleDatabaseAction(
      { action: 'get', uuid: 'db-stopped' },
      testEnv,
    );

    expect(isDatabaseErrorResult(result)).toBe(false);
    if (isDatabaseErrorResult(result)) return;

    expect(result.ok).toBe(true);
    const hints = result.data.hints as Array<Record<string, unknown>>;
    expect(Array.isArray(hints)).toBe(true);
    expect(hints.length).toBeGreaterThan(0);
  });

  it('diagnose scan with empty fleet returns empty buckets', async () => {
    vi.mocked(fetchServers).mockResolvedValue(emptyServers);
    vi.mocked(fetchResources).mockResolvedValue(emptyResources);

    const result = await handleDiagnoseAction({ action: 'scan' }, testEnv);

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

  it('diagnose app with malformed envs degrades env_count to null', async () => {
    vi.mocked(fetchApplicationEnvs).mockResolvedValue(
      malformedEnvs as unknown as unknown[],
    );

    const result = await handleDiagnoseAction(
      { action: 'app', uuid: 'app-unhealthy' },
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(false);
    if (isDiagnoseErrorResult(result)) return;
    if ('matches' in result.data) return;

    expect(result.ok).toBe(true);
    expect(result.data.env_count).toBeNull();
    expect(result.data.uuid).toBe('app-unhealthy');
    expect(result.data.name).toBe('failing-node-app');
  });

  it('diagnose app rejects table+full with COOLIFY_422', async () => {
    const result = await handleDiagnoseAction(
      {
        action: 'app',
        uuid: 'app-unhealthy',
        projection: 'full',
        format: 'table',
      },
      testEnv,
    );

    expect(isDiagnoseErrorResult(result)).toBe(true);
    if (!isDiagnoseErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(fetchApplication).not.toHaveBeenCalled();
  });
});
