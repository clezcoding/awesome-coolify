import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../config/env.js';

const { checkGhAuthMock } = vi.hoisted(() => ({
  checkGhAuthMock: vi.fn(),
}));

vi.mock('../../utils/gh-preflight.js', () => ({
  checkGhAuth: checkGhAuthMock,
}));

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

describe('handleSetupAction preflight', () => {
  beforeEach(() => {
    checkGhAuthMock.mockReset();
  });

  it.fails('returns COOLIFY_SETUP_PAUSED when gh preflight fails', async () => {
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

  it.fails('returns ok with setup progress when preflight passes', async () => {
    checkGhAuthMock.mockResolvedValue({ ok: true });

    const { handleSetupAction, isSetupErrorResult } = await import('./setup.js');
    const result = await handleSetupAction({ action: 'preflight' }, testEnv);

    expect(isSetupErrorResult(result)).toBe(false);
    if (isSetupErrorResult(result)) return;

    expect(result.data).toMatchObject({
      setup_status: expect.any(String),
    });
  });

  it.fails('resume re-runs preflight without in-tool sleep between calls', async () => {
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
