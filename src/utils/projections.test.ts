import { describe, expect, it } from 'vitest';
import {
  projectResourceSummary,
  projectApplicationSummary,
  projectServiceSummary,
  projectDatabaseSummary,
  sanitizeFullProjection,
  resolveProjection,
} from './projections.js';

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
