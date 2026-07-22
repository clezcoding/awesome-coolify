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

  it('handleInstanceAction add rejects masked token placeholder *** (WR-01)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction(
      { ...sampleAddPayload, token: '***' },
      testEnv,
    );
    expect(isInstanceErrorResult(result)).toBe(true);
    if (!isInstanceErrorResult(result)) return;
    expect(result.structuredContent.error?.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error?.message).toMatch(/masked placeholder/i);

    const list = await handleInstanceAction({ action: 'list' }, testEnv);
    expect(isInstanceErrorResult(list)).toBe(false);
    if (isInstanceErrorResult(list)) return;
    expect(list.data).toEqual([]);
  });

  it('handleInstanceAction import-env rejects masked COOLIFY_TOKEN *** (WR-01)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction(
      { action: 'import-env' },
      { ...testEnv, COOLIFY_TOKEN: '***' },
    );
    expect(isInstanceErrorResult(result)).toBe(true);
    if (!isInstanceErrorResult(result)) return;
    expect(result.structuredContent.error?.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(result.structuredContent.error?.message).toMatch(/masked placeholder/i);
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
        type: 'self-hosted',
      },
    });
  });

  it('handleInstanceAction import-env infers type cloud for *.coolify.io (IN-03)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction(
      { action: 'import-env', name: 'cloud1' },
      {
        ...testEnv,
        COOLIFY_URL: 'https://app.coolify.io',
        COOLIFY_TOKEN: 'cloud-token',
      },
    );
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: { name: 'cloud1', url: 'https://app.coolify.io', type: 'cloud' },
    });
  });

  it('handleInstanceAction import-env accepts explicit type overriding hostname heuristic (IN-03)', async () => {
    const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
    const result = await handleInstanceAction(
      { action: 'import-env', name: 'forced', type: 'cloud' },
      testEnv,
    );
    expect(isInstanceErrorResult(result)).toBe(false);
    if (isInstanceErrorResult(result)) return;
    expect(result).toMatchObject({
      data: { name: 'forced', type: 'cloud', url: testEnv.COOLIFY_URL },
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

describe('instance cloud-info action', () => {
  const savedCoolifyUrl = process.env.COOLIFY_URL;
  const savedCoolifyToken = process.env.COOLIFY_TOKEN;

  afterEach(() => {
    if (savedCoolifyUrl === undefined) {
      delete process.env.COOLIFY_URL;
    } else {
      process.env.COOLIFY_URL = savedCoolifyUrl;
    }
    if (savedCoolifyToken === undefined) {
      delete process.env.COOLIFY_TOKEN;
    } else {
      process.env.COOLIFY_TOKEN = savedCoolifyToken;
    }
  });

  it(
    'cloud-info with env credentials returns isCloud false and source env (D-16/D-17)',
    async () => {
      const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
      const result = await handleInstanceAction({ action: 'cloud-info' }, testEnv);
      expect(isInstanceErrorResult(result)).toBe(false);
      if (isInstanceErrorResult(result)) return;
      expect(result.data).toMatchObject({
        isCloud: false,
        url: testEnv.COOLIFY_URL,
        source: 'env',
      });
    },
  );

  it(
    'cloud-info on registered cloud instance returns isCloud true and source registry (D-16)',
    async () => {
      const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
      await handleInstanceAction(
        {
          action: 'add',
          name: 'my-cloud',
          url: 'https://app.coolify.io',
          token: 't',
          type: 'cloud',
        },
        testEnv,
      );
      const result = await handleInstanceAction(
        { action: 'cloud-info', instance: 'my-cloud' },
        testEnv,
      );
      expect(isInstanceErrorResult(result)).toBe(false);
      if (isInstanceErrorResult(result)) return;
      expect(result.data).toMatchObject({
        isCloud: true,
        url: 'https://app.coolify.io',
        source: 'registry',
      });
    },
  );

  it(
    'cloud-info with no registry or env infers app.coolify.io (D-16)',
    async () => {
      delete process.env.COOLIFY_URL;
      delete process.env.COOLIFY_TOKEN;
      const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
      const result = await handleInstanceAction(
        { action: 'cloud-info' },
        {
          COOLIFY_VERIFY_SSL: true,
          COOLIFY_MCP_LOG: 'info',
        },
      );
      expect(isInstanceErrorResult(result)).toBe(false);
      if (isInstanceErrorResult(result)) return;
      expect(result.data).toMatchObject({
        isCloud: true,
        url: 'https://app.coolify.io',
        source: 'infer',
      });
    },
  );

  it(
    'cloud-info response includes setupHints, knownLimits, and docsLink (D-16)',
    async () => {
      const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
      const result = await handleInstanceAction({ action: 'cloud-info' }, testEnv);
      expect(isInstanceErrorResult(result)).toBe(false);
      if (isInstanceErrorResult(result)) return;
      const data = result.data as Record<string, unknown>;
      expect(Array.isArray(data.setupHints)).toBe(true);
      expect((data.setupHints as unknown[]).length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.knownLimits)).toBe(true);
      expect((data.knownLimits as unknown[]).length).toBeGreaterThanOrEqual(1);
      expect(typeof data.docsLink).toBe('string');
      expect(data.docsLink).toMatch(/docs\//);
    },
  );

  it(
    'cloud-info with unknown instance name returns COOLIFY_INSTANCE_NOT_FOUND (D-17)',
    async () => {
      const { handleInstanceAction, isInstanceErrorResult } = await loadInstanceTool();
      const result = await handleInstanceAction(
        { action: 'cloud-info', instance: 'missing-instance' },
        testEnv,
      );
      expect(isInstanceErrorResult(result)).toBe(true);
      if (!isInstanceErrorResult(result)) return;
      expect(result.structuredContent.error?.code).toBe('COOLIFY_INSTANCE_NOT_FOUND');
    },
  );

  it('instanceActionSchema accepts cloud-info action (CLD-01)', async () => {
    const { instanceActionSchema } = await loadInstanceTool();
    expect(instanceActionSchema.safeParse({ action: 'cloud-info' }).success).toBe(
      true,
    );
  });

  it(
    'instanceActionSchema rejects cloud-info with invalid instance slug (D-08)',
    async () => {
      const { instanceActionSchema } = await loadInstanceTool();
      const result = instanceActionSchema.safeParse({
        action: 'cloud-info',
        instance: 'bad-name-with-uppercase-A',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(
        result.error.issues.some((issue) => issue.path.includes('instance')),
      ).toBe(true);
    },
  );
});
