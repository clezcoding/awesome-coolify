import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  formatSystemResult,
  handleSystemAction,
  isMcpErrorResult,
  systemActionSchema,
} from './system.js';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

vi.mock('../../api/client.js', () => ({
  fetchHealth: vi.fn().mockResolvedValue(undefined),
  fetchVersion: vi.fn().mockResolvedValue({ version: '4.1.0' }),
}));

import { fetchHealth, fetchVersion } from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

describe('systemActionSchema', () => {
  it('rejects invalid action foo', () => {
    expect(systemActionSchema.safeParse({ action: 'foo' }).success).toBe(false);
  });

  it('accepts health version verify', () => {
    expect(systemActionSchema.safeParse({ action: 'health' }).success).toBe(
      true,
    );
    expect(systemActionSchema.safeParse({ action: 'version' }).success).toBe(
      true,
    );
    expect(systemActionSchema.safeParse({ action: 'verify' }).success).toBe(
      true,
    );
  });
});

describe('handleSystemAction health', () => {
  beforeEach(() => {
    vi.mocked(fetchHealth).mockClear();
    vi.mocked(fetchVersion).mockClear();
  });

  it('returns connected true and host from URL hostname', async () => {
    const result = await handleSystemAction({ action: 'health' }, testEnv);

    expect(isMcpErrorResult(result)).toBe(false);
    if (!isMcpErrorResult(result)) {
      expect(result).toEqual({
        connected: true,
        host: 'coolify.example.com',
      });
    }
    expect(fetchHealth).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('response JSON does not contain the test token value', async () => {
    const result = await handleSystemAction({ action: 'health' }, testEnv);
    if (isMcpErrorResult(result)) {
      throw new Error('expected success');
    }
    const json = formatSystemResult(result);

    expect(json).not.toContain('test-token-value-xyz');
    expect(json).not.toContain(testEnv.COOLIFY_TOKEN);
  });

  it('returns isError true with COOLIFY_401 on API failure', async () => {
    vi.mocked(fetchHealth).mockRejectedValueOnce(
      new CoolifyApiError({
        code: 'COOLIFY_401',
        message: 'Coolify API returned HTTP 401',
        recoveryHints: ['Verify token'],
        httpStatus: 401,
      }),
    );

    const result = await handleSystemAction({ action: 'health' }, testEnv);

    expect(isMcpErrorResult(result)).toBe(true);
    if (isMcpErrorResult(result)) {
      expect(result.content[0].text).toContain('COOLIFY_401');
    }
  });
});

describe('handleSystemAction version', () => {
  it('returns version string from API', async () => {
    const result = await handleSystemAction({ action: 'version' }, testEnv);
    expect(isMcpErrorResult(result)).toBe(false);
    if (!isMcpErrorResult(result)) {
      expect(result).toEqual({ version: '4.1.0' });
    }
  });
});

describe('handleSystemAction verify', () => {
  it('returns connected host and coolifyVersion without token', async () => {
    const result = await handleSystemAction({ action: 'verify' }, testEnv);
    expect(isMcpErrorResult(result)).toBe(false);
    if (!isMcpErrorResult(result)) {
      expect(result).toEqual({
        connected: true,
        host: 'coolify.example.com',
        coolifyVersion: '4.1.0',
      });
      expect(JSON.stringify(result)).not.toContain(testEnv.COOLIFY_TOKEN);
    }
  });
});
