import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CoolifyApiError } from './errors.js';

// TODO: Plan 15-01 wires test-only registry path via COOLIFY_MCP_TEST_REGISTRY_DIR or constructor option
let registryDir: string;

beforeEach(() => {
  registryDir = mkdtempSync(join(tmpdir(), 'coolify-mcp-registry-'));
  process.env.COOLIFY_MCP_TEST_REGISTRY_DIR = registryDir;
});

afterEach(() => {
  delete process.env.COOLIFY_MCP_TEST_REGISTRY_DIR;
  rmSync(registryDir, { recursive: true, force: true });
});

async function loadInstanceRegistry() {
  return import('./instance-registry.js');
}

const sampleInstance = {
  name: 'prod',
  url: 'https://prod.coolify.example.com',
  token: 'prod-token-secret',
  type: 'self-hosted' as const,
  verifySsl: true,
};

const stagingInstance = {
  name: 'staging',
  url: 'https://staging.coolify.example.com',
  token: 'staging-token-secret',
  type: 'self-hosted' as const,
  verifySsl: true,
};

describe('InstanceManager', () => {
  it('loadRegistry returns { instances: [] } when instances.json absent (CTX-04 empty)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    const registry = InstanceManager.loadRegistry();
    expect(registry).toEqual({ instances: [] });
  });

  it('add persists instance; first add into empty registry auto-sets default (D-15)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    const registry = InstanceManager.loadRegistry();
    expect(registry.instances).toHaveLength(1);
    expect(registry.instances[0]).toMatchObject(sampleInstance);
    expect(registry.default).toBe('prod');
  });

  it('add with duplicate name fails with structured error — no merge/overwrite (CTX-04)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    await expect(
      InstanceManager.add({ ...sampleInstance, url: 'https://other.example.com' }),
    ).rejects.toThrow(CoolifyApiError);
  });

  it('list returns registry entries in insertion order (CTX-04 ordering stable)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    await InstanceManager.add(stagingInstance);
    const entries = InstanceManager.list();
    expect(entries.map((e) => e.name)).toEqual(['prod', 'staging']);
  });

  it('set-default on already-default name is idempotent no-op (CTX-04 idempotency)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    await InstanceManager.setDefault('prod');
    const registry = InstanceManager.loadRegistry();
    expect(registry.default).toBe('prod');
  });

  it('set-default on unknown name throws COOLIFY_INSTANCE_NOT_FOUND (D-16)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await expect(InstanceManager.setDefault('missing')).rejects.toMatchObject({
      envelope: { code: 'COOLIFY_INSTANCE_NOT_FOUND' },
    });
  });

  it('delete with confirm:true removes entry (D-04)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    await InstanceManager.add(stagingInstance);
    await InstanceManager.delete('staging', { confirm: true });
    const registry = InstanceManager.loadRegistry();
    expect(registry.instances.map((i) => i.name)).toEqual(['prod']);
  });

  it('delete on default or last instance without force throws structured error (D-04)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    await expect(
      InstanceManager.delete('prod', { confirm: true }),
    ).rejects.toThrow(CoolifyApiError);
  });

  it('saveRegistry creates dir with 0o700 and file with 0o600 via chmodSync override (CTX-08)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    const dirStat = statSync(registryDir);
    const filePath = join(registryDir, 'instances.json');
    expect(existsSync(filePath)).toBe(true);
    const fileStat = statSync(filePath);
    expect(dirStat.mode & 0o777).toBe(0o700);
    expect(fileStat.mode & 0o777).toBe(0o600);
  });

  it('saveRegistry uses temp file + rename; concurrent saves serialized by in-memory lock (CTX-09)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await Promise.all([
      InstanceManager.add(sampleInstance),
      InstanceManager.add(stagingInstance),
    ]);
    const registry = InstanceManager.loadRegistry();
    expect(registry.instances).toHaveLength(2);
    const filePath = join(registryDir, 'instances.json');
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(`${filePath}.tmp`)).toBe(false);
  });

  it('list redacts token as *** unless reveal:true (CTX-08)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    const masked = InstanceManager.list();
    expect(masked[0].token).toBe('***');
    const revealed = InstanceManager.list({ reveal: true });
    expect(revealed[0].token).toBe('prod-token-secret');
  });
});

describe('resolveCredentials', () => {
  it('explicit instance param wins over env (D-10/D-11)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    const creds = InstanceManager.resolveCredentials('prod', {
      COOLIFY_URL: 'https://env.example.com',
      COOLIFY_TOKEN: 'env-token',
    });
    expect(creds.url).toBe('https://prod.coolify.example.com');
    expect(creds.token).toBe('prod-token-secret');
  });

  it('env both-set overrides registry default (CTX-05 adjacency)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    await InstanceManager.add(sampleInstance);
    const creds = InstanceManager.resolveCredentials(undefined, {
      COOLIFY_URL: 'https://env.example.com',
      COOLIFY_TOKEN: 'env-token',
    });
    expect(creds.url).toBe('https://env.example.com');
    expect(creds.token).toBe('env-token');
  });

  it('partial env (only URL or only TOKEN) throws COOLIFY_PARTIAL_ENV (D-13)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    try {
      InstanceManager.resolveCredentials(undefined, { COOLIFY_URL: 'https://only-url.example.com' });
      expect.fail('expected COOLIFY_PARTIAL_ENV');
    } catch (error) {
      expect(error).toMatchObject({ envelope: { code: 'COOLIFY_PARTIAL_ENV' } });
    }
    try {
      InstanceManager.resolveCredentials(undefined, { COOLIFY_TOKEN: 'only-token' });
      expect.fail('expected COOLIFY_PARTIAL_ENV');
    } catch (error) {
      expect(error).toMatchObject({ envelope: { code: 'COOLIFY_PARTIAL_ENV' } });
    }
  });

  it('no param, no env, no default throws COOLIFY_NO_INSTANCE (CTX-05 / D-18/D-20)', async () => {
    const { InstanceManager } = await loadInstanceRegistry();
    try {
      InstanceManager.resolveCredentials(undefined, {});
      expect.fail('expected COOLIFY_NO_INSTANCE');
    } catch (error) {
      expect(error).toMatchObject({ envelope: { code: 'COOLIFY_NO_INSTANCE' } });
    }
  });
});
