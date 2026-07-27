import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { EnvConfig } from '../../config/env.js';

const PROJECT_UUID = '00000000-0000-4000-8000-000000000001';
const ENV_UUID = '00000000-0000-4000-8000-000000000002';
const SERVER_UUID = '00000000-0000-4000-8000-000000000003';
const APP_UUID = '00000000-0000-4000-8000-000000000004';
const SERVICE_UUID = '00000000-0000-4000-8000-000000000005';

const { checkGhAuthMock, createGhRepoMock } = vi.hoisted(() => ({
  checkGhAuthMock: vi.fn(),
  createGhRepoMock: vi.fn(),
}));

vi.mock('../../utils/gh-preflight.js', () => ({
  checkGhAuth: checkGhAuthMock,
  createGhRepo: createGhRepoMock,
  createGhRepoNoPush: (repoName: string, cwd?: string) =>
    createGhRepoMock(repoName, { cwd, push: false }),
}));

vi.mock('../../api/client.js', () => ({
  fetchProject: vi.fn(),
  fetchEnvironment: vi.fn(),
  fetchServer: vi.fn(),
}));

vi.mock('./recipe.js', () => ({
  handleRecipeAction: vi.fn(),
  isRecipeErrorResult: (result: { isError?: boolean }) => result.isError === true,
}));

vi.mock('./project.js', () => ({
  handleProjectAction: vi.fn(),
  isProjectErrorResult: (result: { isError?: boolean }) => result.isError === true,
}));

vi.mock('./application.js', () => ({
  handleApplicationAction: vi.fn(),
  isApplicationErrorResult: (result: { isError?: boolean }) => result.isError === true,
}));

vi.mock('./deployment.js', () => ({
  handleDeploymentAction: vi.fn(),
  isDeploymentErrorResult: (result: { isError?: boolean }) => result.isError === true,
}));

import {
  fetchProject,
  fetchEnvironment,
  fetchServer,
} from '../../api/client.js';
import { handleRecipeAction } from './recipe.js';
import { handleApplicationAction } from './application.js';
import { handleDeploymentAction } from './deployment.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

let testWorkspaceRoot: string;

function mockLinkageFetch(): void {
  vi.mocked(fetchProject).mockResolvedValue({
    uuid: PROJECT_UUID,
    name: 'Test Project',
  });
  vi.mocked(fetchEnvironment).mockResolvedValue({
    uuid: ENV_UUID,
    name: 'production',
  });
  vi.mocked(fetchServer).mockResolvedValue({
    uuid: SERVER_UUID,
    name: 'Test Server',
  });
}

describe('handleSetupAction preflight', () => {
  beforeEach(() => {
    checkGhAuthMock.mockReset();
    testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-setup-'));
    process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  });

  afterEach(() => {
    delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
    rmSync(testWorkspaceRoot, { recursive: true, force: true });
  });

  it('returns COOLIFY_SETUP_PAUSED when gh preflight fails', async () => {
    checkGhAuthMock.mockResolvedValue({
      ok: false,
      reason: 'gh_unauthenticated',
      message: 'GitHub CLI not authenticated',
    });

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction({ action: 'preflight' }, testEnv);

    expect(isSetupErrorResult(result)).toBe(true);
    if (!isSetupErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_SETUP_PAUSED');
    expect(result.structuredContent.error.recoveryHints?.join(' ')).toMatch(/resume/i);
  });

  it('returns ok with setup progress when preflight passes', async () => {
    checkGhAuthMock.mockResolvedValue({ ok: true });

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction({ action: 'preflight' }, testEnv);

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(result.data).toMatchObject({
      setup_status: expect.any(String),
    });
  });

  it('resume re-runs preflight without in-tool sleep between calls', async () => {
    checkGhAuthMock
      .mockResolvedValueOnce({
        ok: false,
        reason: 'gh_unauthenticated',
        message: 'GitHub CLI not authenticated',
      })
      .mockResolvedValueOnce({ ok: true });

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');

    const pauseResult = await handleSetupAction({ action: 'preflight' }, testEnv);
    expect(isSetupErrorResult(pauseResult)).toBe(true);

    const resumeResult = await handleSetupAction({ action: 'resume' }, testEnv);
    expect(isSetupErrorResult(resumeResult)).toBe(false);
    expect(checkGhAuthMock).toHaveBeenCalledTimes(2);
  });
});

describe('handleSetupAction wire link-existing', () => {
  beforeEach(() => {
    checkGhAuthMock.mockReset();
    createGhRepoMock.mockReset();
    vi.mocked(handleRecipeAction).mockReset();
    mockLinkageFetch();
    checkGhAuthMock.mockResolvedValue({ ok: true });
    testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-setup-'));
    process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  });

  afterEach(() => {
    delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
    rmSync(testWorkspaceRoot, { recursive: true, force: true });
  });

  it('upserts manifest without calling handleRecipeAction', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'link-existing',
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        server_uuid: SERVER_UUID,
        skip_gh: true,
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(result.data).toMatchObject({
      setup_status: 'complete',
      mode: 'link-existing',
      manifest_path: '.coolify/manifest.json',
      project_uuid: PROJECT_UUID,
      environment_uuid: ENV_UUID,
      server_uuid: SERVER_UUID,
    });
    expect(result.data.steps_completed).toEqual(
      expect.arrayContaining(['linkage', 'manifest']),
    );
    expect(handleRecipeAction).not.toHaveBeenCalled();

    const manifestPath = join(testWorkspaceRoot, '.coolify', 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.projects[0].uuid).toBe(PROJECT_UUID);
  });

  it('skips gh preflight when skip_gh true and no repo_name', async () => {
    const { handleSetupAction } = await import('./setup.js');
    await handleSetupAction(
      {
        action: 'wire',
        mode: 'link-existing',
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        server_uuid: SERVER_UUID,
        skip_gh: true,
      },
      testEnv,
    );

    expect(checkGhAuthMock).not.toHaveBeenCalled();
  });
});

