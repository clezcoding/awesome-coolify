import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleEnvironmentAction,
  environmentActionSchema,
  isEnvironmentErrorResult,
} from './environment.js';
import {
  handleResourceAction,
  isResourceErrorResult,
} from './resource.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchEnvironments: vi.fn(),
  fetchEnvironment: vi.fn(),
  createEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  fetchResources: vi.fn(),
}));

import {
  fetchProjects,
  fetchProject,
  fetchEnvironments,
  fetchEnvironment,
  createEnvironment,
  deleteEnvironment,
  fetchResources,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockProject = {
  uuid: 'proj-1',
  name: 'my-project',
  description: 'test project',
  environments: [{ uuid: 'env-1', name: 'production', id: 1 }],
};

const mockEnv = {
  uuid: 'env-1',
  name: 'production',
  id: 1,
  project_uuid: 'proj-1',
};

describe('environment list', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvironments).mockReset();
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchProject).mockReset();
    vi.mocked(fetchEnvironments).mockResolvedValue([mockEnv]);
    vi.mocked(fetchProject).mockResolvedValue(mockProject);
  });

  it('returns env summaries scoped by project_uuid per D-03', async () => {
    const result = await handleEnvironmentAction(
      { action: 'list', project_uuid: 'proj-1' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    if (isEnvironmentErrorResult(result)) return;

    const data = result.data as Array<Record<string, unknown>>;
    expect(data[0]).toMatchObject({
      uuid: 'env-1',
      name: 'production',
      project_uuid: 'proj-1',
      project_name: 'my-project',
    });
  });

  it('resolves project_name single match and lists envs per D-03/D-12', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([mockProject]);

    const result = await handleEnvironmentAction(
      { action: 'list', project_name: 'my-project' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(fetchProjects).toHaveBeenCalled();
    if (isEnvironmentErrorResult(result)) return;

    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as Array<Record<string, unknown>>)[0]).toMatchObject({
      name: 'production',
      project_name: 'my-project',
    });
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on project_name multi-match per D-12', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1', name: 'dup-proj' },
      { uuid: 'proj-2', name: 'dup-proj' },
    ]);

    const result = await handleEnvironmentAction(
      { action: 'list', project_name: 'dup-proj' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(true);
    if (!isEnvironmentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(fetchEnvironments).not.toHaveBeenCalled();
  });
});

