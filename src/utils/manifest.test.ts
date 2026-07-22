import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Test hook: COOLIFY_MCP_TEST_WORKSPACE overrides project root for isolated manifest files.
let testWorkspaceRoot: string;

const PROJECT_UUID = '00000000-0000-4000-8000-000000000001';
const ENV_UUID = '00000000-0000-4000-8000-000000000002';
const RESOURCE_UUID = '00000000-0000-4000-8000-000000000003';
const SIBLING_UUID = '00000000-0000-4000-8000-000000000004';

beforeEach(() => {
  testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-workspace-'));
  process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
});

afterEach(() => {
  delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
  rmSync(testWorkspaceRoot, { recursive: true, force: true });
});

async function loadManifestManager() {
  return import('./manifest.js');
}

const sampleResource = {
  uuid: RESOURCE_UUID,
  type: 'application' as const,
  name: 'my-app',
  domains: ['https://app.example.com'],
};

describe('ManifestManager', () => {
  it.fails(
    'load() on missing file returns empty manifest with version 1.0.0, projects [], servers []',
    async () => {
      const { ManifestManager } = await loadManifestManager();
      const manifest = ManifestManager.load();
      expect(manifest).toEqual({
        version: '1.0.0',
        projects: [],
        servers: [],
      });
    },
  );

  it.fails(
    'upsert() adds a resource under nested project/environment, creating project/environment when absent',
    async () => {
      const { ManifestManager } = await loadManifestManager();
      await ManifestManager.upsert({
        resource: sampleResource,
        project_uuid: PROJECT_UUID,
        project_name: 'my-project',
        environment_uuid: ENV_UUID,
        environment_name: 'production',
      });
      const manifest = ManifestManager.load();
      expect(manifest.projects).toHaveLength(1);
      expect(manifest.projects[0]).toMatchObject({
        uuid: PROJECT_UUID,
        name: 'my-project',
      });
      expect(manifest.projects[0].environments).toHaveLength(1);
      expect(manifest.projects[0].environments[0]).toMatchObject({
        uuid: ENV_UUID,
        name: 'production',
      });
      expect(manifest.projects[0].environments[0].resources).toEqual([
        expect.objectContaining({
          uuid: RESOURCE_UUID,
          type: 'application',
          name: 'my-app',
          domains: ['https://app.example.com'],
        }),
      ]);
    },
  );

  it.fails(
    'remove(uuid) deletes a resource by UUID and leaves siblings intact',
    async () => {
      const { ManifestManager } = await loadManifestManager();
      await ManifestManager.upsert({
        resource: sampleResource,
        project_uuid: PROJECT_UUID,
        project_name: 'my-project',
        environment_uuid: ENV_UUID,
        environment_name: 'production',
      });
      await ManifestManager.upsert({
        resource: {
          uuid: SIBLING_UUID,
          type: 'service',
          name: 'my-service',
          domains: [],
        },
        project_uuid: PROJECT_UUID,
        project_name: 'my-project',
        environment_uuid: ENV_UUID,
        environment_name: 'production',
      });
      await ManifestManager.remove(RESOURCE_UUID);
      const manifest = ManifestManager.load();
      const resources = manifest.projects[0].environments[0].resources;
      expect(resources).toHaveLength(1);
      expect(resources[0].uuid).toBe(SIBLING_UUID);
    },
  );

  it.fails(
    'first successful write creates .coolify/manifest.json and appends .coolify/ to .gitignore (MAN-02)',
    async () => {
      const { ManifestManager } = await loadManifestManager();
      await ManifestManager.upsert({
        resource: sampleResource,
        project_uuid: PROJECT_UUID,
        project_name: 'my-project',
        environment_uuid: ENV_UUID,
        environment_name: 'production',
      });
      const manifestPath = join(testWorkspaceRoot, '.coolify', 'manifest.json');
      expect(existsSync(manifestPath)).toBe(true);
      const gitignore = readFileSync(join(testWorkspaceRoot, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.coolify/');
    },
  );

  it.fails('second write does NOT duplicate the .gitignore entry', async () => {
    const { ManifestManager } = await loadManifestManager();
    await ManifestManager.upsert({
      resource: sampleResource,
      project_uuid: PROJECT_UUID,
      project_name: 'my-project',
      environment_uuid: ENV_UUID,
      environment_name: 'production',
    });
    await ManifestManager.upsert({
      resource: {
        uuid: SIBLING_UUID,
        type: 'database',
        name: 'my-db',
        domains: [],
      },
      project_uuid: PROJECT_UUID,
      project_name: 'my-project',
      environment_uuid: ENV_UUID,
      environment_name: 'production',
    });
    const gitignore = readFileSync(join(testWorkspaceRoot, '.gitignore'), 'utf-8');
    const matches = gitignore.match(/^\.coolify\/$/gm);
    expect(matches?.length ?? 0).toBe(1);
  });

  it.fails('hasUuid(uuid) returns true when UUID is present, false otherwise', async () => {
    const { ManifestManager } = await loadManifestManager();
    expect(ManifestManager.hasUuid(RESOURCE_UUID)).toBe(false);
    await ManifestManager.upsert({
      resource: sampleResource,
      project_uuid: PROJECT_UUID,
      project_name: 'my-project',
      environment_uuid: ENV_UUID,
      environment_name: 'production',
    });
    expect(ManifestManager.hasUuid(RESOURCE_UUID)).toBe(true);
    expect(ManifestManager.hasUuid('00000000-0000-4000-8000-000000000099')).toBe(false);
  });

  it.fails('atomic write leaves no .tmp files behind on success', async () => {
    const { ManifestManager } = await loadManifestManager();
    await ManifestManager.upsert({
      resource: sampleResource,
      project_uuid: PROJECT_UUID,
      project_name: 'my-project',
      environment_uuid: ENV_UUID,
      environment_name: 'production',
    });
    const coolifyDir = join(testWorkspaceRoot, '.coolify');
    const entries = readdirSync(coolifyDir);
    expect(entries.some((name) => name.includes('.tmp'))).toBe(false);
  });

  it.fails(
    'autoUpsert() propagates disk/permission errors to the caller (does NOT swallow internally)',
    async () => {
      const { ManifestManager } = await loadManifestManager();
      const readOnlyRoot = join(testWorkspaceRoot, 'readonly-root');
      mkdirSync(readOnlyRoot, { recursive: true });
      writeFileSync(join(readOnlyRoot, '.gitignore'), '', 'utf-8');
      process.env.COOLIFY_MCP_TEST_WORKSPACE = readOnlyRoot;
      try {
        await ManifestManager.autoUpsert({
          uuid: RESOURCE_UUID,
          type: 'application',
          name: 'blocked-app',
          domains: [],
          projectUuid: PROJECT_UUID,
          environmentUuid: ENV_UUID,
        });
        expect.fail('expected autoUpsert to propagate write error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    },
  );
});
