import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../config/env.js';
import { buildProjectEnvironmentIndex } from './project-lookup.js';

vi.mock('../api/client.js', () => ({
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
}));

import { fetchProjects, fetchProject } from '../api/client.js';

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
