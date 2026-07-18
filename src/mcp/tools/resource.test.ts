import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleResourceAction,
  isResourceErrorResult,
  resourceActionSchema,
} from './resource.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchServers: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
}));

import { fetchResources, fetchServers, fetchProjects, fetchProject } from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockResources = [
  {
    uuid: 'app-1',
    name: 'my-app',
    type: 'application',
    status: 'running:healthy',
    fqdn: 'app.example.com',
    project: { name: 'proj-a' },
    server: { name: 'srv-1' },
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    uuid: 'svc-1',
    name: 'redis',
    type: 'service',
    status: 'running:healthy',
    project: { name: 'proj-a' },
    server: { name: 'srv-1' },
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    uuid: 'db-1',
    name: 'postgres',
    type: 'standalone-postgresql',
    status: 'exited:unhealthy',
    project: { name: 'proj-b' },
    server: { name: 'srv-2' },
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'exact-match-app',
    type: 'application',
    status: 'running:healthy',
    fqdn: 'exact.example.com',
    project: { name: 'proj-c' },
    server: { name: 'srv-1' },
    updated_at: '2026-07-01T00:00:00Z',
  },
];

const mockServers = [
  {
    uuid: 'srv-uuid-1',
    name: 'production-server',
    ip: '192.168.1.100',
    settings: { is_reachable: true },
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    uuid: 'srv-uuid-2',
    name: 'staging-server',
    ip: '10.0.0.50',
    settings: { is_reachable: false },
    updated_at: '2026-07-01T00:00:00Z',
  },
];

function makeManyResources(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    uuid: `res-${i}`,
    name: `app-number-${i}`,
    type: 'application' as const,
    status: 'running:healthy',
    fqdn: `app${i}.example.com`,
    project: { name: 'proj' },
    server: { name: 'srv' },
    updated_at: '2026-07-01T00:00:00Z',
  }));
}

describe('resourceActionSchema', () => {
  it('accepts list action with optional type filter', () => {
    expect(
      resourceActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(true);
    expect(
      resourceActionSchema.safeParse({
        action: 'list',
        type: 'application',
      }).success,
    ).toBe(true);
    expect(
      resourceActionSchema.safeParse({
        action: 'list',
        type: 'server',
      }).success,
    ).toBe(true);
    expect(
      resourceActionSchema.safeParse({
        action: 'list',
        type: 'project',
      }).success,
    ).toBe(true);
    expect(
      resourceActionSchema.safeParse({
        action: 'list',
        type: 'environment',
      }).success,
    ).toBe(true);
  });

  it('accepts find action with query and explicit fields per D-17', () => {
    expect(
      resourceActionSchema.safeParse({ action: 'find', query: 'test' }).success,
    ).toBe(true);
    expect(
      resourceActionSchema.safeParse({
        action: 'find',
        uuid: 'uuid-1',
        name: 'my-app',
        domain: 'example.com',
        ip: '192.168.1.1',
      }).success,
    ).toBe(true);
  });
});

describe('handleResourceAction list', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockResolvedValue(mockResources);
    vi.mocked(fetchServers).mockResolvedValue([]);
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('returns summary-projected resources with pagination metadata', async () => {
    const result = await handleResourceAction({ action: 'list' }, testEnv);

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(4);
    expect(result.data[0]).toMatchObject({
      uuid: 'app-1',
      name: 'my-app',
      type: 'application',
    });
    expect(result._meta.total).toBe(4);
    expect(result._meta.page).toBe(1);
    expect(result._meta.per_page).toBe(10);
    expect(result._meta.max_chars).toBe(16000);
    expect(result._formattedText).toBeTruthy();
  });

  it('filters to applications only when type application', async () => {
    const result = await handleResourceAction(
      { action: 'list', type: 'application' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data).toHaveLength(2);
    expect(result.data.every((r) => r.type === 'application')).toBe(true);
    expect(result._meta.total).toBe(2);
  });

  it('filters to services when type service', async () => {
    const result = await handleResourceAction(
      { action: 'list', type: 'service' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].type).toBe('service');
  });

  it('filters to databases when type database', async () => {
    const result = await handleResourceAction(
      { action: 'list', type: 'database' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].type).toBe('database');
  });

  it('resolves project_name from environment_id for Coolify 4.1.x payloads', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-1',
        name: 'mcp-uat-nginx',
        type: 'application',
        status: 'running:healthy',
        environment_id: 22,
        updated_at: '2026-07-01T00:00:00Z',
      },
    ]);
    vi.mocked(fetchProjects).mockResolvedValue([
      {
        uuid: 'h785essygwr360newm83inz6',
        name: 'MCP UAT Test',
        environments: [{ id: 22, name: 'production' }],
      },
    ]);

    const result = await handleResourceAction({ action: 'list' }, testEnv);

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data[0].project_name).toBe('MCP UAT Test');
    expect(result.data[0].project_name).not.toBe('default');
  });
});

describe('resource list type=project', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset().mockResolvedValue([]);
    vi.mocked(fetchServers).mockReset().mockResolvedValue([]);
    vi.mocked(fetchProjects).mockReset().mockResolvedValue([
      {
        uuid: 'proj-1',
        name: 'MCP UAT Test',
        description: 'Test project',
        environments: [
          { uuid: 'env-1', name: 'production' },
          { uuid: 'env-2', name: 'staging' },
        ],
      },
      {
        uuid: 'proj-2',
        name: 'Empty Project',
        description: null,
      },
    ]);
    vi.mocked(fetchProject).mockReset().mockResolvedValue({});
  });

  it('returns project summaries with environment_count per D-04', async () => {
    const result = await handleResourceAction(
      { action: 'list', type: 'project' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(fetchProjects).toHaveBeenCalled();
    expect(fetchResources).not.toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      uuid: 'proj-1',
      name: 'MCP UAT Test',
      description: 'Test project',
      environment_count: 2,
    });
    expect(result.data[1]).toEqual({
      uuid: 'proj-2',
      name: 'Empty Project',
      description: null,
      environment_count: 0,
    });
    expect(result._meta.total).toBe(2);
  });
});

