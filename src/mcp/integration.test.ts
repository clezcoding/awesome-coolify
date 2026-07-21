import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EnvConfig } from '../config/env.js';
import { handleSystemAction } from './tools/system.js';
import { handleResourceAction } from './tools/resource.js';
import { handleApplicationAction } from './tools/application.js';
import { handleDocsAction } from './tools/docs.js';

vi.mock('../api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchServers: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchApplication: vi.fn(),
  createCoolifyClient: vi.fn(),
}));

import {
  fetchResources,
  fetchServers,
  fetchProjects,
  fetchProject,
  fetchApplication,
  createCoolifyClient,
} from '../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockResources = [
  {
    uuid: 'app-uuid-1',
    name: 'web-app',
    type: 'application',
    status: 'running:healthy',
    fqdn: 'app.example.com',
    project: { name: 'proj-a' },
    server: { name: 'srv-1' },
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    uuid: 'db-uuid-1',
    name: 'postgres',
    type: 'database',
    status: 'running:healthy',
    project: { name: 'proj-a' },
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
];

const mockApplication = {
  uuid: 'app-uuid-1',
  name: 'web-app',
  status: 'running:healthy',
  fqdn: 'https://app.example.com',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  server: { name: 'srv-1', uuid: 'srv-uuid-1' },
  destination: { uuid: 'dest-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

describe('P2 read slice integration', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockResolvedValue(mockResources);
    vi.mocked(fetchServers).mockResolvedValue(mockServers);
    vi.mocked(fetchProjects).mockResolvedValue([{ uuid: 'proj-1' }]);
    vi.mocked(fetchProject).mockResolvedValue({ uuid: 'proj-1', environments: [] });
    vi.mocked(fetchApplication).mockResolvedValue(mockApplication);
  });

  it('exercises overview → list → get → find → docs happy path', async () => {
    const overview = await handleSystemAction(
      { action: 'infrastructure_overview' },
      testEnv,
    );
    expect('ok' in overview && overview.ok).toBe(true);
    if (!('ok' in overview) || !overview.ok) return;
    expect(overview.data.applications.total).toBe(1);
    expect(overview.data.databases.total).toBe(1);
    expect(overview._meta.truncated).toBe(false);
    expect(overview._meta.chars).toBeGreaterThan(0);
    expect(overview._meta.max_chars).toBe(16000);

    const list = await handleResourceAction(
      { action: 'list', type: 'application' },
      testEnv,
    );
    expect('ok' in list && list.ok).toBe(true);
    if (!('ok' in list) || !list.ok) return;
    expect(list.data.length).toBe(1);
    expect(list.data[0].uuid).toBe('app-uuid-1');
    expect(list._meta.truncated).toBe(false);

    const appUuid = list.data[0].uuid;
    const appGet = await handleApplicationAction(
      { action: 'get', uuid: appUuid },
      testEnv,
    );
    expect('ok' in appGet && appGet.ok).toBe(true);
    if (!('ok' in appGet) || !appGet.ok) return;
    expect(appGet.data).toMatchObject({ uuid: appUuid, name: 'web-app' });
    expect(appGet._meta.truncated).toBe(false);

    const find = await handleResourceAction(
      { action: 'find', name: 'web-app' },
      testEnv,
    );
    expect('ok' in find && find.ok).toBe(true);
    if (!('ok' in find) || !find.ok) return;
    expect(find.data.length).toBeGreaterThan(0);
    expect(find.data.length).toBeLessThanOrEqual(10);
    expect(find.data[0].name).toBe('web-app');

    const docs = await handleDocsAction({
      action: 'search',
      query: 'deploy',
    });
    expect(docs.ok).toBe(true);
    expect(docs.data.length).toBeGreaterThan(0);
    expect(docs._meta.truncated).toBe(false);
  });

  it('format table on list returns pipe-delimited table output per OUT-01', async () => {
    const list = await handleResourceAction(
      { action: 'list', type: 'application', format: 'table' },
      testEnv,
    );
    expect('ok' in list && list.ok).toBe(true);
    if (!('ok' in list) || !list.ok) return;
    expect(list._formattedText).toMatch(/\|/);
    expect(list._formattedText).toContain('web-app');
  });

  it('registerCoolifyTools registers read-only P2 tools with readOnlyHint per D-22/D-14', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    const readOnlyCount = (source.match(/readOnlyHint:\s*true/g) ?? []).length;
    expect(readOnlyCount).toBe(5);

    for (const tool of ['resource', 'docs']) {
      expect(source).toContain(`registerTool(\n    '${tool}'`);
      expect(source).toMatch(
        new RegExp(`'${tool}'[\\s\\S]*readOnlyHint:\\s*true`),
      );
    }

    for (const tool of ['application', 'service', 'database']) {
      expect(source).toContain(`registerTool(\n    '${tool}'`);
      const toolBlock = source.match(
        new RegExp(`registerTool\\(\\s*'${tool}'[\\s\\S]*?\\n  \\);`),
      )?.[0];
      expect(toolBlock).toBeTruthy();
      expect(toolBlock).not.toMatch(/readOnlyHint:\s*true/);
    }
  });
});

describe('CTX-06 multi-instance routing (RED until Plan 15-03)', () => {
  const emptyEnv: EnvConfig = {
    COOLIFY_URL: undefined as unknown as string,
    COOLIFY_TOKEN: undefined as unknown as string,
    COOLIFY_VERIFY_SSL: true,
    COOLIFY_MCP_LOG: 'info',
  };

  it.fails('application.get with instance prod routes to prod creds', async () => {
    const captured: Array<{ url: string; token: string }> = [];
    vi.mocked(createCoolifyClient).mockImplementation((url, token) => {
      captured.push({ url, token });
      return vi.fn() as ReturnType<typeof createCoolifyClient>;
    });

    await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1', instance: 'prod' },
      emptyEnv,
    );

    expect(captured).toContainEqual({
      url: 'https://prod.coolify.example.com',
      token: 'prod-token',
    });
  });

  it.fails('application.get with instance unknown returns COOLIFY_INSTANCE_NOT_FOUND', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1', instance: 'unknown' },
      emptyEnv,
    );
    expect(result).toMatchObject({
      structuredContent: { error: { code: 'COOLIFY_INSTANCE_NOT_FOUND' } },
    });
  });

  it.fails('application.get with no instance and no env and no default returns COOLIFY_NO_INSTANCE', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1' },
      emptyEnv,
    );
    expect(result).toMatchObject({
      structuredContent: { error: { code: 'COOLIFY_NO_INSTANCE' } },
    });
  });

  it.fails('application.get with partial env returns COOLIFY_PARTIAL_ENV', async () => {
    const result = await handleApplicationAction(
      { action: 'get', uuid: 'app-uuid-1' },
      {
        ...emptyEnv,
        COOLIFY_URL: 'https://only-url.example.com',
      },
    );
    expect(result).toMatchObject({
      structuredContent: { error: { code: 'COOLIFY_PARTIAL_ENV' } },
    });
  });
});
