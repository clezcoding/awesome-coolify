import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleServiceAction,
  isServiceErrorResult,
  serviceActionSchema,
} from './service.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchService: vi.fn(),
}));

import { fetchService } from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockService = {
  uuid: 'svc-uuid-1',
  name: 'redis',
  status: 'running:healthy',
  fqdn: 'https://redis.example.com',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  server: { name: 'srv-1', uuid: 'srv-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  env: { REDIS_PASSWORD: 'secret-redis' },
};

describe('serviceActionSchema', () => {
  it('accepts get action with uuid only per D-02', () => {
    expect(
      serviceActionSchema.safeParse({
        action: 'get',
        uuid: 'svc-uuid-1',
      }).success,
    ).toBe(true);
  });

  it('rejects list action', () => {
    expect(
      serviceActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(false);
  });
});

describe('handleServiceAction get', () => {
  beforeEach(() => {
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchService).mockResolvedValue(mockService);
  });

  it('returns summary projection by default', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      name: 'redis',
      status: 'running:healthy',
      fqdn: 'https://redis.example.com',
      project_name: 'proj-a',
      server_name: 'srv-1',
    });
    expect(result._formattedText).toBeTruthy();
  });

  it('returns sanitized full projection with include_full alias', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        include_full: true,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    const env = data.env as Record<string, unknown>;
    expect(env.REDIS_PASSWORD).toBe('***');
  });

  it('rejects format table on full projection per D-11', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        projection: 'full',
        format: 'table',
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(fetchService).not.toHaveBeenCalled();
  });

  it('includes restart hint for unhealthy service per OUT-06 D-16', async () => {
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      status: 'unhealthy',
    });

    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.hints)).toBe(true);
    const hints = data.hints as Array<Record<string, unknown>>;
    expect(hints.some((h) => h.action === 'restart' && h.available_in_phase === 5)).toBe(
      true,
    );
    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      name: 'redis',
    });
  });

  it('returns empty hints for healthy running service', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.hints).toEqual([]);
  });
});
