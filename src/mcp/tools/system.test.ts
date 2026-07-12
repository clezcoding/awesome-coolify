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
  fetchResources: vi.fn(),
  fetchServers: vi.fn(),
  fetchProjects: vi.fn(),
}));

import {
  fetchHealth,
  fetchVersion,
  fetchResources,
  fetchServers,
  fetchProjects,
} from '../../api/client.js';

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

  it('accepts infrastructure_overview with shared read params', () => {
    expect(
      systemActionSchema.safeParse({ action: 'infrastructure_overview' }).success,
    ).toBe(true);
    expect(
      systemActionSchema.safeParse({
        action: 'infrastructure_overview',
        format: 'json',
        max_chars: 8000,
      }).success,
    ).toBe(true);
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

describe('handleSystemAction infrastructure_overview', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockResolvedValue([
      { uuid: 'app-1', type: 'application', status: 'running:healthy' },
      { uuid: 'app-2', type: 'application', status: 'exited:unhealthy' },
      { uuid: 'db-1', type: 'database', status: 'running:healthy' },
      { uuid: 'svc-1', type: 'service', status: 'stopped' },
    ]);
    vi.mocked(fetchServers).mockResolvedValue([
      { uuid: 'srv-1', settings: { is_reachable: true } },
      { uuid: 'srv-2', settings: { is_reachable: false } },
    ]);
    vi.mocked(fetchProjects).mockResolvedValue([
      { uuid: 'proj-1' },
      { uuid: 'proj-2' },
      { uuid: 'proj-3' },
    ]);
  });

  it('returns health rollup counts per category per D-08', async () => {
    const result = await handleSystemAction(
      { action: 'infrastructure_overview' },
      testEnv,
    );

    expect(isMcpErrorResult(result)).toBe(false);
    if (isMcpErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      servers: { total: 2, running: 1, stopped: 1 },
      projects: { total: 3 },
      applications: { total: 2, running: 1, stopped: 1, unhealthy: 1 },
      databases: { total: 1, running: 1, stopped: 0, unhealthy: 0 },
      services: { total: 1, running: 0, stopped: 1, unhealthy: 0 },
    });
    expect(result._meta.max_chars).toBe(16000);
    expect(result._formattedText).toBeTruthy();
    expect(formatSystemResult(result)).toBe(result._formattedText);
  });

  it('parallel-fetches resources servers projects', async () => {
    await handleSystemAction({ action: 'infrastructure_overview' }, testEnv);

    expect(fetchResources).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(fetchServers).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(fetchProjects).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });
});
