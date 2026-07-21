import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handlePrivateKeyAction,
  privateKeyActionSchema,
  isPrivateKeyErrorResult,
} from './private_key.js';
import type { EnvConfig } from '../../config/env.js';
import { InstanceManager } from '../../utils/instance-registry.js';

vi.mock('../../api/client.js', () => ({
  fetchPrivateKeys: vi.fn(),
  fetchPrivateKey: vi.fn(),
  createPrivateKey: vi.fn(),
  updatePrivateKey: vi.fn(),
  deletePrivateKey: vi.fn(),
  fetchServers: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  };
});

import {
  fetchPrivateKeys,
  fetchPrivateKey,
  createPrivateKey,
  updatePrivateKey,
  deletePrivateKey,
  fetchServers,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const FAKE_PEM =
  '-----BEGIN FAKE KEY-----\nFAKE\n-----END FAKE KEY-----';

const mockKey = {
  id: 7,
  uuid: 'key-uuid-7',
  name: 'deploy-key',
  fingerprint: 'SHA256:abc123',
  description: 'CI deploy key',
  private_key: FAKE_PEM,
};

describe('private_key list', () => {
  beforeEach(() => {
    vi.mocked(fetchPrivateKeys).mockReset();
    vi.mocked(fetchPrivateKeys).mockResolvedValue([mockKey]);
  });

  it('returns summary projection with uuid, name, fingerprint, description per D-04', async () => {
    const result = await handlePrivateKeyAction({ action: 'list' }, testEnv);

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    if (isPrivateKeyErrorResult(result)) return;

    const data = result.data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      uuid: 'key-uuid-7',
      name: 'deploy-key',
      fingerprint: 'SHA256:abc123',
      description: 'CI deploy key',
    });
    expect(data[0]).not.toHaveProperty('private_key');
  });

  it('rejects reveal:true on list with COOLIFY_422 per D-11', async () => {
    const result = await handlePrivateKeyAction(
      { action: 'list', reveal: true },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(true);
    if (!isPrivateKeyErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(fetchPrivateKeys).not.toHaveBeenCalled();
  });

  it('allows reveal:false on list and calls fetchPrivateKeys', async () => {
    const result = await handlePrivateKeyAction(
      { action: 'list', reveal: false },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    expect(fetchPrivateKeys).toHaveBeenCalledTimes(1);
  });

  it('defaults reveal to false when omitted on list', async () => {
    const result = await handlePrivateKeyAction({ action: 'list' }, testEnv);

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    expect(fetchPrivateKeys).toHaveBeenCalledTimes(1);
  });

  it('accepts reveal:true on list schema (dual-layer rejection per D-11)', () => {
    expect(
      privateKeyActionSchema.safeParse({ action: 'list', reveal: true }).success,
    ).toBe(true);
  });
});

describe('private_key get', () => {
  beforeEach(() => {
    vi.mocked(fetchPrivateKey).mockReset();
    vi.mocked(fetchPrivateKey).mockResolvedValue(mockKey);
  });

  it('returns metadata without PEM even with reveal:true per D-02 and D-04', async () => {
    const result = await handlePrivateKeyAction(
      { action: 'get', uuid: 'key-uuid-7', reveal: true, projection: 'full' },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    if (isPrivateKeyErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data).toMatchObject({
      uuid: 'key-uuid-7',
      name: 'deploy-key',
      fingerprint: 'SHA256:abc123',
      description: 'CI deploy key',
    });
    expect(data.private_key).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('BEGIN FAKE KEY');
  });
});

describe('private_key create', () => {
  beforeEach(() => {
    vi.mocked(createPrivateKey).mockReset();
    vi.mocked(createPrivateKey).mockResolvedValue({
      uuid: 'key-uuid-new',
      name: 'new-key',
      fingerprint: 'SHA256:newfp',
    });
  });

  it('accepts inline private_key PEM and calls createPrivateKey per D-01 and D-03', async () => {
    const result = await handlePrivateKeyAction(
      {
        action: 'create',
        name: 'new-key',
        private_key: FAKE_PEM,
        description: 'inline key',
      },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    expect(createPrivateKey).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        name: 'new-key',
        private_key: FAKE_PEM,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isPrivateKeyErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'key-uuid-new',
      name: 'new-key',
      fingerprint: 'SHA256:newfp',
    });
  });

  it('accepts key_file path, reads file, and calls createPrivateKey per D-01', async () => {
    vi.mocked(readFileSync).mockReturnValue(FAKE_PEM);

    const result = await handlePrivateKeyAction(
      {
        action: 'create',
        name: 'file-key',
        key_file: '/home/user/.ssh/id_ed25519',
      },
      testEnv,
    );

    expect(readFileSync).toHaveBeenCalledWith('/home/user/.ssh/id_ed25519', 'utf8');
    expect(createPrivateKey).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ private_key: FAKE_PEM }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(isPrivateKeyErrorResult(result)).toBe(false);
  });

  it('rejects both private_key and key_file with COOLIFY_422 per D-01 XOR', async () => {
    const result = await handlePrivateKeyAction(
      {
        action: 'create',
        name: 'bad-key',
        private_key: FAKE_PEM,
        key_file: '/tmp/key.pem',
      },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(true);
    if (!isPrivateKeyErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(createPrivateKey).not.toHaveBeenCalled();
  });

  it('rejects neither private_key nor key_file with COOLIFY_422 per D-01 XOR', async () => {
    const result = await handlePrivateKeyAction(
      { action: 'create', name: 'empty-key' },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(true);
    if (!isPrivateKeyErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(createPrivateKey).not.toHaveBeenCalled();
  });

  it('never returns PEM material in create response per D-02', async () => {
    vi.mocked(createPrivateKey).mockResolvedValue({
      uuid: 'key-uuid-new',
      name: 'new-key',
      fingerprint: 'SHA256:newfp',
      private_key: FAKE_PEM,
    });

    const result = await handlePrivateKeyAction(
      {
        action: 'create',
        name: 'new-key',
        private_key: FAKE_PEM,
      },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    if (isPrivateKeyErrorResult(result)) return;

    expect(JSON.stringify(result.data)).not.toContain('BEGIN FAKE KEY');
    expect(result.data).not.toHaveProperty('private_key');
  });
});

describe('private_key update', () => {
  beforeEach(() => {
    vi.mocked(updatePrivateKey).mockReset();
    vi.mocked(updatePrivateKey).mockResolvedValue({
      uuid: 'key-uuid-7',
      name: 'renamed-key',
      description: 'updated desc',
      fingerprint: 'SHA256:abc123',
    });
  });

  it('calls updatePrivateKey with metadata-only fields per KEY-04', async () => {
    const result = await handlePrivateKeyAction(
      {
        action: 'update',
        uuid: 'key-uuid-7',
        name: 'renamed-key',
        description: 'updated desc',
      },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    expect(updatePrivateKey).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'key-uuid-7',
      { name: 'renamed-key', description: 'updated desc' },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isPrivateKeyErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'key-uuid-7',
      name: 'renamed-key',
      description: 'updated desc',
    });
  });
});

describe('private_key delete', () => {
  beforeEach(() => {
    vi.mocked(deletePrivateKey).mockReset();
    vi.mocked(fetchServers).mockReset();
    vi.mocked(fetchPrivateKey).mockReset();
    vi.mocked(fetchPrivateKey).mockResolvedValue(mockKey);
    vi.mocked(fetchServers).mockResolvedValue([]);
    vi.mocked(deletePrivateKey).mockResolvedValue({ message: 'Deleted.' });
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per D-14', async () => {
    const result = await handlePrivateKeyAction(
      { action: 'delete', uuid: 'key-uuid-7', confirm: false },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(true);
    if (!isPrivateKeyErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deletePrivateKey).not.toHaveBeenCalled();
  });

  it('calls deletePrivateKey and returns ok when confirm:true and no dependents', async () => {
    const result = await handlePrivateKeyAction(
      { action: 'delete', uuid: 'key-uuid-7', confirm: true },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    expect(deletePrivateKey).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'key-uuid-7',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isPrivateKeyErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'key-uuid-7' });
  });

  it('returns COOLIFY_409 with dependent server UUIDs when key is referenced per D-15', async () => {
    vi.mocked(fetchServers).mockResolvedValue([
      {
        uuid: 'srv-uuid-1',
        name: 'prod-server',
        private_key_id: 7,
      },
    ]);

    const result = await handlePrivateKeyAction(
      { action: 'delete', uuid: 'key-uuid-7', confirm: true },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(true);
    if (!isPrivateKeyErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.dependent_server_uuids).toEqual([
      'srv-uuid-1',
    ]);
    expect(deletePrivateKey).not.toHaveBeenCalled();
  });

  it('rejects force param on delete schema per D-15 Phase 8 scope', () => {
    expect(
      privateKeyActionSchema.safeParse({
        action: 'delete',
        uuid: 'key-uuid-7',
        confirm: true,
        force: true,
      }).success,
    ).toBe(false);
  });
});

describe('private_key delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deletePrivateKey).mockReset();
    vi.mocked(fetchServers).mockReset();
    vi.mocked(fetchPrivateKey).mockReset();
    vi.mocked(fetchPrivateKey).mockResolvedValue(mockKey);
  });

  it('returns dependents and would_delete without calling deletePrivateKey per D-13', async () => {
    vi.mocked(fetchServers).mockResolvedValue([
      {
        uuid: 'srv-uuid-1',
        name: 'prod-server',
        private_key_id: 7,
      },
    ]);

    const result = await handlePrivateKeyAction(
      { action: 'delete_preview', uuid: 'key-uuid-7' },
      testEnv,
    );

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    expect(deletePrivateKey).not.toHaveBeenCalled();
    if (isPrivateKeyErrorResult(result)) return;

    // D-13: would_delete is false when dependent servers block deletion
    expect(result.data).toMatchObject({
      would_delete: false,
      dependents: expect.arrayContaining([
        expect.objectContaining({ uuid: 'srv-uuid-1' }),
      ]),
    });
  });

  it('delete_preview with instance routes dependent lookup via routingEnv (CR-01)', async () => {
    const registryDir = mkdtempSync(join(tmpdir(), 'coolify-mcp-pk-route-'));
    process.env.COOLIFY_MCP_TEST_REGISTRY_DIR = registryDir;
    // Prior tests stub readFileSync for PEM paths; restore real fs for registry I/O.
    const fsActual = await vi.importActual<typeof import('node:fs')>('node:fs');
    vi.mocked(readFileSync).mockImplementation(
      fsActual.readFileSync as typeof readFileSync,
    );
    try {
      await InstanceManager.add({
        name: 'prod',
        url: 'https://prod.coolify.example.com',
        token: 'prod-token',
        type: 'self-hosted',
        verifySsl: true,
      });

      vi.mocked(fetchPrivateKey).mockResolvedValue(mockKey);
      vi.mocked(fetchServers).mockResolvedValue([
        {
          uuid: 'srv-uuid-prod',
          name: 'prod-server',
          private_key_id: 7,
        },
      ]);

      const emptyEnv: EnvConfig = {
        COOLIFY_URL: undefined as unknown as string,
        COOLIFY_TOKEN: undefined as unknown as string,
        COOLIFY_VERIFY_SSL: true,
        COOLIFY_MCP_LOG: 'info',
      };

      const result = await handlePrivateKeyAction(
        { action: 'delete_preview', uuid: 'key-uuid-7', instance: 'prod' },
        emptyEnv,
      );

      expect(isPrivateKeyErrorResult(result)).toBe(false);
      expect(fetchPrivateKey).toHaveBeenCalledWith(
        'https://prod.coolify.example.com',
        'prod-token',
        'key-uuid-7',
        true,
      );
      expect(fetchServers).toHaveBeenCalledWith(
        'https://prod.coolify.example.com',
        'prod-token',
        true,
      );
      if (isPrivateKeyErrorResult(result)) return;
      expect(result.data).toMatchObject({
        would_delete: false,
        dependents: expect.arrayContaining([
          expect.objectContaining({ uuid: 'srv-uuid-prod' }),
        ]),
      });
    } finally {
      delete process.env.COOLIFY_MCP_TEST_REGISTRY_DIR;
      rmSync(registryDir, { recursive: true, force: true });
    }
  });
});
