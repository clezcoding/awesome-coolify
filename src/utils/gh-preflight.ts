import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CoolifyApiError, RECOVERY_HINTS } from './errors.js';
import { resolveProjectRoot } from './project-root.js';

const execFileAsync = promisify(execFile);

export const GH_TIMEOUT_MS = 5_000;
export const GH_REPO_CREATE_TIMEOUT_MS = 30_000;

const GH_ENV = { ...process.env, GH_FORCE_TTY: '0' };

const REPO_NAME_REGEX = /^[A-Za-z0-9._-]+$/;

type ExecFileError = NodeJS.ErrnoException & {
  killed?: boolean;
  stderr?: string;
};

export type GhPreflightResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'gh_missing' | 'gh_unauthenticated' | 'gh_preflight_failed';
      message: string;
    };

function readExecFileStderr(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === 'string' && stderr.trim().length > 0) {
      return stderr.trim();
    }
  }
  return undefined;
}

function isGhMissing(error: unknown): boolean {
  const execError = error as ExecFileError;
  return execError?.code === 'ENOENT' || execError?.message === 'ENOENT';
}

function isGhTransientFailure(error: unknown): boolean {
  const execError = error as ExecFileError;
  return (
    Boolean(execError?.killed) ||
    execError?.code === 'ETIMEDOUT' ||
    execError?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
  );
}

function formatGhPreflightFailure(
  stage: 'version' | 'auth',
  error: unknown,
): GhPreflightResult {
  const stderr = readExecFileStderr(error);
  const detail = stderr ? `: ${stderr}` : '';
  return {
    ok: false,
    reason: 'gh_preflight_failed',
    message: `GitHub CLI ${stage} check failed${detail}`,
  };
}

export async function checkGhAuth(): Promise<GhPreflightResult> {
  try {
    await execFileAsync('gh', ['--version'], {
      timeout: GH_TIMEOUT_MS,
      env: GH_ENV,
    });
  } catch (error) {
    if (isGhMissing(error)) {
      return {
        ok: false,
        reason: 'gh_missing',
        message: 'GitHub CLI not found',
      };
    }
    if (isGhTransientFailure(error)) {
      return formatGhPreflightFailure('version', error);
    }
    return formatGhPreflightFailure('version', error);
  }

  try {
    await execFileAsync('gh', ['auth', 'status'], {
      timeout: GH_TIMEOUT_MS,
      env: GH_ENV,
    });
    return { ok: true };
  } catch (error) {
    if (isGhTransientFailure(error)) {
      return formatGhPreflightFailure('auth', error);
    }
    const stderr = readExecFileStderr(error);
    return {
      ok: false,
      reason: 'gh_unauthenticated',
      message: stderr
        ? `GitHub CLI not authenticated: ${stderr}`
        : 'GitHub CLI not authenticated',
    };
  }
}

export type CreateGhRepoOptions = {
  cwd?: string;
  /** Default false — D-12: never auto-push unless explicitly true */
  push?: boolean;
};

async function resolveGhUserLogin(): Promise<string> {
  const execResult = await execFileAsync('gh', ['api', 'user', '-q', '.login'], {
    timeout: GH_TIMEOUT_MS,
    env: GH_ENV,
  });
  const stdout =
    typeof execResult === 'string'
      ? execResult
      : ((execResult as { stdout?: string }).stdout ?? '');
  const login = stdout.trim();
  if (!login) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'Could not resolve GitHub user login after repo create',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
  return login;
}

export async function createGhRepo(
  repoName: string,
  options: CreateGhRepoOptions = {},
): Promise<{ repo_url: string; repo_name: string }> {
  if (!REPO_NAME_REGEX.test(repoName)) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `Invalid repo_name '${repoName}' — use only letters, numbers, dot, underscore, hyphen`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }

  const projectRoot = options.cwd ?? resolveProjectRoot();
  const argv = [
    'repo',
    'create',
    repoName,
    '--private',
    '--source',
    '.',
    '--remote',
    'origin',
  ];
  if (options.push === true) {
    argv.push('--push');
  }

  const execResult = await execFileAsync('gh', argv, {
    timeout: GH_REPO_CREATE_TIMEOUT_MS,
    cwd: projectRoot,
    env: GH_ENV,
  });
  const stdout =
    typeof execResult === 'string'
      ? execResult
      : ((execResult as { stdout?: string }).stdout ?? '');

  const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s/]+\/[^\s/]+/);
  if (urlMatch?.[0]) {
    return {
      repo_name: repoName,
      repo_url: urlMatch[0],
    };
  }

  const owner = await resolveGhUserLogin();
  return {
    repo_name: repoName,
    repo_url: `https://github.com/${owner}/${repoName}`,
  };
}

export async function createGhRepoNoPush(
  repoName: string,
  cwd?: string,
): Promise<{ repo_url: string; repo_name: string }> {
  return createGhRepo(repoName, { cwd, push: false });
}
