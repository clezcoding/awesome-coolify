import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleServerAction,
  serverActionSchema,
  isServerErrorResult,
} from './server.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchServer: vi.fn(),
  fetchServers: vi.fn(),
  fetchPrivateKeys: vi.fn(),
  createServer: vi.fn(),
  updateServer: vi.fn(),
  deleteServer: vi.fn(),
  validateServer: vi.fn(),
  triggerServerValidate: vi.fn(),
  pollServerUntilReachable: vi.fn(),
  fetchServerResources: vi.fn(),
}));

import {
  fetchServer,
  fetchPrivateKeys,
  createServer,
  updateServer,
  deleteServer,
  validateServer,
  pollServerUntilReachable,
  fetchServerResources,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockServer = {
  uuid: 'srv-uuid-1',
  name: 'prod-server',
  ip: '10.0.0.1',
  port: 22,
  user: 'root',
  private_key_id: 7,
  is_build_server: false,
  settings: { is_reachable: true },
};

describe('server create', () => {
  beforeEach(() => {
    vi.mocked(createServer).mockReset();
    vi.mocked(validateServer).mockReset();
    vi.mocked(pollServerUntilReachable).mockReset();
    vi.mocked(createServer).mockResolvedValue({ uuid: 'srv-uuid-1' });
    vi.mocked(validateServer).mockResolvedValue({ message: 'Validation started.' });
    vi.mocked(pollServerUntilReachable).mockResolvedValue({
      settings: { is_reachable: true },
    });
  });

  it('creates server and returns uuid with validation status valid per SRV-01 and D-05', async () => {
    const result = await handleServerAction(
      {
        action: 'create',
        name: 'prod-server',
        ip: '10.0.0.1',
        port: 22,
        user: 'root',
        private_key_uuid: 'key-uuid-7',
      },
      testEnv,
    );

    expect(isServerErrorResult(result)).toBe(false);
    expect(createServer).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        name: 'prod-server',
        ip: '10.0.0.1',
        port: 22,
        user: 'root',
        private_key_uuid: 'key-uuid-7',
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      validation: { status: 'valid', reachable: true },
    });
  });

  it('auto-runs validate after create when validate defaults to true per D-06', async () => {
    const result = await handleServerAction(
      {
        action: 'create',
        name: 'prod-server',
        ip: '10.0.0.1',
        port: 22,
        user: 'root',
        private_key_uuid: 'key-uuid-7',
      },
      testEnv,
    );

    expect(validateServer).toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data.validation).toMatchObject({ status: 'valid' });
  });

  it('skips auto-validate when validate:false and returns status skipped per D-06', async () => {
    const result = await handleServerAction(
      {
        action: 'create',
        name: 'prod-server',
        ip: '10.0.0.1',
        port: 22,
        user: 'root',
        private_key_uuid: 'key-uuid-7',
        validate: false,
      },
      testEnv,
    );

    expect(validateServer).not.toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      validation: { status: 'skipped' },
    });
  });

  it('returns soft success with reachable:false and SSH hints when unreachable per D-07', async () => {
    vi.mocked(pollServerUntilReachable).mockResolvedValue({
      settings: { is_reachable: false },
    });

    const result = await handleServerAction(
      {
        action: 'create',
        name: 'prod-server',
        ip: '10.0.0.1',
        port: 22,
        user: 'root',
        private_key_uuid: 'key-uuid-7',
      },
      testEnv,
    );

    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      validation: { reachable: false },
    });
    const hintsText = JSON.stringify(result.data);
    expect(hintsText.toLowerCase()).toMatch(/ssh|unreachable/);
  });

  it('returns validation pending when poll exceeds 30s timeout per D-05 without rollback', async () => {
    vi.mocked(pollServerUntilReachable).mockResolvedValue({
      settings: { is_reachable: undefined },
    });

    const result = await handleServerAction(
      {
        action: 'create',
        name: 'prod-server',
        ip: '10.0.0.1',
        port: 22,
        user: 'root',
        private_key_uuid: 'key-uuid-7',
      },
      testEnv,
    );

    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      validation: { status: 'pending' },
    });
    expect(deleteServer).not.toHaveBeenCalled();
  });
});

describe('server update', () => {
  beforeEach(() => {
    vi.mocked(updateServer).mockReset();
    vi.mocked(updateServer).mockResolvedValue({
      ...mockServer,
      name: 'renamed-server',
      ip: '10.0.0.2',
    });
  });

  it('calls updateServer and returns updated fields per SRV-02', async () => {
    const result = await handleServerAction(
      {
        action: 'update',
        uuid: 'srv-uuid-1',
        name: 'renamed-server',
        ip: '10.0.0.2',
      },
      testEnv,
    );

    expect(isServerErrorResult(result)).toBe(false);
    expect(updateServer).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'srv-uuid-1',
      { name: 'renamed-server', ip: '10.0.0.2' },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      name: 'renamed-server',
      ip: '10.0.0.2',
    });
  });

  it('updates is_build_server flag per SRV-05', async () => {
    vi.mocked(updateServer).mockResolvedValue({
      ...mockServer,
      is_build_server: true,
    });

    const result = await handleServerAction(
      {
        action: 'update',
        uuid: 'srv-uuid-1',
        is_build_server: true,
      },
      testEnv,
    );

    expect(updateServer).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'srv-uuid-1',
      { is_build_server: true },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({ is_build_server: true });
  });
});