describe('handleSetupAction wire greenfield', () => {
  beforeEach(() => {
    checkGhAuthMock.mockReset();
    createGhRepoMock.mockReset();
    vi.mocked(handleRecipeAction).mockReset();
    mockLinkageFetch();
    checkGhAuthMock.mockResolvedValue({ ok: true });
    createGhRepoMock.mockResolvedValue({
      repo_name: 'my-new-repo',
      repo_url: 'https://github.com/org/my-new-repo',
    });
    vi.mocked(handleRecipeAction).mockResolvedValue({
      data: { application_uuid: APP_UUID },
    });
    testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-setup-'));
    process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  });

  afterEach(() => {
    delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
    rmSync(testWorkspaceRoot, { recursive: true, force: true });
  });

  it('runs recipe and manifest upsert with manual push suggestion by default', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        repo_name: 'my-new-repo',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(createGhRepoMock).toHaveBeenCalledWith('my-new-repo', { push: false });
    expect(handleRecipeAction).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({
      setup_status: 'complete',
      mode: 'greenfield',
      manifest_path: '.coolify/manifest.json',
      resource_uuid: APP_UUID,
    });
    expect(String(result.data._formattedText)).toMatch(/git push/i);
    expect(String(result.data._formattedText)).toMatch(/manual/i);
  });

  it('passes push true to createGhRepo and omits manual push banner', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        repo_name: 'my-new-repo',
        push: true,
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(createGhRepoMock).toHaveBeenCalledWith('my-new-repo', { push: true });
    expect(String(result.data._formattedText)).not.toMatch(/manual.*git push/i);
  });

  it('resume continues wire with re-supplied params', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'resume',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        skip_gh: true,
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(result.data.setup_status).toBe('complete');
    expect(handleRecipeAction).toHaveBeenCalledTimes(1);
  });
});

describe('handleSetupAction wire deploy_and_watch', () => {
  beforeEach(() => {
    checkGhAuthMock.mockReset();
    createGhRepoMock.mockReset();
    vi.mocked(handleRecipeAction).mockReset();
    vi.mocked(handleApplicationAction).mockReset();
    vi.mocked(handleDeploymentAction).mockReset();
    mockLinkageFetch();
    checkGhAuthMock.mockResolvedValue({ ok: true });
    vi.mocked(handleRecipeAction).mockResolvedValue({
      data: { application_uuid: APP_UUID },
    });
    vi.mocked(handleApplicationAction).mockResolvedValue({
      data: { deployment_uuid: 'dep-watch-uuid' },
    });
    vi.mocked(handleDeploymentAction).mockResolvedValue({
      isError: true,
      structuredContent: {
        error: {
          code: 'COOLIFY_WATCH_TIMEOUT',
          message: 'Watch timed out',
          recoveryHints: ['Re-call deployment({ action: "watch", deployment_uuid: "..." })'],
        },
      },
      content: [{ type: 'text', text: 'timeout' }],
    });
    testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-setup-'));
    process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  });

  afterEach(() => {
    delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
    rmSync(testWorkspaceRoot, { recursive: true, force: true });
  });

  it('returns deployment_uuid and recovery hints on COOLIFY_WATCH_TIMEOUT', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        skip_gh: true,
        deploy_and_watch: true,
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(result.data.deployment_uuid).toBe('dep-watch-uuid');
    expect(result.data.watch_timed_out).toBe(true);
    expect(String(result.data._formattedText)).toMatch(/dep-watch-uuid/);
    expect(String(result.data._formattedText)).toMatch(/deployment.*watch/i);
    expect(handleDeploymentAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'watch',
        deployment_uuid: 'dep-watch-uuid',
        timeout: 300,
      }),
      testEnv,
    );
  });
});

