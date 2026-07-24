import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  createPublicApplication: vi.fn(),
  triggerDeploy: vi.fn(),
  triggerAppStart: vi.fn(),
  bulkUpdateEnvs: vi.fn(),
  fetchDatabase: vi.fn(),
  triggerDatabaseStart: vi.fn(),
  createPostgresqlDatabase: vi.fn(),
  createMysqlDatabase: vi.fn(),
  createMariadbDatabase: vi.fn(),
  createMongodbDatabase: vi.fn(),
  createRedisDatabase: vi.fn(),
  createClickhouseDatabase: vi.fn(),
  createDragonflyDatabase: vi.fn(),
  createKeydbDatabase: vi.fn(),
  createService: vi.fn(),
  fetchService: vi.fn(),
  fetchResources: vi.fn(),
  fetchVersion: vi.fn(),
  deleteDatabase: vi.fn(),
}));

vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}));

vi.mock('../../utils/manifest.js', () => ({
  ManifestManager: {
    autoUpsert: vi.fn(),
    autoRemove: vi.fn(),
    findResourceContext: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  realpathSync: vi.fn((p: string) => p),
  openSync: vi.fn(() => 42),
  fstatSync: vi.fn(() => ({ size: 64 })),
  closeSync: vi.fn(),
  statSync: vi.fn(() => ({ isFile: () => false })),
  readdirSync: vi.fn(() => [] as string[]),
}));

import {
  createPublicApplication,
  triggerDeploy,
  bulkUpdateEnvs,
  fetchDatabase,
  triggerDatabaseStart,
  createPostgresqlDatabase,
  createService,
  fetchResources,
  fetchVersion,
  deleteDatabase,
} from '../../api/client.js';
import { ofetch } from 'ofetch';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const serviceTemplates = {
  actualbudget: { name: 'Actual Budget' },
  gitea: { name: 'Gitea' },
};

const baseGitAppArgs = {
  action: 'create-git-app' as const,
  server_uuid: 'srv-uuid-1',
  git_repository: 'https://github.com/org/repo',
  git_branch: 'main',
  project_uuid: 'proj-uuid-1',
  environment_uuid: 'env-uuid-1',
};

const baseAppDbArgs = {
  action: 'create-app-db' as const,
  server_uuid: 'srv-uuid-1',
  app_name: 'my-app',
  db_name: 'my-db',
  db_engine: 'postgresql' as const,
  project_uuid: 'proj-uuid-1',
  environment_uuid: 'env-uuid-1',
};

const baseOneClickArgs = {
  action: 'create-one-click' as const,
  server_uuid: 'srv-uuid-1',
  type: 'gitea',
  project_uuid: 'proj-uuid-1',
  environment_uuid: 'env-uuid-1',
};

describe('recipe create-git-app', () => {
  beforeEach(() => {
    vi.mocked(createPublicApplication).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(readdirSync).mockReset();
    vi.mocked(statSync).mockReset();
    vi.mocked(readdirSync).mockReturnValue([]);
    vi.mocked(statSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    vi.mocked(createPublicApplication).mockResolvedValue({ uuid: 'app-new-uuid' });
    vi.mocked(triggerDeploy).mockResolvedValue({ status: 'queued' });
  });

  it.fails('detects dockerfile when repo_path has Dockerfile', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ build_pack: 'dockerfile' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('detects dockerfile when repo_path has Dockerfile.prod (Dockerfile.* glob, D-10 full)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(readdirSync).mockReturnValue(['Dockerfile.prod']);
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile.prod')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ build_pack: 'dockerfile' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('detects dockerfile when repo_path has Dockerfile.dev (D-10 full)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(readdirSync).mockReturnValue(['Dockerfile.dev']);
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile.dev')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ build_pack: 'dockerfile' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('defaults to nixpacks when repo_path has no Dockerfile or Dockerfile.* match', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(readdirSync).mockReturnValue(['package.json', 'README.md']);
    vi.mocked(statSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ build_pack: 'nixpacks' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('build_pack override wins over detection', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction(
      { ...baseGitAppArgs, repo_path: repoPath, build_pack: 'static' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ build_pack: 'static' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('rejects build_pack=dockercompose with hint to service.create/create-one-click (D-12)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseGitAppArgs, build_pack: 'dockercompose' as 'nixpacks' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error.recoveryHints?.join(' ')).toMatch(
      /service\.create|create-one-click/i,
    );
    expect(createPublicApplication).not.toHaveBeenCalled();
  });

  it.fails('requires build_pack when repo_path omitted (D-11)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseGitAppArgs, repo_path: undefined },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createPublicApplication).not.toHaveBeenCalled();
  });

  it.fails('calls createPublicApplication with detected build_pack + git_repository + git_branch', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPublicApplication).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        build_pack: 'dockerfile',
        git_repository: baseGitAppArgs.git_repository,
        git_branch: baseGitAppArgs.git_branch,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('instant_deploy default true triggers deploy (D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(triggerDeploy).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-new-uuid',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('no confirm gate on create (D-17)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = '/tmp/my-repo';
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(createPublicApplication).toHaveBeenCalled();
  });
});

describe('recipe create-app-db', () => {
  beforeEach(() => {
    vi.mocked(createPostgresqlDatabase).mockReset();
    vi.mocked(createPublicApplication).mockReset();
    vi.mocked(fetchDatabase).mockReset();
    vi.mocked(bulkUpdateEnvs).mockReset();
    vi.mocked(triggerDatabaseStart).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(deleteDatabase).mockReset();
    vi.mocked(createPostgresqlDatabase).mockResolvedValue({ uuid: 'db-uuid-1' });
    vi.mocked(createPublicApplication).mockResolvedValue({ uuid: 'app-uuid-1' });
    vi.mocked(fetchDatabase).mockResolvedValue({
      uuid: 'db-uuid-1',
      internal_db_url: 'postgresql://user:pass@host:5432/db',
    });
    vi.mocked(bulkUpdateEnvs).mockResolvedValue({ updated: 1 });
    vi.mocked(triggerDatabaseStart).mockResolvedValue({ status: 'started' });
    vi.mocked(triggerDeploy).mockResolvedValue({ status: 'queued' });
  });

  it.fails('creates postgresql DB then app then wires DATABASE_URL env (D-13 default)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createPostgresqlDatabase).toHaveBeenCalled();
    expect(createPublicApplication).toHaveBeenCalled();
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      [expect.objectContaining({ key: 'DATABASE_URL' })],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('env_key override respected (D-13)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseAppDbArgs, env_key: 'POSTGRES_URL' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      [expect.objectContaining({ key: 'POSTGRES_URL' })],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('reads internal_db_url from GET /databases/{uuid} (D-14)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(fetchDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      [
        expect.objectContaining({
          value: 'postgresql://user:pass@host:5432/db',
        }),
      ],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('constructs fallback URL when internal_db_url absent (D-14)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    vi.mocked(fetchDatabase).mockResolvedValue({ uuid: 'db-uuid-1' });

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      [expect.objectContaining({ key: 'DATABASE_URL', value: expect.stringMatching(/^postgres/i) })],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('partial failure on app create returns COOLIFY_RECIPE_PARTIAL_FAILURE with database_uuid in data and no auto-rollback (D-15)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    vi.mocked(createPublicApplication).mockRejectedValue(new Error('App create failed'));

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_RECIPE_PARTIAL_FAILURE');
    expect(result.structuredContent.error.data).toMatchObject({ database_uuid: 'db-uuid-1' });
    expect(deleteDatabase).not.toHaveBeenCalled();
  });

  it.fails('connection_string masked unless reveal:true (D-19)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const masked = await handleRecipeAction(baseAppDbArgs, testEnv);
    expect(isRecipeErrorResult(masked)).toBe(false);
    if (isRecipeErrorResult(masked)) return;
    expect((masked.data as Record<string, unknown>).connection_string).toBe('***');

    const revealed = await handleRecipeAction({ ...baseAppDbArgs, reveal: true }, testEnv);
    expect(isRecipeErrorResult(revealed)).toBe(false);
    if (isRecipeErrorResult(revealed)) return;
    expect((revealed.data as Record<string, unknown>).connection_string).toBe(
      'postgresql://user:pass@host:5432/db',
    );
  });

  it.fails('instant_deploy default true (D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(triggerDatabaseStart).toHaveBeenCalled();
    expect(triggerDeploy).toHaveBeenCalled();
  });

  it.fails('no confirm gate (D-17)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(createPostgresqlDatabase).toHaveBeenCalled();
  });

  it.fails('error result carries soft manifest hint suggesting instance param or manifest context per D-20', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    vi.mocked(createPublicApplication).mockRejectedValue(new Error('App create failed'));

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.recoveryHints).toEqual(
      expect.arrayContaining([expect.stringMatching(/instance|manifest/i)]),
    );
  });
});

describe('recipe create-one-click', () => {
  beforeEach(() => {
    vi.mocked(ofetch).mockReset();
    vi.mocked(createService).mockReset();
    vi.mocked(fetchVersion).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(ofetch).mockResolvedValue(serviceTemplates);
    vi.mocked(fetchVersion).mockResolvedValue({ version: '4.1.2' });
    vi.mocked(createService).mockResolvedValue({ uuid: 'svc-uuid-1' });
  });

  it.fails('validates type against list-types (calls ofetch for service-templates.json) and rejects unknown type with COOLIFY_VALIDATION_ERROR (D-07)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseOneClickArgs, type: 'unknown-service' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(ofetch).toHaveBeenCalled();
    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createService).not.toHaveBeenCalled();
  });

  it.fails('delegates to service.create path (createService called with type in body) (D-07)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseOneClickArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ type: 'gitea' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('instant_deploy default true (D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseOneClickArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ instant_deploy: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it.fails('no confirm gate (D-17)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseOneClickArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(createService).toHaveBeenCalled();
  });

  it.fails('SSRF rejected — type must match a key in service-templates.json, no arbitrary URL passthrough (D-01, T-20-02)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseOneClickArgs, type: 'https://evil.example/templates.json' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(ofetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/(cdn\.jsdelivr\.net|raw\.githubusercontent\.com)/),
      expect.anything(),
    );
    expect(createService).not.toHaveBeenCalled();
  });

  it.fails('error result carries soft manifest hint suggesting instance param or manifest context per D-20', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseOneClickArgs, type: 'unknown-service' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.recoveryHints).toEqual(
      expect.arrayContaining([expect.stringMatching(/instance|manifest/i)]),
    );
  });
});