describe('environment get', () => {
  beforeEach(() => {
    vi.mocked(fetchEnvironment).mockReset();
    vi.mocked(fetchProject).mockReset();
    vi.mocked(fetchEnvironment).mockResolvedValue(mockEnv);
    vi.mocked(fetchProject).mockResolvedValue(mockProject);
  });

  it('returns environment fields by uuid within project per D-13', async () => {
    const result = await handleEnvironmentAction(
      { action: 'get', project_uuid: 'proj-1', uuid: 'env-1' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(fetchEnvironment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      'env-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isEnvironmentErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'env-1',
      name: 'production',
      project_uuid: 'proj-1',
    });
  });

  it('resolves environment by name within project via name_or_uuid endpoint per D-13', async () => {
    const result = await handleEnvironmentAction(
      { action: 'get', project_uuid: 'proj-1', name: 'production' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(fetchEnvironment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      'production',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isEnvironmentErrorResult(result)) return;

    expect(result.data).toMatchObject({ name: 'production' });
  });
});

describe('environment create', () => {
  beforeEach(() => {
    vi.mocked(createEnvironment).mockReset();
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(createEnvironment).mockResolvedValue({
      uuid: 'env-new',
      name: 'staging',
    });
  });

  it('creates environment with project_uuid and name per PROJ-04', async () => {
    const result = await handleEnvironmentAction(
      { action: 'create', project_uuid: 'proj-1', name: 'staging' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(createEnvironment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      { name: 'staging' },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isEnvironmentErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'env-new',
      name: 'staging',
      project_uuid: 'proj-1',
    });
  });

  it('resolves project_name then creates environment per D-12', async () => {
    vi.mocked(fetchProjects).mockResolvedValue([mockProject]);

    const result = await handleEnvironmentAction(
      { action: 'create', project_name: 'my-project', name: 'staging' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(fetchProjects).toHaveBeenCalled();
    expect(createEnvironment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      { name: 'staging' },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isEnvironmentErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'env-new', name: 'staging' });
  });

  it('returns COOLIFY_409 on duplicate environment name per D-15', async () => {
    vi.mocked(createEnvironment).mockRejectedValue(
      Object.assign(new Error('Conflict'), {
        data: { code: 'COOLIFY_409', message: 'Environment already exists' },
      }),
    );

    const result = await handleEnvironmentAction(
      { action: 'create', project_uuid: 'proj-1', name: 'production' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(true);
    if (!isEnvironmentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.recoveryHints?.length).toBeGreaterThan(0);
  });

  it('rejects action update on schema (no API PATCH per PROHIB_ABSENT)', () => {
    expect(
      environmentActionSchema.safeParse({
        action: 'update',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        name: 'renamed',
      }).success,
    ).toBe(false);
  });
});

describe('environment delete', () => {
  beforeEach(() => {
    vi.mocked(deleteEnvironment).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchEnvironment).mockReset();
    vi.mocked(fetchEnvironment).mockResolvedValue(mockEnv);
    vi.mocked(deleteEnvironment).mockResolvedValue({ message: 'Deleted.' });
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per D-05', async () => {
    const result = await handleEnvironmentAction(
      {
        action: 'delete',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        confirm: false,
      },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(true);
    if (!isEnvironmentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteEnvironment).not.toHaveBeenCalled();
  });

  it('deletes empty environment when confirm:true per PROJ-05', async () => {
    const result = await handleEnvironmentAction(
      {
        action: 'delete',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        confirm: true,
      },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(deleteEnvironment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'proj-1',
      'env-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isEnvironmentErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'env-1' });
  });

  it('returns COOLIFY_409 with child_resource_uuids on non-empty env per D-06', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-1',
        name: 'my-app',
        type: 'application',
        environment_id: 1,
      },
    ]);

    const result = await handleEnvironmentAction(
      {
        action: 'delete',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        confirm: true,
      },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(true);
    if (!isEnvironmentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.child_resource_uuids).toEqual(['app-1']);
    expect(deleteEnvironment).not.toHaveBeenCalled();
  });

  it('hard-blocks delete when child resource status is deleting per RESEARCH pitfall 2', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-del',
        name: 'removing-app',
        type: 'application',
        environment_id: 1,
        status: 'deleting',
      },
    ]);

    const result = await handleEnvironmentAction(
      {
        action: 'delete',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        confirm: true,
      },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(true);
    if (!isEnvironmentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.child_resource_uuids).toEqual(['app-del']);
    expect(deleteEnvironment).not.toHaveBeenCalled();
  });

  it('hard-blocks delete when child resource status is destroying per RESEARCH pitfall 2', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'svc-destroy',
        name: 'removing-svc',
        type: 'service',
        environment_id: 1,
        status: 'destroying',
      },
    ]);

    const result = await handleEnvironmentAction(
      {
        action: 'delete',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        confirm: true,
      },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(true);
    if (!isEnvironmentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.child_resource_uuids).toEqual(['svc-destroy']);
    expect(deleteEnvironment).not.toHaveBeenCalled();
  });

  it('rejects force param on delete schema (no cascade in Phase 9)', () => {
    expect(
      environmentActionSchema.safeParse({
        action: 'delete',
        project_uuid: 'proj-1',
        uuid: 'env-1',
        confirm: true,
        force: true,
      }).success,
    ).toBe(false);
  });
});

describe('environment delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deleteEnvironment).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchEnvironment).mockReset();
    vi.mocked(fetchEnvironment).mockResolvedValue(mockEnv);
  });

  it('returns uuid, child_resources, would_delete without DELETE per D-08', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      {
        uuid: 'app-1',
        name: 'my-app',
        type: 'application',
        environment_id: 1,
      },
    ]);

    const result = await handleEnvironmentAction(
      { action: 'delete_preview', project_uuid: 'proj-1', uuid: 'env-1' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(result)).toBe(false);
    expect(deleteEnvironment).not.toHaveBeenCalled();
    if (isEnvironmentErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'env-1',
      would_delete: false,
      child_resources: expect.arrayContaining([
        expect.objectContaining({ uuid: 'app-1' }),
      ]),
    });
  });
});

describe('environment create SC#4 resource.list integration', () => {
  beforeEach(() => {
    vi.mocked(createEnvironment).mockReset();
    vi.mocked(fetchProjects).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(createEnvironment).mockResolvedValue({
      uuid: 'env-new',
      name: 'staging',
    });
    vi.mocked(fetchProjects).mockResolvedValue([
      {
        uuid: 'proj-1',
        name: 'my-project',
        environments: [
          { uuid: 'env-1', name: 'production', id: 1 },
          { uuid: 'env-new', name: 'staging', id: 2 },
        ],
      },
    ]);
    vi.mocked(fetchResources).mockResolvedValue([]);
  });

  it('surfaces new env uuid in resource.list type=environment after create per SC#4', async () => {
    const createResult = await handleEnvironmentAction(
      { action: 'create', project_uuid: 'proj-1', name: 'staging' },
      testEnv,
    );

    expect(isEnvironmentErrorResult(createResult)).toBe(false);
    if (isEnvironmentErrorResult(createResult)) return;

    expect(createResult.data).toMatchObject({ uuid: 'env-new', name: 'staging' });

    const listResult = await handleResourceAction(
      { action: 'list', type: 'environment' },
      testEnv,
    );

    expect(isResourceErrorResult(listResult)).toBe(false);
    if (isResourceErrorResult(listResult)) return;

    const uuids = (listResult.data as Array<{ uuid: string }>).map((e) => e.uuid);
    expect(uuids).toContain('env-new');
  });
});
