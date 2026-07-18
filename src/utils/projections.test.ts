import { describe, expect, it } from 'vitest';
import type { ProjectEnvironmentLookup } from './project-lookup.js';
import {
  isDatabaseRawType,
  normalizeResourceSummaryType,
  projectResourceSummary,
  projectApplicationSummary,
  projectServiceSummary,
  projectDatabaseSummary,
  projectDeploymentSummary,
  projectDeploymentFull,
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

describe('database raw type normalization', () => {
  it('isDatabaseRawType accepts database and standalone-* prefixes', () => {
    expect(isDatabaseRawType('database')).toBe(true);
    expect(isDatabaseRawType('standalone-postgresql')).toBe(true);
    expect(isDatabaseRawType('standalone-redis')).toBe(true);
    expect(isDatabaseRawType('standalone-mysql')).toBe(true);
    expect(isDatabaseRawType('application')).toBe(false);
    expect(normalizeResourceSummaryType('standalone-postgresql')).toBe('database');
    expect(normalizeResourceSummaryType('application')).toBe('application');
  });

  it('projectResourceSummary canonicalizes standalone-postgresql to database type', () => {
    const summary = projectResourceSummary({
      uuid: 'db-1',
      name: 'mcp-uat-test-db',
      type: 'standalone-postgresql',
      status: 'running:healthy',
      updated_at: '2026-07-01T00:00:00Z',
    });
    expect(summary.type).toBe('database');
  });

  it('projectResourceSummary canonicalizes standalone-redis to database type', () => {
    const summary = projectResourceSummary({
      uuid: 'db-2',
      name: 'mcp-uat-test-redis',
      type: 'standalone-redis',
      status: 'running:healthy',
      updated_at: '2026-07-01T00:00:00Z',
    });
    expect(summary.type).toBe('database');
  });
});

const rawApplication41x = {
  uuid: 'app-41x',
  name: 'mcp-uat-nginx',
  type: 'application',
  status: 'running:healthy',
  environment_id: 22,
  updated_at: '2026-07-01T10:00:00Z',
};

const lookup41x: ProjectEnvironmentLookup = new Map([
  [
    22,
    {
      project_uuid: 'h785essygwr360newm83inz6',
      project_name: 'MCP UAT Test',
    },
  ],
]);

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

  it('resolves project from environment_id lookup for Coolify 4.1.x payloads', () => {
    const summary = projectApplicationSummary(rawApplication41x, lookup41x);
    expect(summary.project_name).toBe('MCP UAT Test');
    expect(summary.project_uuid).toBe('h785essygwr360newm83inz6');
    expect(summary.project_name).not.toBe('default');
  });

  it('returns N/A when environment_id cannot be resolved', () => {
    const summary = projectApplicationSummary({
      uuid: 'app-missing',
      name: 'orphan',
      status: 'running',
    });
    expect(summary.project_name).toBe('N/A');
    expect(summary.project_uuid).toBe('');
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

  it('masks secret keys when reveal is false (default)', () => {
    expect(sanitizeFullProjection({ password: 'secret' }, false).password).toBe(
      '***',
    );
  });

  it('returns plaintext secret keys when reveal is true', () => {
    expect(sanitizeFullProjection({ password: 'secret' }, true).password).toBe(
      'secret',
    );
  });

  it('reveals nested secret keys when reveal is true', () => {
    const revealed = sanitizeFullProjection(
      { nested: { token: 'abc' } },
      true,
    ) as { nested: { token: string } };
    expect(revealed.nested.token).toBe('abc');
  });

  it('passes through non-object inputs unchanged when reveal is true', () => {
    expect(sanitizeFullProjection(null, true)).toBe(null);
    expect(sanitizeFullProjection('text', true)).toBe('text');
  });

  it('masks internal_db_url and external_db_url', () => {
    const sanitized = sanitizeFullProjection({
      internal_db_url: 'postgres://user:secret@internal:5432/db',
      external_db_url: 'postgres://user:secret@external:5432/db',
    }) as Record<string, string>;
    expect(sanitized.internal_db_url).toBe('***');
    expect(sanitized.external_db_url).toBe('***');
  });

  it('masks credential URIs in connection_string keys', () => {
    const sanitized = sanitizeFullProjection({
      config: {
        nested: {
          connection_string: 'mysql://root:pw@localhost/db',
        },
      },
    }) as { config: { nested: { connection_string: string } } };
    expect(sanitized.config.nested.connection_string).toBe('***');
  });

  it('masks credential URI values on arbitrary keys', () => {
    const sanitized = sanitizeFullProjection({
      description: 'postgres://user:pass@host/db',
    }) as Record<string, string>;
    expect(sanitized.description).toBe('***');
  });

  it('does not mask https public URLs without credentials', () => {
    const sanitized = sanitizeFullProjection({
      public_url: 'https://example.com',
    }) as Record<string, string>;
    expect(sanitized.public_url).toBe('https://example.com');
  });

  it('returns plaintext db URLs when reveal is true', () => {
    const url = 'postgres://user:secret@host:5432/db';
    const revealed = sanitizeFullProjection(
      { internal_db_url: url },
      true,
    ) as Record<string, string>;
    expect(revealed.internal_db_url).toBe(url);
  });

  it('still masks private_key and pem fields when reveal is true per D-02', () => {
    const revealed = sanitizeFullProjection(
      {
        private_key: '-----BEGIN RSA PRIVATE KEY-----',
        pem: 'pem-content',
        password: 'visible-secret',
        nested: { pem_data: 'nested-pem' },
      },
      true,
    ) as {
      private_key: string;
      pem: string;
      password: string;
      nested: { pem_data: string };
    };
    expect(revealed.private_key).toBe('***');
    expect(revealed.pem).toBe('***');
    expect(revealed.password).toBe('visible-secret');
    expect(revealed.nested.pem_data).toBe('***');
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

describe('projectAppDiagnose reveal', () => {
  const rawWithSecret = {
    ...rawDiagnoseApp,
    secret_env: 'env-secret',
  };

  it('masks raw_application when reveal is false on full projection', () => {
    const full = projectAppDiagnose(rawWithSecret, 2, [], 'full', 16000, false);
    if (!('raw_application' in full)) throw new Error('expected full projection');
    const raw = full.raw_application as Record<string, unknown>;
    expect(raw.secret_env).toBe('***');
  });

  it('leaves raw_application unmasked when reveal is true on full projection', () => {
    const full = projectAppDiagnose(rawWithSecret, 2, [], 'full', 16000, true);
    if (!('raw_application' in full)) throw new Error('expected full projection');
    const raw = full.raw_application as Record<string, unknown>;
    expect(raw.secret_env).toBe('env-secret');
  });

  it('omits raw_application on summary projection even when reveal is true', () => {
    const summary = projectAppDiagnose(
      rawWithSecret,
      2,
      [],
      'summary',
      16000,
      true,
    );
    expect(summary).not.toHaveProperty('raw_application');
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

describe('projectDeploymentSummary', () => {
  it('extracts deployment fields with coalescing', () => {
    const raw = {
      id: 'dep-fallback',
      deployment_uuid: 'dep-uuid-1',
      git_commit_sha: 'sha-abc',
      status: 'finished',
      created_at: '2026-07-01T00:00:00Z',
      finished_at: '2026-07-01T00:05:00Z',
    };
    expect(projectDeploymentSummary(raw)).toEqual({
      deployment_uuid: 'dep-uuid-1',
      commit: 'sha-abc',
      status: 'finished',
      created_at: '2026-07-01T00:00:00Z',
      finished_at: '2026-07-01T00:05:00Z',
    });
  });

  it('falls back commit from commit and finished_at from updated_at', () => {
    const raw = {
      deployment_uuid: 'dep-2',
      commit: 'legacy-sha',
      status: 'in_progress',
      created_at: '2026-07-02T00:00:00Z',
      updated_at: '2026-07-02T00:01:00Z',
    };
    expect(projectDeploymentSummary(raw)).toEqual({
      deployment_uuid: 'dep-2',
      commit: 'legacy-sha',
      status: 'in_progress',
      created_at: '2026-07-02T00:00:00Z',
      finished_at: '2026-07-02T00:01:00Z',
    });
  });
});

describe('projectDeploymentFull', () => {
  it('returns summary fields plus capped logs and sanitized raw_deployment', () => {
    const longLogs = 'x'.repeat(200);
    const raw = {
      deployment_uuid: 'dep-uuid-1',
      git_commit_sha: 'abc',
      status: 'finished',
      created_at: '2026-07-01T00:00:00Z',
      finished_at: '2026-07-01T00:05:00Z',
      logs: longLogs,
      password: 'secret',
      token: 'tok',
    };
    const full = projectDeploymentFull(raw, 50);
    expect(full.deployment_uuid).toBe('dep-uuid-1');
    expect(full.commit).toBe('abc');
    expect(full.logs).toBe('x'.repeat(50) + '…[truncated]');
    const rawDep = full.raw_deployment as Record<string, unknown>;
    expect(rawDep.password).toBe('***');
    expect(rawDep.token).toBe('***');
    expect(full).not.toHaveProperty('password');
  });

  it('omits logs when raw.logs is not a string', () => {
    const full = projectDeploymentFull({
      deployment_uuid: 'dep-1',
      status: 'queued',
      logs: null,
    });
    expect(full).not.toHaveProperty('logs');
    expect(full.raw_deployment).toBeDefined();
  });
});

describe('projectDeploymentFull reveal', () => {
  const raw = {
    deployment_uuid: 'dep-uuid-1',
    git_commit_sha: 'abc',
    status: 'finished',
    created_at: '2026-07-01T00:00:00Z',
    finished_at: '2026-07-01T00:05:00Z',
    password: 'secret',
  };

  it('masks raw_deployment secrets when reveal is false', () => {
    const full = projectDeploymentFull(raw, 16000, false);
    const rawDep = full.raw_deployment as Record<string, unknown>;
    expect(rawDep.password).toBe('***');
  });

  it('leaves raw_deployment secrets plaintext when reveal is true', () => {
    const full = projectDeploymentFull(raw, 16000, true);
    const rawDep = full.raw_deployment as Record<string, unknown>;
    expect(rawDep.password).toBe('secret');
  });
});