describe('set_env', () => {
  beforeEach(() => {
    checkGhAuthMock.mockReset();
    createGhRepoMock.mockReset();
    vi.mocked(handleRecipeAction).mockReset();
    vi.mocked(handleApplicationAction).mockReset();
    mockLinkageFetch();
    checkGhAuthMock.mockResolvedValue({ ok: true });
    vi.mocked(handleRecipeAction).mockResolvedValue({
      data: { application_uuid: APP_UUID },
    });
    vi.mocked(handleApplicationAction).mockResolvedValue({
      data: { dry_run: false, added: [], updated: [{ key: 'FOO' }] },
    });
    testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-setup-'));
    process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  });

  afterEach(() => {
    delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
    rmSync(testWorkspaceRoot, { recursive: true, force: true });
  });

  it('link-existing wire delegates envs:sync and marks env step complete', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'link-existing',
        application_uuid: APP_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        server_uuid: SERVER_UUID,
        skip_gh: true,
        set_env: true,
        env_content: 'FOO=bar',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(handleApplicationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'envs:sync',
        uuid: APP_UUID,
        env_content: 'FOO=bar',
        dry_run: false,
        confirm: true,
      }),
      testEnv,
    );
    expect(handleApplicationAction.mock.calls[0]?.[0]).not.toHaveProperty('conflict_policy');
    expect(result.data.steps_completed).toContain('env');
  });

  it('greenfield create-git-app wire delegates envs:sync with recipe application uuid', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        skip_gh: true,
        set_env: true,
        env_content: 'FOO=bar',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(handleApplicationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'envs:sync',
        uuid: APP_UUID,
        env_content: 'FOO=bar',
        dry_run: false,
        confirm: true,
      }),
      testEnv,
    );
    expect(handleApplicationAction.mock.calls[0]?.[0]).not.toHaveProperty('conflict_policy');
    expect(result.data.steps_completed).toContain('env');
  });

  it('link-existing wire delegates envs:sync with env_file path', async () => {
    const envFilePath = join(testWorkspaceRoot, '.env');
    writeFileSync(envFilePath, 'FOO=bar\n');

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'link-existing',
        application_uuid: APP_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        server_uuid: SERVER_UUID,
        skip_gh: true,
        set_env: true,
        env_file: envFilePath,
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(handleApplicationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'envs:sync',
        uuid: APP_UUID,
        env_file: envFilePath,
        dry_run: false,
        confirm: true,
      }),
      testEnv,
    );
    expect(handleApplicationAction.mock.calls[0]?.[0]).not.toHaveProperty('env_content');
    expect(handleApplicationAction.mock.calls[0]?.[0]).not.toHaveProperty('conflict_policy');
    expect(result.data.steps_completed).toContain('env');
  });

  it('rejects set_env:true without env_file or env_content at schema boundary', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        skip_gh: true,
        set_env: true,
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(true);
    if (!isSetupErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(handleApplicationAction).not.toHaveBeenCalled();
  });

  it('rejects set_env:true with both env_file and env_content (XOR)', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'link-existing',
        application_uuid: APP_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        server_uuid: SERVER_UUID,
        skip_gh: true,
        set_env: true,
        env_file: '.env',
        env_content: 'FOO=bar',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(true);
    if (!isSetupErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(handleApplicationAction).not.toHaveBeenCalled();
  });

  it('propagates COOLIFY_CONFIRM_REQUIRED on conflict abort without env step', async () => {
    vi.mocked(handleApplicationAction).mockResolvedValue({
      isError: true,
      structuredContent: {
        error: {
          code: 'COOLIFY_CONFIRM_REQUIRED',
          message: 'Value conflicts require human resolution',
          recoveryHints: ['Ask human to choose conflict_policy'],
        },
      },
      content: [{ type: 'text', text: 'confirm required' }],
    });

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'link-existing',
        application_uuid: APP_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        server_uuid: SERVER_UUID,
        skip_gh: true,
        set_env: true,
        env_content: 'FOO=bar',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(true);
    if (!isSetupErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(handleApplicationAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'envs:sync' }),
      testEnv,
    );
    expect(handleApplicationAction.mock.calls[0]?.[0]).not.toHaveProperty('conflict_policy');
  });

  it('rejects set_env on create-one-click service resource (non-application)', async () => {
    vi.mocked(handleRecipeAction).mockResolvedValue({
      data: { service_uuid: SERVICE_UUID },
    });

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'wire',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-one-click',
        type: 'postgresql',
        skip_gh: true,
        set_env: true,
        env_content: 'FOO=bar',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(true);
    if (!isSetupErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error.message).toMatch(/requires an application resource/i);
    expect(handleApplicationAction).not.toHaveBeenCalled();
  });

  it('resume with set_env:true delegates envs:sync like wire', async () => {
    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction(
      {
        action: 'resume',
        mode: 'greenfield',
        server_uuid: SERVER_UUID,
        project_uuid: PROJECT_UUID,
        environment_uuid: ENV_UUID,
        recipe_type: 'create-git-app',
        skip_gh: true,
        set_env: true,
        env_content: 'FOO=bar',
      },
      testEnv,
    );

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(handleApplicationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'envs:sync',
        uuid: APP_UUID,
        env_content: 'FOO=bar',
        dry_run: false,
        confirm: true,
      }),
      testEnv,
    );
    expect(handleApplicationAction.mock.calls[0]?.[0]).not.toHaveProperty('conflict_policy');
    expect(result.data.steps_completed).toContain('env');
  });
});
