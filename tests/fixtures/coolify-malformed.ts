export const malformedEnvs = {
  error: 'not an array',
  data: { key: 'PORT', value: '3000' },
};

export const malformedAppMissingProject = {
  uuid: 'app-no-project',
  name: 'orphan-app',
  status: 'running',
  fqdn: 'https://orphan.example.com',
  server: { name: 'srv-1', uuid: 'srv-1' },
  updated_at: '2026-07-12T00:00:00.000Z',
};

export const malformedServerMissingSettings = {
  uuid: 'srv-no-settings',
  name: 'bare-server',
  ip: '10.0.0.1',
  updated_at: '2026-07-12T00:00:00.000Z',
};
