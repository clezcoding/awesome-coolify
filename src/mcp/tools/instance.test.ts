import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EnvConfig } from '../../config/env.js';

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
  it('handleInstanceAction list returns registry entries with tokens redacted as ***', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction({ action: 'list' }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: [{ name: 'prod', token: '***' }],
    });
  });

  it('handleInstanceAction list with reveal:true returns tokens in plaintext', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction({ action: 'list', reveal: true }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: [{ name: 'prod', token: 'prod-token-secret' }],
    });
  });

  it('handleInstanceAction list includes _meta.envOverride:true when COOLIFY_URL+COOLIFY_TOKEN both set (D-17)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction({ action: 'list' }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({ _meta: { envOverride: true } });
  });

  it('handleInstanceAction add persists and returns the new entry', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction(sampleAddPayload, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: {
        name: 'prod',
        url: 'https://prod.coolify.example.com',
        token: '***',
      },
    });
  });

  it('handleInstanceAction add with invalid name throws COOLIFY_VALIDATION_ERROR (D-08)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction(
      { ...sampleAddPayload, name: 'INVALID' },
      testEnv,
    );
    expect(isInstanceErrorResult(result)).toBe(true);
    if (!isInstanceErrorResult(result)) return;
    expect(result.structuredContent.error?.code).toBe('COOLIFY_VALIDATION_ERROR');
  });

  it('handleInstanceAction get returns single entry; redacts token unless reveal:true', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const masked = await handleInstanceAction({ action: 'get', name: 'prod' }, testEnv);
    expect(isInstanceErrorResult(masked)).toBe(false);
    if (isInstanceErrorResult(masked)) return;
    expect(masked).toMatchObject({ data: { name: 'prod', token: '***' } });
    const revealed = await handleInstanceAction(
      { action: 'get', name: 'prod', reveal: true },
      testEnv,
    );
    expect(isInstanceErrorResult(revealed)).toBe(false);
    if (isInstanceErrorResult(revealed)) return;
    expect(revealed).toMatchObject({ data: { name: 'prod', token: 'prod-token-secret' } });
  });

  it('handleInstanceAction update mutates and returns updated entry', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction(
      { action: 'update', name: 'prod', url: 'https://new-prod.example.com' },
      testEnv,
    );
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: { name: 'prod', url: 'https://new-prod.example.com' },
    });
  });

  it('handleInstanceAction update rejects masked token placeholder *** (CR-02)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction(
      { action: 'update', name: 'prod', token: '***' },
      testEnv,
    );
    expect(isInstanceErrorResult(result)).toBe(true);
    if (!isInstanceErrorResult(result)) return;
    expect(result.structuredContent.error?.code).toBe('COOLIFY_VALIDATION_ERROR');

    const revealed = await handleInstanceAction(
      { action: 'get', name: 'prod', reveal: true },
      testEnv,
    );
    expect(isInstanceErrorResult(revealed)).toBe(false);
    if (isInstanceErrorResult(revealed)) return;
    expect(revealed).toMatchObject({ data: { token: 'prod-token-secret' } });
  });

  it('handleInstanceAction delete without confirm throws COOLIFY_CONFIRM_REQUIRED (D-04)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction({ action: 'delete', name: 'prod' }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(true);
    if (!isInstanceErrorResult(result)) return;
    expect(result.structuredContent.error?.code).toBe('COOLIFY_CONFIRM_REQUIRED');
  });

  it('handleInstanceAction delete on default or last instance without force throws structured error (D-04)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    await handleInstanceAction(sampleAddPayload, testEnv);
    const result = await handleInstanceAction(
      { action: 'delete', name: 'prod', confirm: true },
      testEnv,
    );
    expect(isInstanceErrorResult(result)).toBe(true);
    if (!isInstanceErrorResult(result)) return;
    expect(result.structuredContent.error?.code).toBe('COOLIFY_VALIDATION_ERROR');
  });

  it('handleInstanceAction set-default updates registry.default', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
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
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({ data: { default: 'staging' } });
  });

  it('handleInstanceAction import-env imports COOLIFY_URL+COOLIFY_TOKEN from env as new entry (D-05)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction({ action: 'import-env' }, testEnv);
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: {
        name: expect.any(String),
        url: testEnv.COOLIFY_URL,
        token: '***',
      },
    });
  });

  it('handleInstanceAction never accepts instance routing param — schema rejects it (D-03)', async () => {
    const { instanceActionSchema } = await loadInstanceTool();
    const parsed = instanceActionSchema.safeParse({
      action: 'list',
      instance: 'prod',
    });
    expect(parsed.success).toBe(false);
  });
});
