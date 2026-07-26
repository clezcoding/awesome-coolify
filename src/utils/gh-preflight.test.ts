import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

type ExecFileCallback = (
  error: Error | null,
  stdout: string,
  stderr: string,
) => void;

function execFileArgs(args: unknown[]): string[] | undefined {
  return Array.isArray(args[1]) ? (args[1] as string[]) : undefined;
}

function execFileOptions(args: unknown[]): Record<string, unknown> | undefined {
  const maybeOpts = args[2];
  return typeof maybeOpts === 'object' && maybeOpts !== null && !('call' in maybeOpts)
    ? (maybeOpts as Record<string, unknown>)
    : undefined;
}

function invokeExecFileCallback(args: unknown[], error: Error | null, stdout = ''): void {
  const callback = (typeof args[2] === 'function' ? args[2] : args[3]) as ExecFileCallback;
  callback(error, stdout, '');
}

describe('checkGhAuth', () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
  });

  it('returns gh_missing when gh --version fails', async () => {
    vi.mocked(execFile).mockImplementation((...args) => {
      const argv = execFileArgs(args);
      if (argv?.includes('--version')) {
        invokeExecFileCallback(args, new Error('ENOENT'));
        return undefined as never;
      }
      invokeExecFileCallback(args, null);
      return undefined as never;
    });

    const { checkGhAuth } = await import('./gh-preflight.js');
    const result = await checkGhAuth();

    expect(result).toEqual({
      ok: false,
      reason: 'gh_missing',
      message: expect.any(String),
    });
  });

  it('returns gh_unauthenticated when gh auth status fails', async () => {
    vi.mocked(execFile).mockImplementation((...args) => {
      const argv = execFileArgs(args);
      if (argv?.includes('--version')) {
        invokeExecFileCallback(args, null, 'gh version 2.0.0');
        return undefined as never;
      }
      if (argv?.includes('status')) {
        invokeExecFileCallback(args, new Error('not logged in'));
        return undefined as never;
      }
      invokeExecFileCallback(args, null);
      return undefined as never;
    });

    const { checkGhAuth } = await import('./gh-preflight.js');
    const result = await checkGhAuth();

    expect(result).toEqual({
      ok: false,
      reason: 'gh_unauthenticated',
      message: expect.any(String),
    });
  });

  it('returns ok when gh --version and auth status succeed', async () => {
    vi.mocked(execFile).mockImplementation((...args) => {
      invokeExecFileCallback(args, null, 'ok');
      return undefined as never;
    });

    const { checkGhAuth } = await import('./gh-preflight.js');
    const result = await checkGhAuth();

    expect(result).toEqual({ ok: true });
  });

  it('invokes gh with timeout 5000 and GH_FORCE_TTY 0', async () => {
    vi.mocked(execFile).mockImplementation((...args) => {
      invokeExecFileCallback(args, null, 'ok');
      return undefined as never;
    });

    const { checkGhAuth } = await import('./gh-preflight.js');
    await checkGhAuth();

    expect(execFile).toHaveBeenCalledWith(
      'gh',
      ['--version'],
      expect.objectContaining({
        timeout: 5000,
        env: expect.objectContaining({ GH_FORCE_TTY: '0' }),
      }),
      expect.any(Function),
    );
    expect(execFile).toHaveBeenCalledWith(
      'gh',
      ['auth', 'status'],
      expect.objectContaining({
        timeout: 5000,
        env: expect.objectContaining({ GH_FORCE_TTY: '0' }),
      }),
      expect.any(Function),
    );

    const allCalls = vi.mocked(execFile).mock.calls;
    for (const call of allCalls) {
      const opts = execFileOptions(call);
      expect(opts?.timeout).toBe(5000);
      expect((opts?.env as Record<string, string>)?.GH_FORCE_TTY).toBe('0');
    }
  });
});
