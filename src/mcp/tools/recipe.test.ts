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
  createRedisDatabase,
  createMongodbDatabase,
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

  it('detects dockerfile when repo_path has Dockerfile', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('detects dockerfile when repo_path has Dockerfile.prod (Dockerfile.* glob, D-10 full)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('detects dockerfile when repo_path has Dockerfile.dev (D-10 full)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('defaults to nixpacks when repo_path has no Dockerfile or Dockerfile.* match', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('build_pack override wins over detection', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('rejects build_pack=dockercompose with hint to service.create/create-one-click (D-12)', async () => {
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

  it('requires build_pack when repo_path omitted (D-11)', async () => {
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

  it('error result carries soft manifest hint suggesting instance param or manifest context per D-20', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseGitAppArgs, repo_path: undefined },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.recoveryHints).toEqual(
      expect.arrayContaining([expect.stringMatching(/instance|manifest/i)]),
    );
  });

  it('calls createPublicApplication with detected build_pack + git_repository + git_branch', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('instant_deploy default true triggers deploy (D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('no confirm gate on create (D-17)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
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

  it('rejects repo_path outside allowlisted cwd root', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseGitAppArgs, repo_path: '/etc/evil-repo' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error.message).toMatch(/escapes allowlisted root/i);
    expect(createPublicApplication).not.toHaveBeenCalled();
  });

  it('returns deploy.status not_triggered when instant_deploy:false', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });

    const result = await handleRecipeAction(
      { ...baseGitAppArgs, repo_path: repoPath, instant_deploy: false },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.data.deploy).toEqual({ status: 'not_triggered' });
    expect(triggerDeploy).not.toHaveBeenCalled();
  });

  it('soft-ignores triggerDeploy failure after successful create (parity with create-app-db, D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');
    const repoPath = path.join(process.cwd(), 'my-repo');
    vi.mocked(statSync).mockImplementation((p) => {
      if (String(p) === path.join(repoPath, 'Dockerfile')) {
        return { isFile: () => true } as ReturnType<typeof statSync>;
      }
      throw new Error('ENOENT');
    });
    vi.mocked(triggerDeploy).mockRejectedValue(new Error('deploy queue failed'));

    const result = await handleRecipeAction({ ...baseGitAppArgs, repo_path: repoPath }, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.data.application_uuid).toBe('app-new-uuid');
    expect(result.data.deploy).toEqual({ status: 'not_triggered' });
  });
});

