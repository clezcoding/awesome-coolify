export const mockMixedServers = [
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

export const mockMixedResources = [
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

export const mockMixedAppEnvs = [
  { id: 1, key: 'PORT', value: '3000', is_buildtime: false },
  { id: 2, key: 'MODE', value: 'production', is_buildtime: false },
];

export const mockMixedAppDeployments = [
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

export const mockMixedServerResources = [...mockMixedResources];

export const mockMixedServerDomains = [
  {
    ip: '5.6.7.8',
    ipv4: '5.6.7.8',
    ipv6: null,
    domain: 'online-node.example.com',
  },
];
