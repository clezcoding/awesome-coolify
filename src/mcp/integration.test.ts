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
  fetchApplication: vi.fn(),
}));

import {
  fetchResources,
  fetchServers,
  fetchProjects,
  fetchApplication,
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

  it('registerCoolifyTools registers P2 read tools with readOnlyHint true per D-22', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    const readOnlyCount = (source.match(/readOnlyHint:\s*true/g) ?? []).length;
    expect(readOnlyCount).toBeGreaterThanOrEqual(5);

    for (const tool of [
      'resource',
      'application',
      'service',
      'database',
      'docs',
    ]) {
      expect(source).toContain(`registerTool(\n    '${tool}'`);
      expect(source).toMatch(
        new RegExp(`'${tool}'[\\s\\S]*readOnlyHint:\\s*true`),
      );
    }
  });
});
