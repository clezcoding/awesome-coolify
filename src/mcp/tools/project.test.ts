import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleProjectAction,
  projectActionSchema,
  isProjectErrorResult,
} from './project.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  fetchEnvironments: vi.fn(),
  fetchEnvironment: vi.fn(),
  createEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  fetchResources: vi.fn(),
}));

import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  fetchEnvironments,
  fetchEnvironment,
  createEnvironment,
  deleteEnvironment,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockEnv = {
  uuid: 'env-prod',
  name: 'production',
  id: 1,
};

const mockProject = {
  uuid: 'proj-1',
  name: 'my-project',
  description: 'test project',
  environments: [mockEnv],
};

describe('project list', () => {
  beforeEach(() => {
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchProjects).mockResolvedValue([mockProject]);
  });

  it('returns summary projection with uuid, name, description per D-02', async () => {
    const result = await handleProjectAction({ action: 'list' }, testEnv);

    expect(isProjectErrorResult(result)).toBe(false);
    if (isProjectErrorResult(result)) return;

    const data = result.data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      uuid: 'proj-1',
      name: 'my-project',
      description: 'test project',
    });
  });
});

describe('project get', () => {
  beforeEach(() => {
    vi.mocked(fetchProject).mockReset();
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchProject).mockResolvedValue(mockProject);
  });

  it('returns project fields when resolved by uuid per D-14', async () => {
    const result = await handleProjectAction(
      { action: 'get', uuid: 'proj-1' },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(fetchProject).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isProjectErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'proj-1',
      name: 'my-project',
      description: 'test project',
    });
  });

  it('resolves single name match to uuid per D-14', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([mockProject]);

    const result = await handleProjectAction(
      { action: 'get', name: 'my-project' },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(fetchProjects).toHaveBeenCalled();
    if (isProjectErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'proj-1', name: 'my-project' });
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on multi-match by name with no API call per D-14', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'dup-name', description: 'a' },
      { uuid: 'proj-2', name: 'dup-name', description: 'b' },
    ]);

    const result = await handleProjectAction(
      { action: 'get', name: 'dup-name' },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(true);
    if (!isProjectErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(fetchProject).not.toHaveBeenCalled();
  });
});

describe('project create', () => {
  beforeEach(() => {
    vi.mocked(createProject).mockReset();
    vi.mocked(createEnvironment).mockReset();
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(createProject).mockResolvedValue({
      uuid: 'proj-new',
      name: 'new-project',
      description: 'new desc',
    });
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-prod-new', name: 'production', id: 10 },
    ]);
    vi.mocked(createEnvironment).mockResolvedValue({
      uuid: 'env-staging-new',
      name: 'staging',
    });
  });

  it('creates project with initial_environment production and ensures production env per D-09/D-11', async () => {
    const result = await handleProjectAction(
      {
        action: 'create',
        name: 'new-project',
        description: 'new desc',
        initial_environment: 'production',
      },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(createProject).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ name: 'new-project', description: 'new desc' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isProjectErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.project).toMatchObject({ uuid: 'proj-new', name: 'new-project' });
    expect(data.environment).toMatchObject({ name: 'production' });
  });

  it('creates staging env after project create when initial_environment is staging per D-10/D-11', async () => {
    const result = await handleProjectAction(
      {
        action: 'create',
        name: 'new-project',
        initial_environment: 'staging',
      },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(createProject).toHaveBeenCalled();
    expect(createEnvironment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-new',
      { name: 'staging' },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isProjectErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.environment).toMatchObject({
      uuid: 'env-staging-new',
      name: 'staging',
    });
    const environments = data.environments as Array<{ name: string }>;
    expect(environments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'production' }),
        expect.objectContaining({ name: 'staging' }),
      ]),
    );
  });

  it('rejects create without initial_environment with COOLIFY_422 and recovery hint per D-09/D-10', async () => {
    const result = await handleProjectAction(
      { action: 'create', name: 'no-env-project' },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(true);
    if (!isProjectErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(result.structuredContent.error.recoveryHints?.length).toBeGreaterThan(0);
    expect(createProject).not.toHaveBeenCalled();
  });

  it('rejects create with empty initial_environment with COOLIFY_422 per D-09/D-10', async () => {
    const result = await handleProjectAction(
      { action: 'create', name: 'empty-env-project', initial_environment: '' },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(true);
    if (!isProjectErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(result.structuredContent.error.recoveryHints?.length).toBeGreaterThan(0);
    expect(createProject).not.toHaveBeenCalled();
  });

  it('create schema accepts missing initial_environment (handler rejects)', () => {
    expect(
      projectActionSchema.safeParse({
        action: 'create',
        name: 'schema-test',
      }).success,
    ).toBe(true);
  });

  it('accepts initial_environment on create schema when provided', () => {
    expect(
      projectActionSchema.safeParse({
        action: 'create',
        name: 'schema-test',
        initial_environment: 'production',
      }).success,
    ).toBe(true);
  });
});

describe('project update', () => {
  beforeEach(() => {
    vi.mocked(updateProject).mockReset();
    vi.mocked(updateProject).mockResolvedValue({
      uuid: 'proj-1',
      name: 'renamed-project',
      description: 'updated desc',
    });
  });

  it('patches name and description via PATCH /projects/{uuid} per PROJ-02', async () => {
    const result = await handleProjectAction(
      {
        action: 'update',
        uuid: 'proj-1',
        name: 'renamed-project',
        description: 'updated desc',
      },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(updateProject).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      { name: 'renamed-project', description: 'updated desc' },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isProjectErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'proj-1',
      name: 'renamed-project',
      description: 'updated desc',
    });
  });
});

describe('project delete', () => {
  beforeEach(() => {
    vi.mocked(deleteProject).mockReset();
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(fetchProject).mockReset();
    vi.mocked(fetchProject).mockResolvedValue(mockProject);
    vi.mocked(deleteProject).mockResolvedValue({ message: 'Deleted.' });
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per D-05', async () => {
    const result = await handleProjectAction(
      { action: 'delete', uuid: 'proj-1', confirm: false },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(true);
    if (!isProjectErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('deletes empty project when confirm:true and zero environments per D-07', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([]);

    const result = await handleProjectAction(
      { action: 'delete', uuid: 'proj-1', confirm: true },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(deleteProject).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isProjectErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'proj-1' });
  });

  it('returns COOLIFY_409 with environment_uuids when project has environments per D-07', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-1', name: 'production', id: 1 },
    ]);

    const result = await handleProjectAction(
      { action: 'delete', uuid: 'proj-1', confirm: true },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(true);
    if (!isProjectErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.environment_uuids).toEqual(['env-1']);
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('rejects force param on delete schema (no cascade in Phase 9)', () => {
    expect(
      projectActionSchema.safeParse({
        action: 'delete',
        uuid: 'proj-1',
        confirm: true,
        force: true,
      }).success,
    ).toBe(false);
  });
});

describe('project delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deleteProject).mockReset();
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(fetchProject).mockReset();
    vi.mocked(fetchProject).mockResolvedValue(mockProject);
  });

  it('returns uuid, environment_uuids, would_delete without DELETE per D-08', async () => {
    vi.mocked(fetchEnvironments).mockResolvedValue([
      { uuid: 'env-1', name: 'production', id: 1 },
    ]);

    const result = await handleProjectAction(
      { action: 'delete_preview', uuid: 'proj-1' },
      testEnv,
    );

    expect(isProjectErrorResult(result)).toBe(false);
    expect(deleteProject).not.toHaveBeenCalled();
    if (isProjectErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'proj-1',
      environment_uuids: ['env-1'],
      would_delete: false,
    });
  });
});
