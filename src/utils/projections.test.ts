import { describe, expect, it } from 'vitest';
import {
  projectResourceSummary,
  projectApplicationSummary,
  projectServiceSummary,
  projectDatabaseSummary,
  sanitizeFullProjection,
  resolveProjection,
  projectAppDiagnose,
  projectServerDiagnose,
  projectScanIssue,
} from './projections.js';
import { generateHints } from './diagnose-hints.js';
import type { ScanIssue } from './issue-classifier.js';
import {
  mockMixedAppDeployments,
  mockMixedServerDomains,
  mockMixedServerResources,
} from '../../tests/fixtures/coolify-mixed-health.js';

const rawApplication = {
  uuid: 'app-uuid-1',
  name: 'my-app',
  type: 'application',
  status: 'running:healthy',
  health: 'healthy',
  fqdn: 'https://app.example.com',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'main-server', uuid: 'srv-1' },
  destination: { uuid: 'dest-1' },
  updated_at: '2026-07-01T10:00:00Z',
};

const rawService = {
  id: 'svc-uuid-1',
  name: 'redis',
  type: 'service',
  status: 'running',
  fqdn: null,
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'main-server', uuid: 'srv-1' },
  updated_at: '2026-07-02T10:00:00Z',
};

const rawDatabase = {
  uuid: 'db-uuid-1',
  name: 'postgres',
  type: 'postgresql',
  status: 'running',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'main-server', uuid: 'srv-1' },
  updated_at: '2026-07-03T10:00:00Z',
};

describe('projectResourceSummary', () => {
  it('extracts D-05 operational fields including health', () => {
    const summary = projectResourceSummary(rawApplication);
    expect(summary).toEqual({
      uuid: 'app-uuid-1',
      name: 'my-app',
      type: 'application',
      status: 'running:healthy',
      health: 'healthy',
      fqdn: 'https://app.example.com',
      project_name: 'prod',
      server_name: 'main-server',
      updated_at: '2026-07-01T10:00:00Z',
    });
  });

  it('falls back uuid from id when uuid absent', () => {
    const summary = projectResourceSummary(rawService);
    expect(summary.uuid).toBe('svc-uuid-1');
  });

  it('derives health from status_detail when health absent', () => {
    const summary = projectResourceSummary({
      ...rawApplication,
      health: undefined,
      status_detail: 'degraded',
    });
    expect(summary.health).toBe('degraded');
  });

  it('falls back health to status when neither health nor status_detail present', () => {
    const summary = projectResourceSummary({
      ...rawApplication,
      health: undefined,
      status_detail: undefined,
      status: 'exited',
    });
    expect(summary.health).toBe('exited');
  });

  it('uses domain as fqdn fallback', () => {
    const summary = projectResourceSummary({
      ...rawApplication,
      fqdn: undefined,
      domain: 'app.example.com',
    });
    expect(summary.fqdn).toBe('app.example.com');
  });
});

describe('projectApplicationSummary', () => {
  it('returns application-specific summary shape per D-06', () => {
    const summary = projectApplicationSummary(rawApplication);
    expect(summary).toEqual({
      uuid: 'app-uuid-1',
      name: 'my-app',
      status: 'running:healthy',
      fqdn: 'https://app.example.com',
      project_name: 'prod',
      server_name: 'main-server',
      project_uuid: 'proj-1',
      server_uuid: 'srv-1',
      destination_uuid: 'dest-1',
      updated_at: '2026-07-01T10:00:00Z',
    });
  });
});

describe('projectServiceSummary', () => {
  it('returns service-specific summary shape per D-06', () => {
    const summary = projectServiceSummary(rawService);
    expect(summary).toEqual({
      uuid: 'svc-uuid-1',
      name: 'redis',
      status: 'running',
      fqdn: null,
      project_name: 'prod',
      server_name: 'main-server',
      project_uuid: 'proj-1',
      server_uuid: 'srv-1',
      updated_at: '2026-07-02T10:00:00Z',
    });
  });
});

describe('projectDatabaseSummary', () => {
  it('returns database-specific summary shape per D-06', () => {
    const summary = projectDatabaseSummary(rawDatabase);
    expect(summary).toEqual({
      uuid: 'db-uuid-1',
      name: 'postgres',
      status: 'running',
      type: 'postgresql',
      project_name: 'prod',
      server_name: 'main-server',
      project_uuid: 'proj-1',
      server_uuid: 'srv-1',
      updated_at: '2026-07-03T10:00:00Z',
    });
  });
});

describe('sanitizeFullProjection', () => {
  it('masks password token secret private env key values recursively', () => {
    const raw = {
      name: 'app',
      password: 'super-secret',
      config: {
        api_token: 'tok-123',
        nested: { secret_key: 'sk-abc', public_url: 'https://x.com' },
      },
      env: 'DB_PASS=leak',
      private_key: 'pem-data',
      normal_field: 'visible',
    };
    const sanitized = sanitizeFullProjection(raw);
    expect(sanitized.password).toBe('***');
    expect(sanitized.config.api_token).toBe('***');
    expect(sanitized.config.nested.secret_key).toBe('***');
    expect(sanitized.config.nested.public_url).toBe('https://x.com');
    expect(sanitized.env).toBe('***');
    expect(sanitized.private_key).toBe('***');
    expect(sanitized.normal_field).toBe('visible');
  });

  it('returns primitives unchanged', () => {
    expect(sanitizeFullProjection(null)).toBe(null);
    expect(sanitizeFullProjection('text')).toBe('text');
  });
});

