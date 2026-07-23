import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

vi.mock('../../api/client.js', () => ({
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  fetchServers: vi.fn(),
}));

import {
  fetchResources,
  fetchProjects,
  fetchProject,
  fetchServers,
} from '../../api/client.js';

let testWorkspaceRoot: string;
let registryDir: string;

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const emptyEnv: EnvConfig = {
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const PROJECT_UUID = '00000000-0000-4000-8000-000000000001';
const ENV_UUID = '00000000-0000-4000-8000-000000000002';
const RESOURCE_UUID = '00000000-0000-4000-8000-000000000003';
const ORPHAN_UUID = '00000000-0000-4000-8000-000000000004';
const ENV_UUID_B = '00000000-0000-4000-8000-000000000005';

beforeEach(() => {
  testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-manifest-tool-'));
  registryDir = mkdtempSync(join(tmpdir(), 'coolify-mcp-manifest-registry-'));
  process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  process.env.COOLIFY_MCP_TEST_REGISTRY_DIR = registryDir;
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.COOLIFY_MCP_TEST_WORKSPACE;
  delete process.env.COOLIFY_MCP_TEST_REGISTRY_DIR;
  rmSync(testWorkspaceRoot, { recursive: true, force: true });
  rmSync(registryDir, { recursive: true, force: true });
});

async function loadManifestTool() {
  return import('./manifest.js');
}

async function seedManifestViaUpsert() {
  const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
  const result = await handleManifestAction(
    {
      action: 'upsert',
      resource: {
        uuid: RESOURCE_UUID,
        type: 'application',
        name: 'stale-app',
        domains: ['https://old.example.com'],
      },
      project_uuid: PROJECT_UUID,
      project_name: 'my-project',
      environment_uuid: ENV_UUID,
      environment_name: 'production',
    },
    testEnv,
  );
  expect(isManifestErrorResult(result)).toBe(false);
}

describe('manifest tool', () => {
  it(
    "handleManifestAction({action:'get'}) returns buildReadResponse envelope with manifest data",
    async () => {
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      await seedManifestViaUpsert();
      const result = await handleManifestAction({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result).toMatchObject({
        ok: true,
        data: expect.objectContaining({
          version: '1.0.0',
          projects: expect.any(Array),
        }),
      });
      expect(result._meta).toMatchObject({
        truncated: expect.any(Boolean),
        chars: expect.any(Number),
        max_chars: expect.any(Number),
      });
    },
  );

  it(
    "handleManifestAction({action:'upsert', resource:{...}}) upserts and returns the upserted entry",
    async () => {
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      const result = await handleManifestAction(
        {
          action: 'upsert',
          resource: {
            uuid: RESOURCE_UUID,
            type: 'application',
            name: 'my-app',
            domains: ['https://app.example.com'],
          },
          project_uuid: PROJECT_UUID,
          project_name: 'my-project',
          environment_uuid: ENV_UUID,
          environment_name: 'production',
        },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result.data).toMatchObject({
        uuid: RESOURCE_UUID,
        type: 'application',
        name: 'my-app',
        domains: ['https://app.example.com'],
      });
    },
  );

  it(
    "handleManifestAction({action:'set', manifest:{...}}) replaces the whole manifest and validates via Zod",
    async () => {
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      const fullManifest = {
        version: '1.0.0',
        updatedAt: '2026-07-22T00:00:00.000Z',
        projects: [
          {
            uuid: PROJECT_UUID,
            name: 'replaced-project',
            environments: [
              {
                uuid: ENV_UUID,
                name: 'production',
                resources: [
                  {
                    uuid: RESOURCE_UUID,
                    type: 'service',
                    name: 'replaced-service',
                    domains: ['https://svc.example.com'],
                  },
                ],
              },
            ],
          },
        ],
        servers: [{ uuid: '00000000-0000-4000-8000-000000000010', name: 'srv-1' }],
      };
      const result = await handleManifestAction(
        { action: 'set', manifest: fullManifest },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result.data).toMatchObject(fullManifest);
    },
  );

  it(
    "handleManifestAction({action:'remove', uuid:'...'}) removes the entry and returns {removed:true}",
    async () => {
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      await seedManifestViaUpsert();
      const result = await handleManifestAction(
        { action: 'remove', uuid: RESOURCE_UUID },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result.data).toMatchObject({ removed: true, uuid: RESOURCE_UUID });
    },
  );

  it(
    "handleManifestAction({action:'clear', confirm:false}) throws COOLIFY_422; with confirm:true returns {cleared:true}",
    async () => {
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      await seedManifestViaUpsert();
      const rejected = await handleManifestAction({ action: 'clear', confirm: false }, testEnv);
      expect(isManifestErrorResult(rejected)).toBe(true);
      if (!isManifestErrorResult(rejected)) return;
      expect(rejected.structuredContent.error?.code).toBe('COOLIFY_422');

      const cleared = await handleManifestAction({ action: 'clear', confirm: true }, testEnv);
      expect(isManifestErrorResult(cleared)).toBe(false);
      if (isManifestErrorResult(cleared)) return;
      expect(cleared.data).toMatchObject({ cleared: true });
    },
  );

  it(
    "handleManifestAction({action:'sync'}) without creds returns COOLIFY_NO_INSTANCE envelope (D-04)",
    async () => {
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      const result = await handleManifestAction({ action: 'sync' }, emptyEnv);
      expect(isManifestErrorResult(result)).toBe(true);
      if (!isManifestErrorResult(result)) return;
      expect(result.structuredContent.error?.code).toBe('COOLIFY_NO_INSTANCE');
    },
  );

  it(
    "handleManifestAction({action:'sync', instance:'prod', dry_run:true}) returns planned diff without writing",
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction: handleManifest, isManifestErrorResult } =
        await loadManifestTool();

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );
      await handleManifest({ action: 'upsert', resource: { uuid: RESOURCE_UUID, type: 'application', name: 'stale-app', domains: ['https://old.example.com'] }, project_uuid: PROJECT_UUID, project_name: 'p', environment_uuid: ENV_UUID, environment_name: 'e' }, testEnv);

      vi.mocked(fetchResources).mockResolvedValue([
        {
          uuid: RESOURCE_UUID,
          name: 'fresh-app',
          type: 'application',
          fqdn: 'https://new.example.com',
          environment: { uuid: ENV_UUID, name: 'e' },
          project: { uuid: PROJECT_UUID, name: 'p' },
        },
      ] as never);
      vi.mocked(fetchProjects).mockResolvedValue([{ uuid: PROJECT_UUID, name: 'p' }] as never);
      vi.mocked(fetchProject).mockResolvedValue({
        uuid: PROJECT_UUID,
        environments: [{ uuid: ENV_UUID, name: 'e' }],
      } as never);
      vi.mocked(fetchServers).mockResolvedValue([] as never);

      const before = await handleManifest({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(before)).toBe(false);

      const result = await handleManifest(
        { action: 'sync', instance: 'prod', dry_run: true },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result.data).toMatchObject({
        dry_run: true,
        planned: expect.any(Object),
      });

      const after = await handleManifest({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(after)).toBe(false);
      if (isManifestErrorResult(after)) return;
      expect(after.data).toEqual((before as { data: unknown }).data);
    },
  );

  it(
    "handleManifestAction sync merges remote state into local — remote wins on conflict, orphans retained (MAN-03)",
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );

      await handleManifestAction(
        {
          action: 'upsert',
          resource: {
            uuid: RESOURCE_UUID,
            type: 'application',
            name: 'stale-app',
            domains: ['https://old.example.com'],
          },
          project_uuid: PROJECT_UUID,
          project_name: 'p',
          environment_uuid: ENV_UUID,
          environment_name: 'e',
        },
        testEnv,
      );
      await handleManifestAction(
        {
          action: 'upsert',
          resource: {
            uuid: ORPHAN_UUID,
            type: 'service',
            name: 'local-orphan',
            domains: [],
          },
          project_uuid: PROJECT_UUID,
          project_name: 'p',
          environment_uuid: ENV_UUID,
          environment_name: 'e',
        },
        testEnv,
      );

      vi.mocked(fetchResources).mockResolvedValue([
        {
          uuid: RESOURCE_UUID,
          name: 'remote-app',
          type: 'application',
          fqdn: 'https://remote.example.com',
          environment: { uuid: ENV_UUID, name: 'e' },
          project: { uuid: PROJECT_UUID, name: 'p' },
        },
      ] as never);
      vi.mocked(fetchProjects).mockResolvedValue([{ uuid: PROJECT_UUID, name: 'p' }] as never);
      vi.mocked(fetchProject).mockResolvedValue({
        uuid: PROJECT_UUID,
        environments: [{ uuid: ENV_UUID, name: 'e' }],
      } as never);
      vi.mocked(fetchServers).mockResolvedValue([] as never);

      const result = await handleManifestAction(
        { action: 'sync', instance: 'prod' },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;

      const manifest = await handleManifestAction({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(manifest)).toBe(false);
      if (isManifestErrorResult(manifest)) return;
      const resources =
        (manifest.data as { projects: { environments: { resources: { uuid: string; name: string; domains: string[] }[] }[] }[] })
          .projects[0]?.environments[0]?.resources ?? [];
      const merged = resources.find((r) => r.uuid === RESOURCE_UUID);
      expect(merged).toMatchObject({
        name: 'remote-app',
        domains: ['https://remote.example.com'],
      });
      expect(resources.some((r) => r.uuid === ORPHAN_UUID)).toBe(true);
      expect(result.data).toMatchObject({
        orphans_retained: expect.arrayContaining([ORPHAN_UUID]),
      });
    },
  );

  it(
    'handleManifestAction sync removes duplicate resource UUID when remote environment changes (WR-02)',
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );

      await handleManifestAction(
        {
          action: 'upsert',
          resource: {
            uuid: RESOURCE_UUID,
            type: 'application',
            name: 'stale-placement',
            domains: ['https://old.example.com'],
          },
          project_uuid: PROJECT_UUID,
          project_name: 'p',
          environment_uuid: ENV_UUID,
          environment_name: 'e-old',
        },
        testEnv,
      );

      vi.mocked(fetchResources).mockResolvedValue([
        {
          uuid: RESOURCE_UUID,
          name: 'moved-app',
          type: 'application',
          fqdn: 'https://remote.example.com',
          environment: { uuid: ENV_UUID_B, name: 'e-new' },
          project: { uuid: PROJECT_UUID, name: 'p' },
        },
      ] as never);
      vi.mocked(fetchProjects).mockResolvedValue([{ uuid: PROJECT_UUID, name: 'p' }] as never);
      vi.mocked(fetchProject).mockResolvedValue({
        uuid: PROJECT_UUID,
        environments: [
          { uuid: ENV_UUID, name: 'e-old' },
          { uuid: ENV_UUID_B, name: 'e-new' },
        ],
      } as never);
      vi.mocked(fetchServers).mockResolvedValue([] as never);

      const result = await handleManifestAction(
        { action: 'sync', instance: 'prod' },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;

      const manifest = await handleManifestAction({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(manifest)).toBe(false);
      if (isManifestErrorResult(manifest)) return;

      const projects = (
        manifest.data as {
          projects: {
            environments: { uuid: string; resources: { uuid: string; name: string }[] }[];
          }[];
        }
      ).projects;
      const allResources = projects.flatMap((project) =>
        project.environments.flatMap((environment) =>
          environment.resources.map((resource) => ({
            env: environment.uuid,
            ...resource,
          })),
        ),
      );
      const matches = allResources.filter((entry) => entry.uuid === RESOURCE_UUID);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        env: ENV_UUID_B,
        name: 'moved-app',
      });
    },
  );

  it(
    'handleManifestAction sync maps service domains from urls[] when fqdn absent (WR-04)',
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();
      const SERVICE_UUID = '00000000-0000-4000-8000-000000000006';

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );

      vi.mocked(fetchResources).mockResolvedValue([
        {
          uuid: SERVICE_UUID,
          name: 'multi-url-svc',
          type: 'service',
          urls: [
            { name: 'web', url: 'https://a.example.com' },
            { name: 'api', url: 'https://b.example.com' },
          ],
          environment: { uuid: ENV_UUID, name: 'e' },
          project: { uuid: PROJECT_UUID, name: 'p' },
        },
      ] as never);
      vi.mocked(fetchProjects).mockResolvedValue([{ uuid: PROJECT_UUID, name: 'p' }] as never);
      vi.mocked(fetchProject).mockResolvedValue({
        uuid: PROJECT_UUID,
        environments: [{ uuid: ENV_UUID, name: 'e' }],
      } as never);
      vi.mocked(fetchServers).mockResolvedValue([] as never);

      const result = await handleManifestAction(
        { action: 'sync', instance: 'prod' },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;

      const manifest = await handleManifestAction({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(manifest)).toBe(false);
      if (isManifestErrorResult(manifest)) return;

      const resources =
        (
          manifest.data as {
            projects: {
              environments: { resources: { uuid: string; domains: string[] }[] }[];
            }[];
          }
        ).projects[0]?.environments[0]?.resources ?? [];
      expect(resources.find((entry) => entry.uuid === SERVICE_UUID)).toMatchObject({
        domains: ['https://a.example.com', 'https://b.example.com'],
      });
    },
  );

  it(
    "handleManifestAction({action:'sync', instance:'prod', confirm:true, prune:true}) prunes orphans and returns sync report",
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );
      await handleManifestAction(
        {
          action: 'upsert',
          resource: {
            uuid: ORPHAN_UUID,
            type: 'database',
            name: 'orphan-db',
            domains: [],
          },
          project_uuid: PROJECT_UUID,
          project_name: 'p',
          environment_uuid: ENV_UUID,
          environment_name: 'e',
        },
        testEnv,
      );

      vi.mocked(fetchResources).mockResolvedValue([] as never);
      vi.mocked(fetchProjects).mockResolvedValue([] as never);
      vi.mocked(fetchProject).mockResolvedValue({ uuid: PROJECT_UUID, environments: [] } as never);
      vi.mocked(fetchServers).mockResolvedValue([] as never);

      const result = await handleManifestAction(
        { action: 'sync', instance: 'prod', confirm: true, prune: true },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result.data).toMatchObject({
        pruned: expect.arrayContaining([ORPHAN_UUID]),
      });

      const manifest = await handleManifestAction({ action: 'get' }, testEnv);
      expect(isManifestErrorResult(manifest)).toBe(false);
      if (isManifestErrorResult(manifest)) return;
      const resources =
        (manifest.data as { projects: { environments: { resources: { uuid: string }[] }[] }[] })
          .projects[0]?.environments[0]?.resources ?? [];
      expect(resources.some((r) => r.uuid === ORPHAN_UUID)).toBe(false);
    },
  );

  it(
    "handleManifestAction({action:'diff', instance:'prod'}) returns always non-destructive report",
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );
      await seedManifestViaUpsert();

      vi.mocked(fetchResources).mockResolvedValue([
        {
          uuid: RESOURCE_UUID,
          name: 'remote-app',
          type: 'application',
          fqdn: 'https://remote.example.com',
          environment: { uuid: ENV_UUID, name: 'e' },
          project: { uuid: PROJECT_UUID, name: 'p' },
        },
      ] as never);
      vi.mocked(fetchProjects).mockResolvedValue([{ uuid: PROJECT_UUID, name: 'p' }] as never);
      vi.mocked(fetchProject).mockResolvedValue({
        uuid: PROJECT_UUID,
        environments: [{ uuid: ENV_UUID, name: 'e' }],
      } as never);
      vi.mocked(fetchServers).mockResolvedValue([] as never);

      const before = await handleManifestAction({ action: 'get' }, testEnv);
      const result = await handleManifestAction({ action: 'diff', instance: 'prod' }, testEnv);
      expect(isManifestErrorResult(result)).toBe(false);
      if (isManifestErrorResult(result)) return;
      expect(result.data).toMatchObject({
        diff: expect.any(Object),
        destructive: false,
      });
      const after = await handleManifestAction({ action: 'get' }, testEnv);
      expect(after).toEqual(before);
    },
  );

  it(
    '404 on a manifest-cached UUID surfaces recovery hints pointing to manifest.sync / manifest.diff (MAN-04)',
    async () => {
      const { handleInstanceAction } = await import('./instance.js');
      const { handleManifestAction, isManifestErrorResult } = await loadManifestTool();

      await handleInstanceAction(
        {
          action: 'add',
          name: 'prod',
          url: 'https://prod.coolify.example.com',
          token: 'prod-token',
          type: 'self-hosted',
        },
        testEnv,
      );
      await seedManifestViaUpsert();

      vi.mocked(fetchResources).mockRejectedValue(
        new CoolifyApiError({
          code: 'COOLIFY_404',
          message: `Resource ${RESOURCE_UUID} not found`,
          recoveryHints: [],
          httpStatus: 404,
        }),
      );

      const result = await handleManifestAction(
        { action: 'sync', instance: 'prod' },
        testEnv,
      );
      expect(isManifestErrorResult(result)).toBe(true);
      if (!isManifestErrorResult(result)) return;
      const hints = result.structuredContent.error?.recoveryHints ?? [];
      expect(hints.some((h) => /manifest\.sync/i.test(h))).toBe(true);
      expect(hints.some((h) => /manifest\.diff/i.test(h))).toBe(true);
    },
  );
});
