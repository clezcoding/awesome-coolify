import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  formatSystemResult,
  handleSystemAction,
} from './system.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchHealth: vi.fn().mockResolvedValue(undefined),
}));

import { fetchHealth } from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

describe('handleSystemAction health', () => {
  beforeEach(() => {
    vi.mocked(fetchHealth).mockClear();
  });

  it('returns connected true and host from URL hostname', async () => {
    const result = await handleSystemAction({ action: 'health' }, testEnv);

    expect(result).toEqual({
      connected: true,
      host: 'coolify.example.com',
    });
    expect(fetchHealth).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('response JSON does not contain the test token value', async () => {
    const result = await handleSystemAction({ action: 'health' }, testEnv);
    const json = formatSystemResult(result);

    expect(json).not.toContain('test-token-value-xyz');
    expect(json).not.toContain(testEnv.COOLIFY_TOKEN);
  });
});
