import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const GH_TIMEOUT_MS = 5_000;

const GH_ENV = { ...process.env, GH_FORCE_TTY: '0' };

export type GhPreflightResult =
  | { ok: true }
  | { ok: false; reason: 'gh_missing' | 'gh_unauthenticated'; message: string };

export async function checkGhAuth(): Promise<GhPreflightResult> {
  try {
    await execFileAsync('gh', ['--version'], {
      timeout: GH_TIMEOUT_MS,
      env: GH_ENV,
    });
  } catch {
    return {
      ok: false,
      reason: 'gh_missing',
      message: 'GitHub CLI not found',
    };
  }

  try {
    await execFileAsync('gh', ['auth', 'status'], {
      timeout: GH_TIMEOUT_MS,
      env: GH_ENV,
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: 'gh_unauthenticated',
      message: 'GitHub CLI not authenticated',
    };
  }
}