describe('recipe create-app-db', () => {
  beforeEach(() => {
    vi.mocked(createPostgresqlDatabase).mockReset();
    vi.mocked(createRedisDatabase).mockReset();
    vi.mocked(createMongodbDatabase).mockReset();
    vi.mocked(createPublicApplication).mockReset();
    vi.mocked(fetchDatabase).mockReset();
    vi.mocked(bulkUpdateEnvs).mockReset();
    vi.mocked(triggerDatabaseStart).mockReset();
    vi.mocked(triggerDeploy).mockReset();
    vi.mocked(deleteDatabase).mockReset();

    vi.mocked(createPostgresqlDatabase).mockResolvedValue({ uuid: 'db-new-uuid' });
    vi.mocked(createPublicApplication).mockResolvedValue({ uuid: 'app-new-uuid' });
    vi.mocked(fetchDatabase).mockResolvedValue({
      internal_db_url: 'postgresql://user:pass@host:5432/db',
    });
    vi.mocked(bulkUpdateEnvs).mockResolvedValue([]);
    vi.mocked(triggerDatabaseStart).mockResolvedValue({});
    vi.mocked(triggerDeploy).mockResolvedValue({ status: 'queued' });
  });

  it('success path wires DATABASE_URL by default (D-13)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.data).toMatchObject({
      application_uuid: 'app-new-uuid',
      database_uuid: 'db-new-uuid',
      env_key: 'DATABASE_URL',
      deploy: { status: 'queued' },
    });
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-new-uuid',
      [{ key: 'DATABASE_URL', value: 'postgresql://user:pass@host:5432/db' }],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('respects env_key override (D-13)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseAppDbArgs, env_key: 'POSTGRES_URL' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.data).toMatchObject({ env_key: 'POSTGRES_URL' });
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-new-uuid',
      [{ key: 'POSTGRES_URL', value: 'postgresql://user:pass@host:5432/db' }],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('reads internal_db_url from fetchDatabase (D-14)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(fetchDatabase).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-new-uuid',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-new-uuid',
      [{ key: 'DATABASE_URL', value: 'postgresql://user:pass@host:5432/db' }],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('constructs fallback URL when internal_db_url absent (D-14)', async () => {
    vi.mocked(fetchDatabase).mockResolvedValue({
      postgres_user: 'pguser',
      postgres_password: 'pgpass',
      postgres_db: 'pgdb',
      internal_hostname: 'db.internal',
      port: 5432,
    });

    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(bulkUpdateEnvs).toHaveBeenCalledWith(
      'application',
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-new-uuid',
      [
        {
          key: 'DATABASE_URL',
          value: 'postgresql://pguser:pgpass@db.internal:5432/pgdb',
        },
      ],
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns COOLIFY_RECIPE_PARTIAL_FAILURE on app create failure with database_uuid (D-15)', async () => {
    vi.mocked(createPublicApplication).mockRejectedValue(new Error('app create failed'));

    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_RECIPE_PARTIAL_FAILURE');
    expect(result.structuredContent.error.data).toMatchObject({
      database_uuid: 'db-new-uuid',
    });
    expect(deleteDatabase).not.toHaveBeenCalled();
    expect(bulkUpdateEnvs).not.toHaveBeenCalled();
  });

  it('returns COOLIFY_RECIPE_PARTIAL_FAILURE on env wiring failure with both UUIDs (D-15)', async () => {
    vi.mocked(bulkUpdateEnvs).mockRejectedValue(new Error('env wiring failed'));

    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_RECIPE_PARTIAL_FAILURE');
    expect(result.structuredContent.error.data).toMatchObject({
      application_uuid: 'app-new-uuid',
      database_uuid: 'db-new-uuid',
    });
    expect(deleteDatabase).not.toHaveBeenCalled();
  });

  it('masks connection_string unless reveal:true (D-19)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const masked = await handleRecipeAction(baseAppDbArgs, testEnv);
    expect(isRecipeErrorResult(masked)).toBe(false);
    if (isRecipeErrorResult(masked)) return;
    expect((masked.data as Record<string, unknown>).connection_string).toBe('***');

    const revealed = await handleRecipeAction(
      { ...baseAppDbArgs, reveal: true },
      testEnv,
    );
    expect(isRecipeErrorResult(revealed)).toBe(false);
    if (isRecipeErrorResult(revealed)) return;
    expect((revealed.data as Record<string, unknown>).connection_string).toBe(
      'postgresql://user:pass@host:5432/db',
    );
  });

  it('defaults instant_deploy true — triggers DB start and app deploy (D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(triggerDatabaseStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'db-new-uuid',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(triggerDeploy).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-new-uuid',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('skips lifecycle triggers when instant_deploy:false (D-16)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseAppDbArgs, instant_deploy: false },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.data.deploy).toEqual({ status: 'not_triggered' });
    expect(triggerDatabaseStart).not.toHaveBeenCalled();
    expect(triggerDeploy).not.toHaveBeenCalled();
  });

  it('has no confirm gate on create-app-db (D-17)', async () => {
    const { handleRecipeAction, isRecipeErrorResult, recipeActionSchema } =
      await import('./recipe.js');

    expect(
      recipeActionSchema.safeParse({ ...baseAppDbArgs, confirm: true }).success,
    ).toBe(false);

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('env-wiring failure recoveryHints contain manifest hint (D-20)', async () => {
    vi.mocked(bulkUpdateEnvs).mockRejectedValue(new Error('env wiring failed'));

    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseAppDbArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.recoveryHints).toEqual(
      expect.arrayContaining([expect.stringMatching(/instance|manifest/i)]),
    );
  });

  it('dispatches database create by engine (postgresql, redis, mongodb)', async () => {
    const { handleRecipeAction } = await import('./recipe.js');

    vi.mocked(createRedisDatabase).mockResolvedValue({ uuid: 'redis-db-uuid' });
    await handleRecipeAction(
      { ...baseAppDbArgs, db_engine: 'redis', db_name: 'redis-db' },
      testEnv,
    );
    expect(createRedisDatabase).toHaveBeenCalled();
    expect(createPostgresqlDatabase).not.toHaveBeenCalled();

    vi.mocked(createMongodbDatabase).mockResolvedValue({ uuid: 'mongo-db-uuid' });
    await handleRecipeAction(
      { ...baseAppDbArgs, db_engine: 'mongodb', db_name: 'mongo-db' },
      testEnv,
    );
    expect(createMongodbDatabase).toHaveBeenCalled();
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

  it('validates type against list-types (calls ofetch for service-templates.json) and rejects unknown type with COOLIFY_VALIDATION_ERROR (D-07)', async () => {
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

  it('delegates to service.create path (createService called with type in body) (D-07)', async () => {
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

  it('instant_deploy default true (D-16)', async () => {
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

  it('returns deploy.status not_triggered when instant_deploy:false', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseOneClickArgs, instant_deploy: false },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;

    expect(result.data.deploy).toEqual({ status: 'not_triggered' });
  });

  it('Object.hasOwn rejects prototype-inherited type (no __proto__ lookup)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(
      { ...baseOneClickArgs, type: 'toString' },
      testEnv,
    );

    expect(isRecipeErrorResult(result)).toBe(true);
    if (!isRecipeErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createService).not.toHaveBeenCalled();
  });

  it('no confirm gate (D-17)', async () => {
    const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

    const result = await handleRecipeAction(baseOneClickArgs, testEnv);

    expect(isRecipeErrorResult(result)).toBe(false);
    if (isRecipeErrorResult(result)) return;
    expect(result.structuredContent?.error?.code).not.toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(createService).toHaveBeenCalled();
  });

  it('SSRF rejected — type must match a key in service-templates.json, no arbitrary URL passthrough (D-01, T-20-02)', async () => {
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

  it('error result carries soft manifest hint suggesting instance param or manifest context per D-20', async () => {
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

/**
 * Wave 0 Nyquist RED scaffolds for Phase 31 recipe.recommend (SREC-01/02, D-14/D-15).
 * Plan 31-03 flips it.fails → it when recommend handler ships.
 */
describe('recipe recommend', () => {
  beforeEach(() => {
    vi.mocked(ofetch).mockReset();
    vi.mocked(createService).mockReset();
    vi.mocked(createPublicApplication).mockReset();
    vi.mocked(createPostgresqlDatabase).mockReset();
    vi.mocked(fetchVersion).mockReset();
    vi.mocked(ofetch).mockResolvedValue(serviceTemplates);
    vi.mocked(fetchVersion).mockResolvedValue({ version: '4.1.2' });
  });

  it.fails(
    'Next.js + Postgres returns plan_steps with recipe_action values and catalog_source live (SREC-01/02)',
    async () => {
      const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

      const result = await handleRecipeAction(
        {
          action: 'recommend',
          stack: 'Next.js + Postgres',
          server_uuid: 'srv-uuid-1',
          project_uuid: 'proj-uuid-1',
        } as never,
        testEnv,
      );

      expect(isRecipeErrorResult(result)).toBe(false);
      if (isRecipeErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      expect(data.advisory).toBe(true);
      expect(data.catalog_source).toBe('live');
      const steps = data.plan_steps as Array<Record<string, unknown>>;
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      const actions = steps.map((s) => s.recipe_action);
      expect(actions).toEqual(
        expect.arrayContaining(['create-git-app', 'create-app-db']),
      );
      expect(ofetch).toHaveBeenCalled();
    },
  );

  it.fails(
    'never invents catalog_id absent from mocked templates (D-15)',
    async () => {
      const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

      const result = await handleRecipeAction(
        {
          action: 'recommend',
          stack: 'gitea + actualbudget + invent-fake-service',
          server_uuid: 'srv-uuid-1',
        } as never,
        testEnv,
      );

      expect(isRecipeErrorResult(result)).toBe(false);
      if (isRecipeErrorResult(result)) return;

      const data = result.data as Record<string, unknown>;
      const matches = (data.matches ?? []) as Array<Record<string, unknown>>;
      const steps = (data.plan_steps ?? []) as Array<Record<string, unknown>>;
      const catalogIds = [
        ...matches.map((m) => m.catalog_id),
        ...steps.map((s) => (s.suggested_params as Record<string, unknown> | undefined)?.type),
      ].filter((id): id is string => typeof id === 'string');

      for (const id of catalogIds) {
        expect(Object.hasOwn(serviceTemplates, id)).toBe(true);
      }
    },
  );

  it.fails(
    'unknown unmappable stack → structured validation error with list-types recovery hint (D-14)',
    async () => {
      const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

      const result = await handleRecipeAction(
        {
          action: 'recommend',
          stack: 'zzzz-not-a-real-stack-xyzzy',
        } as never,
        testEnv,
      );

      expect(isRecipeErrorResult(result)).toBe(true);
      if (!isRecipeErrorResult(result)) return;

      expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
      expect(
        JSON.stringify(result.structuredContent.error.recoveryHints ?? []),
      ).toMatch(/list-types/i);
    },
  );

  it.fails(
    'recommend does not call createService / createApplication (D-14)',
    async () => {
      const { handleRecipeAction, isRecipeErrorResult } = await import('./recipe.js');

      const result = await handleRecipeAction(
        {
          action: 'recommend',
          stack: 'Next.js + Postgres',
          server_uuid: 'srv-uuid-1',
          project_uuid: 'proj-uuid-1',
        } as never,
        testEnv,
      );

      expect(isRecipeErrorResult(result)).toBe(false);
      if (isRecipeErrorResult(result)) return;

      expect(createService).not.toHaveBeenCalled();
      expect(createPublicApplication).not.toHaveBeenCalled();
      expect(createPostgresqlDatabase).not.toHaveBeenCalled();
      expect((result.data as Record<string, unknown>).advisory).toBe(true);
    },
  );
});
