import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../config/env.js';
import {
  buildProjectEnvironmentIndex,
  resolveProjectUuid,
  resolveEnvironmentUuid,
  resolveEnvironmentUuidFromId,
} from './project-lookup.js';

vi.mock('../api/client.js', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchEnvironments: vi.fn(),
}));

import { fetchProjects, fetchProject, fetchEnvironments } from '../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'error',
};

describe('buildProjectEnvironmentIndex', () => {
  beforeEach(() => {
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchProject).mockReset();
  });

  it('indexes environments from inline project list payload', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      {
        uuid: 'proj-1',
        name: 'MCP UAT Test',
        environments: [{ id: 22, name: 'production' }],
      },
    ]);

    const index = await buildProjectEnvironmentIndex(testEnv);

    expect(fetchProject).not.toHaveBeenCalled();
    expect(index.get(22)).toEqual({
      project_uuid: 'proj-1',
      project_name: 'MCP UAT Test',
    });
  });

  it('fetches project detail when list row lacks environments', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-2', name: 'Detail Project' },
    ]);
    vi.mocked(fetchProject).mockResolvedValue({
      uuid: 'proj-2',
      name: 'Detail Project',
      environments: [{ id: 23, name: 'staging' }],
    });

    const index = await buildProjectEnvironmentIndex(testEnv);

    expect(fetchProject).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-2',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(index.get(23)).toEqual({
      project_uuid: 'proj-2',
      project_name: 'Detail Project',
    });
  });

  it('returns empty map when no projects exist', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([]);

    const index = await buildProjectEnvironmentIndex(testEnv);

    expect(index.size).toBe(0);
    expect(fetchProject).not.toHaveBeenCalled();
  });
});

describe('resolveProjectUuid', () => {
  beforeEach(() => {
    vi.mocked(fetchProjects).mockReset();
  });

  it('returns project_uuid directly when provided', async () => {
    const uuid = await resolveProjectUuid('proj-direct', undefined, testEnv);
    expect(uuid).toBe('proj-direct');
    expect(fetchProjects).not.toHaveBeenCalled();
  });

  it('throws COOLIFY_404 when no project matches name', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'Alpha' },
    ]);

    await expect(
      resolveProjectUuid(undefined, 'nonexistent', testEnv),
    ).rejects.toMatchObject({ envelope: { code: 'COOLIFY_404' } });
  });

  it('throws COOLIFY_AMBIGUOUS_MATCH when multiple projects match', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'My Project Alpha' },
      { uuid: 'proj-2', name: 'My Project Beta' },
    ]);

    await expect(
      resolveProjectUuid(undefined, 'project', testEnv),
    ).rejects.toMatchObject({ envelope: { code: 'COOLIFY_AMBIGUOUS_MATCH' } });
  });

  it('returns uuid on exactly one case-insensitive name match', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'MCP UAT Test' },
      { uuid: 'proj-2', name: 'Other' },
    ]);

    const uuid = await resolveProjectUuid(undefined, 'uat', testEnv);
    expect(uuid).toBe('proj-1');
  });
});

describe('resolveEnvironmentUuid', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvironments).mockReset();
  });

  it('returns env_uuid directly when provided', async () => {
    const uuid = await resolveEnvironmentUuid(
      'env-direct',
      undefined,
      'proj-1',
      testEnv,
    );
    expect(uuid).toBe('env-direct');
    expect(fetchEnvironments).not.toHaveBeenCalled();
  });

  it('throws COOLIFY_404 when no environment matches name', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-1', name: 'production' },
    ]);

    await expect(
      resolveEnvironmentUuid(undefined, 'staging', 'proj-1', testEnv),
    ).rejects.toMatchObject({ envelope: { code: 'COOLIFY_404' } });
  });

  it('throws COOLIFY_AMBIGUOUS_MATCH when multiple environments match', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-1', name: 'prod-alpha' },
      { uuid: 'env-2', name: 'prod-beta' },
    ]);

    await expect(
      resolveEnvironmentUuid(undefined, 'prod', 'proj-1', testEnv),
    ).rejects.toMatchObject({ envelope: { code: 'COOLIFY_AMBIGUOUS_MATCH' } });
  });

  it('returns environment uuid on exactly one name match', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-1', name: 'production' },
      { uuid: 'env-2', name: 'staging' },
    ]);

    const uuid = await resolveEnvironmentUuid(
      undefined,
      'staging',
      'proj-1',
      testEnv,
    );
    expect(uuid).toBe('env-2');
  });
});

describe('resolveEnvironmentUuidFromId', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchProject).mockReset();
  });

  it('resolves environment UUID via project-scoped environments list', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { id: 22, uuid: 'env-uuid-22', name: 'production' },
      { id: 23, uuid: 'env-uuid-23', name: 'staging' },
    ]);

    const resolved = await resolveEnvironmentUuidFromId(22, 'proj-1', testEnv);
    expect(resolved).toEqual({
      environmentUuid: 'env-uuid-22',
      environmentName: 'production',
      projectUuid: 'proj-1',
      projectName: undefined,
    });
    expect(fetchProjects).not.toHaveBeenCalled();
  });

  it('builds project index when projectUuid is unknown', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      {
        uuid: 'proj-1',
        name: 'demo',
        environments: [{ id: 22, uuid: 'env-uuid-22', name: 'production' }],
      },
    ]);
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { id: 22, uuid: 'env-uuid-22', name: 'production' },
    ]);

    const resolved = await resolveEnvironmentUuidFromId(22, undefined, testEnv);
    expect(resolved).toEqual({
      environmentUuid: 'env-uuid-22',
      environmentName: 'production',
      projectUuid: 'proj-1',
      projectName: 'demo',
    });
  });

  it('returns undefined when environment_id cannot be resolved', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([]);
    const resolved = await resolveEnvironmentUuidFromId(99, undefined, testEnv);
    expect(resolved).toBeUndefined();
  });
});
