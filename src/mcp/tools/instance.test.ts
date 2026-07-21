import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

// TODO: Plan 15-01 wires test-only registry path via COOLIFY_MCP_TEST_REGISTRY_DIR or constructor option
let registryDir: string;

beforeEach(() => {
  registryDir = mkdtempSync(join(tmpdir(), 'coolify-mcp-instance-tool-'));
  process.env.COOLIFY_MCP_TEST_REGISTRY_DIR = registryDir;
});

afterEach(() => {
  delete process.env.COOLIFY_MCP_TEST_REGISTRY_DIR;
  rmSync(registryDir, { recursive: true, force: true });
});

async function loadInstanceTool() {
  return import('./instance.js');
}

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const sampleAddPayload = {
  action: 'add' as const,
  name: 'prod',
  url: 'https://prod.coolify.example.com',
  token: 'prod-token-secret',
  type: 'self-hosted' as const,
  verifySsl: true,
};

describe('instance tool', () => {
  it.fails('handleInstanceAction list returns registry entries with tokens redacted as ***', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction({ action: 'list' }, testEnv);
    expect(result).toMatchObject({
      data: [{ name: 'prod', token: '***' }],
    });
  });

  it.fails('handleInstanceAction list with reveal:true returns tokens in plaintext', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction({ action: 'list', reveal: true }, testEnv);
    expect(result).toMatchObject({
      data: [{ name: 'prod', token: 'prod-token-secret' }],
    });
  });

  it.fails('handleInstanceAction list includes _meta.envOverride:true when COOLIFY_URL+COOLIFY_TOKEN both set (D-17)', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    const result = await handleInstanceAction({ action: 'list' }, testEnv);
    expect(result).toMatchObject({ _meta: { envOverride: true } });
  });

  it.fails('handleInstanceAction add persists and returns the new entry', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    const result = await handleInstanceAction(sampleAddPayload, testEnv);
    expect(result).toMatchObject({
      data: {
        name: 'prod',
        url: 'https://prod.coolify.example.com',
        token: '***',
      },
    });
  });

  it.fails('handleInstanceAction add with invalid name throws COOLIFY_VALIDATION_ERROR (D-08)', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await expect(
      handleInstanceAction(
        { ...sampleAddPayload, name: 'INVALID' },
        testEnv,
      ),
    ).rejects.toMatchObject({ envelope: { code: 'COOLIFY_VALIDATION_ERROR' } });
  });

  it.fails('handleInstanceAction get returns single entry; redacts token unless reveal:true', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const masked = await handleInstanceAction({ action: 'get', name: 'prod' }, testEnv);
    expect(masked).toMatchObject({ data: { name: 'prod', token: '***' } });
    const revealed = await handleInstanceAction(
      { action: 'get', name: 'prod', reveal: true },
      testEnv,
    );
    expect(revealed).toMatchObject({ data: { name: 'prod', token: 'prod-token-secret' } });
  });

  it.fails('handleInstanceAction update mutates and returns updated entry', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction(
      { action: 'update', name: 'prod', url: 'https://new-prod.example.com' },
      testEnv,
    );
    expect(result).toMatchObject({
      data: { name: 'prod', url: 'https://new-prod.example.com' },
    });
  });

  it.fails('handleInstanceAction delete without confirm throws COOLIFY_CONFIRM_REQUIRED (D-04)', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    await expect(
      handleInstanceAction({ action: 'delete', name: 'prod' }, testEnv),
    ).rejects.toMatchObject({ envelope: { code: 'COOLIFY_CONFIRM_REQUIRED' } });
  });

  it.fails('handleInstanceAction delete on default or last instance without force throws structured error (D-04)', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    await expect(
      handleInstanceAction({ action: 'delete', name: 'prod', confirm: true }, testEnv),
    ).rejects.toThrow(CoolifyApiError);
  });

  it.fails('handleInstanceAction set-default updates registry.default', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    await handleInstanceAction(
      {
        action: 'add',
        name: 'staging',
        url: 'https://staging.example.com',
        token: 'staging-token',
        type: 'self-hosted',
        verifySsl: true,
      },
      testEnv,
    );
    const result = await handleInstanceAction({ action: 'set-default', name: 'staging' }, testEnv);
    expect(result).toMatchObject({ data: { default: 'staging' } });
  });

  it.fails('handleInstanceAction import-env imports COOLIFY_URL+COOLIFY_TOKEN from env as new entry (D-05)', async () => {
    const { handleInstanceAction } = await loadInstanceTool();
    const result = await handleInstanceAction({ action: 'import-env' }, testEnv);
    expect(result).toMatchObject({
      data: {
        name: expect.any(String),
        url: testEnv.COOLIFY_URL,
        token: '***',
      },
    });
  });

  it.fails('handleInstanceAction never accepts instance routing param — schema rejects it (D-03)', async () => {
    const { instanceActionSchema } = await loadInstanceTool();
    const parsed = instanceActionSchema.safeParse({
      action: 'list',
      instance: 'prod',
    });
    expect(parsed.success).toBe(false);
  });
});