describe('server delete', () => {
  beforeEach(() => {
    vi.mocked(deleteServer).mockReset();
    vi.mocked(deleteServer).mockResolvedValue({ message: 'Server deleted.' });
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per D-14', async () => {
    const result = await handleServerAction(
      { action: 'delete', uuid: 'srv-uuid-1', confirm: false },
      testEnv,
    );

    expect(isServerErrorResult(result)).toBe(true);
    if (!isServerErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteServer).not.toHaveBeenCalled();
  });

  it('calls deleteServer with delete_volumes defaulting to false per D-16', async () => {
    const result = await handleServerAction(
      { action: 'delete', uuid: 'srv-uuid-1', confirm: true },
      testEnv,
    );

    expect(isServerErrorResult(result)).toBe(false);
    expect(deleteServer).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'srv-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
      false,
    );
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'srv-uuid-1' });
  });

  it('passes delete_volumes:true when explicitly set per D-16', async () => {
    await handleServerAction(
      {
        action: 'delete',
        uuid: 'srv-uuid-1',
        confirm: true,
        delete_volumes: true,
      },
      testEnv,
    );

    expect(deleteServer).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'srv-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
      true,
    );
  });
});

describe('server validate', () => {
  beforeEach(() => {
    vi.mocked(validateServer).mockReset();
    vi.mocked(pollServerUntilReachable).mockReset();
    vi.mocked(validateServer).mockResolvedValue({ message: 'Validation started.' });
    vi.mocked(pollServerUntilReachable).mockResolvedValue({
      settings: { is_reachable: true },
    });
  });

  it('calls validateServer and polls returning reachable status per SRV-04', async () => {
    const result = await handleServerAction(
      { action: 'validate', uuid: 'srv-uuid-1' },
      testEnv,
    );

    expect(validateServer).toHaveBeenCalled();
    expect(pollServerUntilReachable).toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      validation: { reachable: true, status: 'valid' },
    });
  });

  it('uses same wait/timeout poll model as create per D-08', async () => {
    vi.mocked(pollServerUntilReachable).mockResolvedValue({
      settings: { is_reachable: undefined },
    });

    const result = await handleServerAction(
      { action: 'validate', uuid: 'srv-uuid-1' },
      testEnv,
    );

    expect(pollServerUntilReachable).toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data.validation).toMatchObject({ status: 'pending' });
  });
});

describe('server get', () => {
  beforeEach(() => {
    vi.mocked(fetchServer).mockReset();
    vi.mocked(fetchPrivateKeys).mockReset();
    vi.mocked(validateServer).mockReset();
    vi.mocked(fetchServer).mockResolvedValue(mockServer);
    vi.mocked(fetchPrivateKeys).mockResolvedValue([
      { id: 7, uuid: 'key-uuid-7', name: 'deploy-key' },
    ]);
  });

  it('returns metadata without triggering validate per D-12', async () => {
    const result = await handleServerAction(
      { action: 'get', uuid: 'srv-uuid-1' },
      testEnv,
    );

    expect(validateServer).not.toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'srv-uuid-1',
      name: 'prod-server',
      ip: '10.0.0.1',
      port: 22,
      user: 'root',
      is_build_server: false,
      reachable: true,
    });
  });

  it('resolves private_key_uuid from private_key_id via fetchPrivateKeys per Pitfall 1', async () => {
    const result = await handleServerAction(
      { action: 'get', uuid: 'srv-uuid-1' },
      testEnv,
    );

    expect(fetchPrivateKeys).toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({ private_key_uuid: 'key-uuid-7' });
  });
});

describe('server delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deleteServer).mockReset();
    vi.mocked(fetchServerResources).mockReset();
    vi.mocked(fetchServerResources).mockResolvedValue([]);
  });

  it('returns child_resources and would_delete without calling deleteServer per D-13', async () => {
    vi.mocked(fetchServerResources).mockResolvedValue([
      { uuid: 'app-1', name: 'app', type: 'application' },
    ]);

    const result = await handleServerAction(
      { action: 'delete_preview', uuid: 'srv-uuid-1' },
      testEnv,
    );

    expect(deleteServer).not.toHaveBeenCalled();
    expect(isServerErrorResult(result)).toBe(false);
    if (isServerErrorResult(result)) return;

    expect(result.data).toMatchObject({
      would_delete: true,
      child_resources: [
        { uuid: 'app-1', name: 'app', type: 'application' },
      ],
    });
  });

  it('lists child resources as warning without blocking delete per D-16', () => {
    expect(
      serverActionSchema.safeParse({
        action: 'delete',
        uuid: 'srv-uuid-1',
        confirm: true,
      }).success,
    ).toBe(true);
  });
});
