import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../config/env.js';

vi.mock('../api/client.js', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchEnvironments: vi.fn(),
}));

vi.mock('./manifest.js', () => ({
  ManifestManager: {
    findResourceContext: vi.fn(),
  },
}));

import { fetchEnvironments } from '../api/client.js';
import { ManifestManager } from './manifest.js';
import { resolveUpdateManifestContext } from './manifest-auto-hook.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'error',
};

describe('resolveUpdateManifestContext', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(ManifestManager.findResourceContext).mockReset();
  });

  it('prefers nested environment.uuid from raw payload', async () => {
    const ctx = await resolveUpdateManifestContext({
      raw: {
        project: { uuid: 'proj-1', name: 'demo' },
        environment: { uuid: 'env-nested', name: 'production' },
        environment_id: 22,
      },
      resourceUuid: 'res-1',
      env: testEnv,
    });

    expect(ctx).toEqual({
      projectUuid: 'proj-1',
      projectName: 'demo',
      environmentUuid: 'env-nested',
      environmentName: 'production',
    });
    expect(fetchEnvironments).not.toHaveBeenCalled();
    expect(ManifestManager.findResourceContext).not.toHaveBeenCalled();
  });

  it('resolves environment_id when nested environment is missing', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { id: 22, uuid: 'env-from-id', name: 'production' },
    ]);

    const ctx = await resolveUpdateManifestContext({
      raw: {
        project: { uuid: 'proj-1', name: 'demo' },
        environment_id: 22,
      },
      resourceUuid: 'res-1',
      env: testEnv,
    });

    expect(ctx.environmentUuid).toBe('env-from-id');
    expect(ctx.environmentName).toBe('production');
    expect(ctx.projectUuid).toBe('proj-1');
  });

  it('falls back to existing manifest entry for the resource UUID', async () => {
    vi.mocked(ManifestManager.findResourceContext).mockReturnValue({
      projectUuid: 'proj-cached',
      projectName: 'cached',
      environmentUuid: 'env-cached',
      environmentName: 'staging',
    });

    const ctx = await resolveUpdateManifestContext({
      raw: { project: { uuid: 'proj-1', name: 'demo' } },
      resourceUuid: 'res-1',
      env: testEnv,
    });

    expect(ctx).toEqual({
      projectUuid: 'proj-1',
      projectName: 'demo',
      environmentUuid: 'env-cached',
      environmentName: 'staging',
    });
  });

  it('uses parsed environment_uuid when raw/manifest lack environment', async () => {
    const ctx = await resolveUpdateManifestContext({
      raw: {},
      resourceUuid: 'res-1',
      env: testEnv,
      parsedProjectUuid: 'proj-parsed',
      parsedEnvironmentUuid: 'env-parsed',
      parsedEnvironmentName: 'prod',
    });

    expect(ctx).toEqual({
      projectUuid: 'proj-parsed',
      projectName: undefined,
      environmentUuid: 'env-parsed',
      environmentName: 'prod',
    });
  });
});
