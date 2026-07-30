/**
 * Wave 0 Nyquist RED scaffolds for Phase 28 intelligence tool.
 * Production modules loaded via dynamic import inside it.fails only —
 * intelligence.ts must not exist yet (Plans 28-01..28-04 flip GREEN).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';
import { mockMixedResources, mockMixedServers } from '../../../tests/fixtures/coolify-mixed-health.js';

vi.mock('../../api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchServers: vi.fn(),
  fetchService: vi.fn(),
  fetchAppDeployments: vi.fn(),
  fetchDatabaseBackups: vi.fn(),
  deleteApplication: vi.fn(),
  deleteService: vi.fn(),
  deleteDatabase: vi.fn(),
}));

import {
  fetchResources,
  fetchServers,
  fetchService,
  fetchAppDeployments,
  fetchDatabaseBackups,
  deleteApplication,
  deleteService,
  deleteDatabase,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const graphFlatResources = [
  {
    uuid: 'db-uuid-1',
    name: 'postgres-main',
    type: 'database',
    status: 'running:healthy',
  },
  {
    uuid: 'app-uuid-1',
    name: 'api',
    type: 'application',
    status: 'running:healthy',
    database_uuid: 'db-uuid-1',
  },
  {
    uuid: 'svc-uuid-1',
    name: 'wordpress',
    type: 'service',
    status: 'running:healthy',
  },
  {
    uuid: 'child-app',
    name: 'wp-app',
    type: 'application',
    status: 'running:healthy',
    application_uuid: 'app-uuid-1',
  },
];

const janitorResources = [
  {
    uuid: 'db-stopped',
    name: 'stopped-postgres',
    type: 'database',
    status: 'exited:0',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-06-01T00:00:00.000Z',
  },
  {
    uuid: 'app-orphan',
    name: 'lonely-app',
    type: 'application',
    status: 'running:healthy',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: '2026-07-12T02:30:00.000Z',
  },
  {
    uuid: 'app-recent-stop',
    name: 'recent-stop',
    type: 'application',
    status: 'stopped',
    project: { name: 'prod', uuid: 'proj-1' },
    server: { name: 'online-node', uuid: 'srv-online' },
    updated_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  vi.mocked(fetchResources).mockReset();
  vi.mocked(fetchServers).mockReset();
  vi.mocked(fetchService).mockReset();
  vi.mocked(fetchAppDeployments).mockReset();
  vi.mocked(fetchDatabaseBackups).mockReset();
  vi.mocked(deleteApplication).mockReset();
  vi.mocked(deleteService).mockReset();
  vi.mocked(deleteDatabase).mockReset();

  vi.mocked(fetchResources).mockResolvedValue(mockMixedResources);
  vi.mocked(fetchServers).mockResolvedValue(mockMixedServers);
  vi.mocked(fetchAppDeployments).mockResolvedValue([
    {
      deployment_uuid: 'dep-fail',
      status: 'failed',
      created_at: '2026-07-12T02:00:00.000Z',
      updated_at: '2026-07-12T02:10:00.000Z',
    },
  ]);
  vi.mocked(fetchDatabaseBackups).mockResolvedValue([]);
  vi.mocked(fetchService).mockResolvedValue({
    uuid: 'svc-uuid-1',
    name: 'wordpress',
    applications: [{ uuid: 'svc-child-app', name: 'wp-app' }],
    databases: [{ uuid: 'svc-child-db', name: 'wp-db' }],
  });
  vi.mocked(deleteApplication).mockResolvedValue({ message: 'Deleted.' });
  vi.mocked(deleteService).mockResolvedValue({ message: 'Deleted.' });
  vi.mocked(deleteDatabase).mockResolvedValue({ message: 'Deleted.' });
});

describe('scorecard (INTEL-01, D-04)', () => {
  it.fails(
    'returns factors deployments/backups/exited_resources/diagnose_scan + overall severity',
    async () => {
      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        { action: 'scorecard' },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(false);
      if (isIntelligenceErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      const factors = data.factors as Record<string, unknown>;
      expect(factors).toMatchObject({
        deployments: expect.anything(),
        backups: expect.anything(),
        exited_resources: expect.anything(),
        diagnose_scan: expect.anything(),
      });
      expect(['critical', 'high', 'info', 'ok']).toContain(data.severityity);
    },
  );
});

describe('findings (INTEL-02, D-05)', () => {
  it.fails(
    'findings[] include severity + FollowUpHint-shaped recovery hints',
    async () => {
      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        { action: 'scorecard' },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(false);
      if (isIntelligenceErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      const findings = data.findings as Array<Record<string, unknown>>;
      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);

      for (const finding of findings) {
        expect(['critical', 'high', 'info']).toContain(finding.severityity);
        const hint = finding.hint ?? finding.suggestion ?? finding.recovery_hint;
        expect(hint).toMatchObject({
          tool: expect.any(String),
          action: expect.any(String),
          args: expect.any(Object),
          label: expect.any(String),
        });
      }
    },
  );
});

describe('partial (D-17 soft partial)', () => {
  it.fails(
    'one factor reject leaves siblings present with failed flag on rejected factor',
    async () => {
      vi.mocked(fetchAppDeployments).mockRejectedValue(
        new CoolifyApiError({
          code: 'COOLIFY_500',
          message: 'Coolify API returned HTTP 500',
          recoveryHints: ['Retry later'],
          httpStatus: 500,
        }),
      );

      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        { action: 'scorecard' },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(false);
      if (isIntelligenceErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      const factors = data.factors as Record<string, Record<string, unknown>>;
      expect(factors.deployments?.failed).toMatchObject({
        code: expect.any(String),
      });
      expect(factors.backups).toBeDefined();
      expect(factors.exited_resources).toBeDefined();
      expect(factors.diagnose_scan).toBeDefined();
      expect(factors.backups).not.toHaveProperty('failed');
    },
  );
});

describe('graph (GRAPH-01, D-07, D-08)', () => {
  it('edges from database_uuid and application_uuid on flat resources; service nested via fetchService; no fuzzy name edges', async () => {
    vi.mocked(fetchResources).mockResolvedValue(graphFlatResources);
    vi.mocked(fetchService).mockResolvedValue({
      uuid: 'svc-uuid-1',
      name: 'wordpress',
      applications: [
        { uuid: 'svc-child-app', name: 'wp-app', type: 'application' },
      ],
      databases: [{ uuid: 'svc-child-db', name: 'wp-db', type: 'database' }],
    });

    const { handleIntelligenceAction, isIntelligenceErrorResult } =
      await import('./intelligence.js');

    const result = await handleIntelligenceAction(
      { action: 'graph' },
      testEnv,
    );

    expect(isIntelligenceErrorResult(result)).toBe(false);
    if (isIntelligenceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    const edges = data.edges as Array<Record<string, unknown>>;
    expect(Array.isArray(edges)).toBe(true);

    expect(
      edges.some(
        (e) =>
          e.relation === 'database_uuid' &&
          e.from_uuid === 'app-uuid-1' &&
          e.to_uuid === 'db-uuid-1',
      ),
    ).toBe(true);
    expect(
      edges.some(
        (e) =>
          e.relation === 'application_uuid' &&
          e.from_uuid === 'child-app' &&
          e.to_uuid === 'app-uuid-1',
      ),
    ).toBe(true);
    expect(
      edges.some(
        (e) =>
          e.relation === 'service_child' &&
          (e.from_uuid === 'svc-child-app' || e.to_uuid === 'svc-uuid-1'),
      ),
    ).toBe(true);

    expect(fetchService).toHaveBeenCalled();
    expect(
      edges.every(
        (e) =>
          typeof e.from_uuid === 'string' && typeof e.to_uuid === 'string',
      ),
    ).toBe(true);
    expect(edges.every((e) => e.relation !== 'fuzzy_name')).toBe(true);
  });
});

describe('impact (GRAPH-02, D-09, D-10)', () => {
  it.fails(
    'returns direct_dependents then transitive_dependents within max_depth default 3; advisory true; no mutation',
    async () => {
      vi.mocked(fetchResources).mockResolvedValue([
        { uuid: 'db-uuid-1', name: 'db', type: 'database', status: 'running' },
        {
          uuid: 'app-direct',
          name: 'direct-child',
          type: 'application',
          status: 'running',
          database_uuid: 'db-uuid-1',
        },
        {
          uuid: 'app-transitive',
          name: 'grand-child',
          type: 'application',
          status: 'running',
          application_uuid: 'app-direct',
        },
      ]);

      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        {
          action: 'impact',
          uuid: 'db-uuid-1',
          type: 'database',
          intent: 'delete',
        },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(false);
      if (isIntelligenceErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      expect(data.advisory).toBe(true);
      expect(data.depth_cap ?? data.max_depth).toBe(3);
      expect(data.intent).toBe('delete');

      const direct = data.direct_dependents as Array<{ uuid: string }>;
      const transitive = data.transitive_dependents as Array<{ uuid: string }>;
      expect(direct.map((d) => d.uuid)).toContain('app-direct');
      expect(transitive.map((d) => d.uuid)).toContain('app-transitive');
      expect(direct.map((d) => d.uuid)).not.toContain('app-transitive');

      expect(deleteApplication).not.toHaveBeenCalled();
      expect(deleteService).not.toHaveBeenCalled();
      expect(deleteDatabase).not.toHaveBeenCalled();
    },
  );
});

describe('janitor (JANI-01, D-11, D-12)', () => {
  it.fails(
    'lists stopped/exited, long_exited (stopped_days default 7), orphan; each has FollowUpHint suggestion + preview_only true',
    async () => {
      vi.mocked(fetchResources).mockResolvedValue(janitorResources);

      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        { action: 'janitor' },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(false);
      if (isIntelligenceErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      const candidates = (data.candidates ?? data.items) as Array<
        Record<string, unknown>
      >;
      expect(Array.isArray(candidates)).toBe(true);

      const reasons = candidates.map((c) => c.reason);
      expect(reasons).toEqual(
        expect.arrayContaining(['stopped', 'long_exited', 'orphan']),
      );

      for (const candidate of candidates) {
        expect(candidate.preview_only).toBe(true);
        expect(candidate.suggestion).toMatchObject({
          tool: expect.any(String),
          action: expect.any(String),
          args: expect.any(Object),
          label: expect.any(String),
        });
      }

      expect(deleteApplication).not.toHaveBeenCalled();
      expect(deleteDatabase).not.toHaveBeenCalled();
    },
  );
});

describe('cleanup (JANI-02, D-13, D-14, T-28-01, T-28-02)', () => {
  it.fails(
    'without confirm true → COOLIFY_CONFIRM_REQUIRED and domain delete clients not called (T-28-01)',
    async () => {
      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        {
          action: 'cleanup',
          targets: [{ type: 'application', uuid: 'app-uuid-1' }],
          confirm: false,
        },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(true);
      if (!isIntelligenceErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe(
        'COOLIFY_CONFIRM_REQUIRED',
      );
      expect(deleteApplication).not.toHaveBeenCalled();
      expect(deleteService).not.toHaveBeenCalled();
      expect(deleteDatabase).not.toHaveBeenCalled();
    },
  );

  it.fails(
    'with confirm true and no delete_volumes/delete_configurations → delete handlers receive both flags false (SAF-02, T-28-02)',
    async () => {
      const { handleIntelligenceAction, isIntelligenceErrorResult } =
        await import('./intelligence.js');

      const result = await handleIntelligenceAction(
        {
          action: 'cleanup',
          targets: [{ type: 'application', uuid: 'app-uuid-1' }],
          confirm: true,
        },
        testEnv,
      );

      expect(isIntelligenceErrorResult(result)).toBe(false);

      expect(deleteApplication).toHaveBeenCalledWith(
        testEnv.COOLIFY_URL,
        testEnv.COOLIFY_TOKEN,
        'app-uuid-1',
        expect.objectContaining({
          delete_volumes: false,
          delete_configurations: false,
        }),
        testEnv.COOLIFY_VERIFY_SSL,
      );
    },
  );
});