describe('resource list type=environment', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset().mockResolvedValue([]);
    vi.mocked(fetchServers).mockReset().mockResolvedValue([]);
    vi.mocked(fetchProjects).mockReset().mockResolvedValue([
      {
        uuid: 'proj-1',
        name: 'MCP UAT Test',
        environments: [
          { uuid: 'env-1', name: 'production' },
          { uuid: 'env-2', name: 'staging' },
        ],
      },
      {
        uuid: 'proj-2',
        name: 'Other Project',
        environments: [{ uuid: 'env-3', name: 'dev' }],
      },
    ]);
    vi.mocked(fetchProject).mockReset().mockResolvedValue({});
  });

  it('returns flattened environment summaries with project context per D-04', async () => {
    const result = await handleResourceAction(
      { action: 'list', type: 'environment' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(fetchProjects).toHaveBeenCalled();
    expect(fetchResources).not.toHaveBeenCalled();
    expect(result.data).toHaveLength(3);
    expect(result.data).toContainEqual({
      uuid: 'env-1',
      name: 'production',
      project_uuid: 'proj-1',
      project_name: 'MCP UAT Test',
    });
    expect(result.data).toContainEqual({
      uuid: 'env-3',
      name: 'dev',
      project_uuid: 'proj-2',
      project_name: 'Other Project',
    });
    expect(result._meta.total).toBe(3);
  });
});

describe('resource list type=server', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset().mockResolvedValue([]);
    vi.mocked(fetchServers).mockReset().mockResolvedValue(mockServers);
    vi.mocked(fetchProjects).mockReset().mockResolvedValue([]);
    vi.mocked(fetchProject).mockReset().mockResolvedValue({});
  });

  it('returns server summaries from fetchServers per D-10', async () => {
    const result = await handleResourceAction(
      { action: 'list', type: 'server' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(fetchServers).toHaveBeenCalled();
    expect(fetchResources).not.toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
    expect(result.data.every((r) => r.type === 'server')).toBe(true);
    expect(result.data[0]).toMatchObject({
      uuid: 'srv-uuid-1',
      name: 'production-server',
      type: 'server',
      status: 'running',
    });
    expect(result.data[1]).toMatchObject({
      uuid: 'srv-uuid-2',
      name: 'staging-server',
      type: 'server',
      status: 'unreachable',
    });
    expect(result._meta.total).toBe(2);
  });

  it('paginates server list with per_page and page', async () => {
    const manyServers = Array.from({ length: 25 }, (_, i) => ({
      uuid: `srv-${i}`,
      name: `server-${i}`,
      ip: `10.0.0.${i}`,
      settings: { is_reachable: i % 2 === 0 },
      updated_at: '2026-07-01T00:00:00Z',
    }));
    vi.mocked(fetchServers).mockResolvedValue(manyServers);

    const result = await handleResourceAction(
      { action: 'list', type: 'server', per_page: 10, page: 1 },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data).toHaveLength(10);
    expect(result._meta.total).toBe(25);
    expect(result._meta.per_page).toBe(10);
    expect(result._meta.page).toBe(1);
  });
});

describe('handleResourceAction find', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockResolvedValue(mockResources);
    vi.mocked(fetchServers).mockResolvedValue(mockServers);
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('returns exact uuid match ranked first via query', async () => {
    const result = await handleResourceAction(
      {
        action: 'find',
        query: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].uuid).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });

  it('matches name case-insensitively via query substring per D-18', async () => {
    const result = await handleResourceAction(
      { action: 'find', query: 'POSTGRES' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data.some((r) => r.name === 'postgres')).toBe(true);
  });

  it('filters with explicit name domain ip fields using contains logic per D-17', async () => {
    const result = await handleResourceAction(
      {
        action: 'find',
        name: 'production',
        ip: '192.168',
      },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      name: 'production-server',
      type: 'server',
      fqdn: '192.168.1.100',
    });
  });

  it('caps matches at 10 ranked by relevance per D-19', async () => {
    vi.mocked(fetchResources).mockResolvedValue(makeManyResources(15));
    vi.mocked(fetchServers).mockResolvedValue([]);

    const result = await handleResourceAction(
      { action: 'find', query: 'app-number' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result._meta.total).toBe(10);
    expect(result.data.length).toBeLessThanOrEqual(10);
  });

  it('includes server type entries from fetchServers per D-20', async () => {
    const result = await handleResourceAction(
      { action: 'find', query: 'staging' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data.some((r) => r.type === 'server')).toBe(true);
    expect(result.data.some((r) => r.name === 'staging-server')).toBe(true);
  });

  it('returns error when no search fields provided per D-17', async () => {
    const result = await handleResourceAction({ action: 'find' }, testEnv);

    expect(isResourceErrorResult(result)).toBe(true);
    if (!isResourceErrorResult(result)) return;

    expect(result.structuredContent.error.message).toContain(
      'At least one search field',
    );
  });

  it('ranks exact name match before substring matches', async () => {
    const result = await handleResourceAction(
      { action: 'find', query: 'exact-match-app' },
      testEnv,
    );

    expect(isResourceErrorResult(result)).toBe(false);
    if (isResourceErrorResult(result)) return;

    expect(result.data[0].name).toBe('exact-match-app');
  });
});