describe('resolveProjection', () => {
  it('returns full when include_full true regardless of projection param per D-07', () => {
    expect(resolveProjection('summary', true)).toBe('full');
    expect(resolveProjection('full', true)).toBe('full');
  });

  it('returns full when projection is full', () => {
    expect(resolveProjection('full', false)).toBe('full');
    expect(resolveProjection('full', undefined)).toBe('full');
  });

  it('returns summary by default', () => {
    expect(resolveProjection('summary', false)).toBe('summary');
    expect(resolveProjection('summary', undefined)).toBe('summary');
    expect(resolveProjection(undefined, undefined)).toBe('summary');
  });
});

const rawDiagnoseApp = {
  uuid: 'app-uuid-1',
  name: 'my-app',
  status: 'running:healthy',
  health_check_status: 'healthy',
  fqdn: 'https://app.example.com',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'main-server', uuid: 'srv-1' },
  updated_at: '2026-07-01T10:00:00Z',
  env: { DATABASE_PASSWORD: 'super-secret' },
};

describe('projectAppDiagnose', () => {
  it('summary includes ALL D-05 fields including updated_at', () => {
    const summary = projectAppDiagnose(
      rawDiagnoseApp,
      2,
      mockMixedAppDeployments,
      'summary',
    );
    expect(summary.uuid).toBe('app-uuid-1');
    expect(summary.name).toBe('my-app');
    expect(summary.fqdn).toBe('https://app.example.com');
    expect(summary.project_name).toBe('prod');
    expect(summary.server_name).toBe('main-server');
    expect(summary.status).toBe('running:healthy');
    expect(summary.health_check_status).toBe('healthy');
    expect(summary.env_count).toBe(2);
    expect(summary.last_deployment).toEqual({
      commit: 'abc123',
      status: 'finished',
      finished_at: '2026-07-12T01:05:00.000Z',
    });
    expect(summary.recent_deployments.length).toBe(3);
    expect(summary.updated_at).toBe('2026-07-01T10:00:00Z');
    expect(Array.isArray(summary.hints)).toBe(true);
  });

  it('summary never includes env values — only env_count integer', () => {
    const summary = projectAppDiagnose(
      rawDiagnoseApp,
      2,
      [],
      'summary',
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('DATABASE_PASSWORD');
    expect(summary.env_count).toBe(2);
    expect(summary).not.toHaveProperty('envs');
    expect(summary).not.toHaveProperty('env');
  });

  it('full projection adds raw_application and deployments with logs', () => {
    const deployments = [
      {
        deployment_uuid: 'dep-1',
        git_commit_sha: 'abc',
        status: 'finished',
        created_at: '2026-07-01T00:00:00Z',
        finished_at: '2026-07-01T00:05:00Z',
        logs: 'build output line 1',
      },
    ];
    const full = projectAppDiagnose(
      rawDiagnoseApp,
      1,
      deployments,
      'full',
      100,
    );
    expect(full).toHaveProperty('raw_application');
    expect(full.deployments[0].logs).toBe('build output line 1');
    const raw = full.raw_application as Record<string, unknown>;
    const env = raw.env as Record<string, unknown>;
    expect(env.DATABASE_PASSWORD).toBe('***');
  });
});

describe('projectServerDiagnose', () => {
  const rawServer = {
    uuid: 'srv-1',
    name: 'main-server',
    ip: '1.2.3.4',
    settings: { is_reachable: true },
    updated_at: '2026-07-01T10:00:00Z',
  };

  it('returns counts by type not full resource list', () => {
    const view = projectServerDiagnose(
      rawServer,
      mockMixedServerResources,
      mockMixedServerDomains,
      true,
    );
    expect(view.uuid).toBe('srv-1');
    expect(view.is_reachable).toBe(true);
    expect(view.validation_started).toBe(true);
    expect(view.resources_counts.applications.total).toBe(1);
    expect(view.resources_counts.databases.total).toBe(1);
    expect(view.resources_counts.services.total).toBe(1);
    expect(view).not.toHaveProperty('resources');
  });

  it('renders domains with ip ipv4 ipv6 domain per D-11', () => {
    const view = projectServerDiagnose(rawServer, [], mockMixedServerDomains, false);
    expect(view.domains[0]).toEqual({
      ip: '5.6.7.8',
      ipv4: '5.6.7.8',
      ipv6: null,
      domain: 'online-node.example.com',
    });
  });
});

describe('projectScanIssue', () => {
  it('passthrough D-13 issue entry shape with hint object', () => {
    const hint = generateHints('application', 'app-1', 'unhealthy')[0];
    const issue: ScanIssue = {
      resource_type: 'application',
      uuid: 'app-1',
      name: 'failing-app',
      status: 'unhealthy',
      issue: 'application unhealthy',
      hint,
    };
    expect(projectScanIssue(issue)).toEqual(issue);
  });
});
