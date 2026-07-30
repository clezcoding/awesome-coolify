import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import {
  fetchProjects,
  fetchProject,
  fetchResources,
  fetchServers,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  buildManifestAuditFindings,
  rollupAuditSeverity,
} from '../../utils/manifest-audit.js';
import {
  ManifestManager,
  manifestResourceSchema,
  manifestSchema,
  type Manifest,
  type ManifestResource,
} from '../../utils/manifest.js';
import { InstanceManager } from '../../utils/instance-registry.js';
import { createFlatActionSchema, optionalInstanceParam } from './shared-read-params.js';

const manifestResourceInputSchema = manifestResourceSchema;

export const manifestActionsCatalog =
  'Actions: get() · upsert(resource, project_uuid, environment_uuid) · set(manifest) · remove(uuid) · clear(confirm) · sync(dry_run?, confirm?, prune?) · diff() · audit()';

export const manifestSafetyFooter =
  'Safety: confirm for destructive ops · optional instance';

export const manifestActionSchema = createFlatActionSchema(
  ['get', 'upsert', 'set', 'remove', 'clear', 'sync', 'diff', 'audit'],
  {
    resource: manifestResourceInputSchema.optional(),
    project_uuid: z.string().uuid().optional(),
    project_name: z.string().optional(),
    environment_uuid: z.string().uuid().optional(),
    environment_name: z.string().optional(),
    manifest: manifestSchema.optional(),
    uuid: z.string().uuid().optional(),
    confirm: z.boolean().optional(),
    instance: optionalInstanceParam.instance,
    dry_run: z.boolean().optional(),
    prune: z.boolean().optional(),
  },
  {
    get: [],
    upsert: [
      'resource',
      'project_uuid',
      'project_name',
      'environment_uuid',
      'environment_name',
    ],
    set: ['manifest'],
    remove: ['uuid'],
    clear: ['confirm'],
    sync: ['instance', 'dry_run', 'confirm', 'prune'],
    diff: ['instance'],
    audit: ['instance'],
  },
  {
    upsert: ['resource', 'project_uuid', 'environment_uuid'],
    set: ['manifest'],
    remove: ['uuid'],
    clear: ['confirm'],
  },
);

export type ManifestAction = z.infer<typeof manifestActionSchema>;

export type ManifestActionResult =
  | ReadResponse<unknown>
  | McpErrorResult;

type ApiResource = {
  uuid: string;
  name: string;
  type: string;
  fqdn?: string;
  urls?: Array<{ name?: string; url?: string } | string>;
  environment?: { uuid: string; name: string };
  project?: { uuid: string; name: string };
};

function parseManifestAction(args: unknown): ManifestAction {
  const parsed = manifestActionSchema.safeParse(args);
  if (!parsed.success) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: parsed.error.issues.map((issue) => issue.message).join('; '),
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
  return parsed.data;
}

function resolveEnvRecord(env?: EnvConfig): {
  COOLIFY_URL?: string;
  COOLIFY_TOKEN?: string;
  COOLIFY_VERIFY_SSL?: string;
} {
  return {
    COOLIFY_URL: env?.COOLIFY_URL ?? process.env.COOLIFY_URL,
    COOLIFY_TOKEN: env?.COOLIFY_TOKEN ?? process.env.COOLIFY_TOKEN,
    COOLIFY_VERIFY_SSL:
      env?.COOLIFY_VERIFY_SSL !== undefined
        ? String(env.COOLIFY_VERIFY_SSL)
        : process.env.COOLIFY_VERIFY_SSL,
  };
}

function resolveSyncCredentials(
  env: EnvConfig | undefined,
  instance?: string,
): { url: string; token: string; verifySsl: boolean } {
  return InstanceManager.resolveCredentials(instance, resolveEnvRecord(env));
}

function mapResourceType(type: string): ManifestResource['type'] | null {
  if (type === 'application' || type === 'service' || type === 'database') {
    return type;
  }
  return null;
}

function domainsFromApiResource(resource: ApiResource): string[] {
  if (Array.isArray(resource.urls) && resource.urls.length > 0) {
    const fromUrls = resource.urls
      .map((entry) => (typeof entry === 'string' ? entry : entry?.url))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
    if (fromUrls.length > 0) return fromUrls;
  }
  return resource.fqdn ? [resource.fqdn] : [];
}

function resourceToManifestEntry(resource: ApiResource): ManifestResource | null {
  const type = mapResourceType(resource.type);
  if (!type) return null;
  return {
    uuid: resource.uuid,
    type,
    name: resource.name,
    domains: domainsFromApiResource(resource),
  };
}

function toPartialFetchError(reason: unknown): { code: string; message: string } {
  if (reason instanceof CoolifyApiError) {
    return { code: reason.envelope.code, message: reason.envelope.message };
  }
  return { code: 'COOLIFY_UNKNOWN', message: String(reason) };
}

async function buildManifestFromApiParts(
  creds: { url: string; token: string; verifySsl: boolean },
  resources: ApiResource[],
  projects: { uuid: string; name: string }[],
  servers: { uuid: string; name: string }[],
): Promise<Manifest> {
  const { url, token, verifySsl } = creds;
  const manifestProjects: Manifest['projects'] = [];

  for (const project of projects) {
    const projectDetail = (await fetchProject(
      url,
      token,
      project.uuid,
      verifySsl,
    )) as {
      uuid: string;
      name?: string;
      environments?: { uuid: string; name: string }[];
    };

    manifestProjects.push({
      uuid: project.uuid,
      name: project.name ?? projectDetail.name ?? project.uuid,
      environments: (projectDetail.environments ?? []).map((environment) => ({
        uuid: environment.uuid,
        name: environment.name,
        resources: [],
      })),
    });
  }

  for (const raw of resources) {
    const entry = resourceToManifestEntry(raw);
    if (!entry) continue;

    const projectUuid = raw.project?.uuid;
    const environmentUuid = raw.environment?.uuid;
    if (!projectUuid || !environmentUuid) continue;

    let project = manifestProjects.find((candidate) => candidate.uuid === projectUuid);
    if (!project) {
      project = {
        uuid: projectUuid,
        name: raw.project?.name ?? projectUuid,
        environments: [],
      };
      manifestProjects.push(project);
    }

    let environment = project.environments.find(
      (candidate) => candidate.uuid === environmentUuid,
    );
    if (!environment) {
      environment = {
        uuid: environmentUuid,
        name: raw.environment?.name ?? environmentUuid,
        resources: [],
      };
      project.environments.push(environment);
    }

    const existingIndex = environment.resources.findIndex(
      (candidate) => candidate.uuid === entry.uuid,
    );
    if (existingIndex === -1) {
      environment.resources.push(entry);
    } else {
      environment.resources[existingIndex] = entry;
    }
  }

  return {
    version: '1.0.0',
    projects: manifestProjects,
    servers: servers.map((server) => ({
      uuid: server.uuid,
      name: server.name,
    })),
  };
}

async function fetchRemoteManifest(creds: {
  url: string;
  token: string;
  verifySsl: boolean;
}): Promise<Manifest> {
  const { url, token, verifySsl } = creds;
  const [resources, projects, servers] = await Promise.all([
    fetchResources(url, token, verifySsl),
    fetchProjects(url, token, verifySsl),
    fetchServers(url, token, verifySsl),
  ]);

  return buildManifestFromApiParts(
    creds,
    resources as ApiResource[],
    projects as { uuid: string; name: string }[],
    servers as { uuid: string; name: string }[],
  );
}

type LiveManifestSnapshot = {
  manifest: Manifest;
  partial?: Record<string, { code: string; message: string }>;
};

async function fetchLiveManifestSnapshot(
  creds: { url: string; token: string; verifySsl: boolean },
  options?: { softPartial?: boolean },
): Promise<LiveManifestSnapshot> {
  if (!options?.softPartial) {
    return { manifest: await fetchRemoteManifest(creds) };
  }

  const { url, token, verifySsl } = creds;
  const partial: Record<string, { code: string; message: string }> = {};

  const [resourcesR, projectsR, serversR] = await Promise.allSettled([
    fetchResources(url, token, verifySsl),
    fetchProjects(url, token, verifySsl),
    fetchServers(url, token, verifySsl),
  ]);

  const resources =
    resourcesR.status === 'fulfilled'
      ? (resourcesR.value as ApiResource[])
      : (() => {
          partial.resources = toPartialFetchError(resourcesR.reason);
          return [] as ApiResource[];
        })();

  const projects =
    projectsR.status === 'fulfilled'
      ? (projectsR.value as { uuid: string; name: string }[])
      : (() => {
          partial.projects = toPartialFetchError(projectsR.reason);
          return [] as { uuid: string; name: string }[];
        })();

  const servers =
    serversR.status === 'fulfilled'
      ? (serversR.value as { uuid: string; name: string }[])
      : (() => {
          partial.servers = toPartialFetchError(serversR.reason);
          return [] as { uuid: string; name: string }[];
        })();

  const manifest = await buildManifestFromApiParts(
    creds,
    resources,
    projects,
    servers,
  );

  return {
    manifest,
    ...(Object.keys(partial).length > 0 ? { partial } : {}),
  };
}

function collectResourceUuids(manifest: Manifest): Set<string> {
  const uuids = new Set<string>();
  for (const project of manifest.projects) {
    for (const environment of project.environments) {
      for (const resource of environment.resources) {
        uuids.add(resource.uuid);
      }
    }
  }
  return uuids;
}

function upsertResourceInManifest(
  manifest: Manifest,
  input: {
    resource: ManifestResource;
    projectUuid: string;
    projectName: string;
    environmentUuid: string;
    environmentName: string;
  },
): void {
  let project = manifest.projects.find((entry) => entry.uuid === input.projectUuid);
  if (!project) {
    project = {
      uuid: input.projectUuid,
      name: input.projectName,
      environments: [],
    };
    manifest.projects.push(project);
  } else {
    project.name = input.projectName;
  }

  let environment = project.environments.find(
    (entry) => entry.uuid === input.environmentUuid,
  );
  if (!environment) {
    environment = {
      uuid: input.environmentUuid,
      name: input.environmentName,
      resources: [],
    };
    project.environments.push(environment);
  } else {
    environment.name = input.environmentName;
  }

  const existingIndex = environment.resources.findIndex(
    (entry) => entry.uuid === input.resource.uuid,
  );
  if (existingIndex === -1) {
    environment.resources.push(input.resource);
  } else {
    environment.resources[existingIndex] = input.resource;
  }
}

function removeResourceFromManifest(manifest: Manifest, uuid: string): void {
  for (const project of manifest.projects) {
    for (const environment of project.environments) {
      environment.resources = environment.resources.filter(
        (entry) => entry.uuid !== uuid,
      );
    }
  }
  manifest.servers = manifest.servers.filter((entry) => entry.uuid !== uuid);
}

function mergeManifests(
  local: Manifest,
  remote: Manifest,
  options: { prune: boolean },
): {
  merged: Manifest;
  orphans_retained: string[];
  pruned: string[];
} {
  const remoteResourceUuids = collectResourceUuids(remote);
  const localResourceUuids = collectResourceUuids(local);
  const orphans = [...localResourceUuids].filter((uuid) => !remoteResourceUuids.has(uuid));

  const merged: Manifest = JSON.parse(JSON.stringify(local)) as Manifest;
  merged.version = remote.version ?? local.version ?? '1.0.0';

  for (const remoteProject of remote.projects) {
    let project = merged.projects.find((entry) => entry.uuid === remoteProject.uuid);
    if (!project) {
      merged.projects.push(JSON.parse(JSON.stringify(remoteProject)) as Manifest['projects'][number]);
      continue;
    }
    project.name = remoteProject.name;
    for (const remoteEnvironment of remoteProject.environments) {
      let environment = project.environments.find(
        (entry) => entry.uuid === remoteEnvironment.uuid,
      );
      if (!environment) {
        project.environments.push({
          uuid: remoteEnvironment.uuid,
          name: remoteEnvironment.name,
          resources: [],
        });
      } else {
        environment.name = remoteEnvironment.name;
      }
    }
  }

  // Drop stale local copies before remote-wins upsert so a resource that
  // moved between environments does not leave a duplicate UUID behind.
  for (const uuid of remoteResourceUuids) {
    removeResourceFromManifest(merged, uuid);
  }

  for (const remoteProject of remote.projects) {
    for (const remoteEnvironment of remoteProject.environments) {
      for (const resource of remoteEnvironment.resources) {
        upsertResourceInManifest(merged, {
          resource,
          projectUuid: remoteProject.uuid,
          projectName: remoteProject.name,
          environmentUuid: remoteEnvironment.uuid,
          environmentName: remoteEnvironment.name,
        });
      }
    }
  }

  const remoteServerUuids = new Set(remote.servers.map((server) => server.uuid));
  for (const remoteServer of remote.servers) {
    const existingIndex = merged.servers.findIndex(
      (entry) => entry.uuid === remoteServer.uuid,
    );
    if (existingIndex === -1) {
      merged.servers.push({ ...remoteServer });
    } else {
      merged.servers[existingIndex] = { ...remoteServer };
    }
  }

  const pruned: string[] = [];
  if (options.prune) {
    for (const uuid of orphans) {
      removeResourceFromManifest(merged, uuid);
      pruned.push(uuid);
    }
    const serverOrphans = merged.servers
      .filter((server) => !remoteServerUuids.has(server.uuid))
      .map((server) => server.uuid);
    merged.servers = merged.servers.filter((server) => remoteServerUuids.has(server.uuid));
    pruned.push(...serverOrphans);
  }

  return {
    merged,
    orphans_retained: options.prune ? [] : orphans,
    pruned,
  };
}

function buildReconciliationReport(
  local: Manifest,
  remote: Manifest,
  mergeResult: ReturnType<typeof mergeManifests>,
) {
  return {
    local_resource_count: collectResourceUuids(local).size,
    remote_resource_count: collectResourceUuids(remote).size,
    merged_resource_count: collectResourceUuids(mergeResult.merged).size,
    orphans_retained: mergeResult.orphans_retained,
    pruned: mergeResult.pruned,
    merged: mergeResult.merged,
  };
}

async function reconcileWithRemote(
  env: EnvConfig | undefined,
  instance: string | undefined,
  options: { dryRun: boolean; prune: boolean },
): Promise<ManifestActionResult> {
  let creds: { url: string; token: string; verifySsl: boolean };
  try {
    creds = resolveSyncCredentials(env, instance);
  } catch (error) {
    if (
      error instanceof CoolifyApiError &&
      error.envelope.code === 'COOLIFY_NO_INSTANCE'
    ) {
      return wrapMcpError(error);
    }
    throw error;
  }

  const remote = await fetchRemoteManifest(creds);
  const local = ManifestManager.load();
  const mergeResult = mergeManifests(local, remote, { prune: options.prune });
  const report = buildReconciliationReport(local, remote, mergeResult);

  if (options.dryRun) {
    return buildReadResponse({
      dry_run: true,
      planned: report,
    });
  }

  await ManifestManager.save(mergeResult.merged);

  return buildReadResponse({
    synced: true,
    orphans_retained: mergeResult.orphans_retained,
    pruned: mergeResult.pruned,
    ...report,
  });
}

export async function handleManifestAction(
  args: unknown,
  env?: EnvConfig,
): Promise<ManifestActionResult> {
  try {
    const parsed = parseManifestAction(args);

    switch (parsed.action) {
      case 'get': {
        const manifest = ManifestManager.load();
        return buildReadResponse(manifest);
      }

      case 'upsert': {
        await ManifestManager.upsert({
          resource: parsed.resource,
          project_uuid: parsed.project_uuid,
          project_name: parsed.project_name,
          environment_uuid: parsed.environment_uuid,
          environment_name: parsed.environment_name,
        });
        return buildReadResponse(parsed.resource);
      }

      case 'set': {
        const manifest = manifestSchema.parse(parsed.manifest);
        await ManifestManager.save(manifest);
        return buildReadResponse(manifest);
      }

      case 'remove': {
        const existed = ManifestManager.hasUuid(parsed.uuid);
        if (!existed) {
          return buildReadResponse({
            removed: false,
            not_found: true,
            uuid: parsed.uuid,
          });
        }
        await ManifestManager.remove(parsed.uuid);
        return buildReadResponse({ removed: true, uuid: parsed.uuid });
      }

      case 'clear': {
        if (parsed.confirm !== true) {
          throw new CoolifyApiError({
            code: 'COOLIFY_422',
            message: 'clear requires confirm:true',
            recoveryHints: RECOVERY_HINTS.COOLIFY_422,
          });
        }
        await ManifestManager.clear();
        return buildReadResponse({ cleared: true });
      }

      case 'sync': {
        const prune = parsed.confirm === true && parsed.prune === true;
        return await reconcileWithRemote(env, parsed.instance, {
          dryRun: parsed.dry_run === true,
          prune,
        });
      }

      case 'diff': {
        let creds: { url: string; token: string; verifySsl: boolean };
        try {
          creds = resolveSyncCredentials(env, parsed.instance);
        } catch (error) {
          if (
            error instanceof CoolifyApiError &&
            error.envelope.code === 'COOLIFY_NO_INSTANCE'
          ) {
            return wrapMcpError(error);
          }
          throw error;
        }

        const remote = await fetchRemoteManifest(creds);
        const local = ManifestManager.load();
        const mergeResult = mergeManifests(local, remote, { prune: false });
        const report = buildReconciliationReport(local, remote, mergeResult);

        return buildReadResponse({
          diff: report,
          destructive: false,
        });
      }

      case 'audit': {
        let creds: { url: string; token: string; verifySsl: boolean };
        try {
          creds = resolveSyncCredentials(env, parsed.instance);
        } catch (error) {
          if (
            error instanceof CoolifyApiError &&
            error.envelope.code === 'COOLIFY_NO_INSTANCE'
          ) {
            return wrapMcpError(error);
          }
          throw error;
        }

        if (!ManifestManager.exists()) {
          throw new CoolifyApiError({
            code: 'COOLIFY_VALIDATION_ERROR',
            message: 'Local manifest not found at .coolify/manifest.json',
            recoveryHints: [
              'Run manifest.sync to populate the local manifest cache from live Coolify state.',
              'Or manifest.upsert to add resources manually.',
            ],
          });
        }

        const local = ManifestManager.load();
        const { manifest: remote, partial } = await fetchLiveManifestSnapshot(
          creds,
          { softPartial: true },
        );
        const findings = buildManifestAuditFindings(local, remote, {
          instance: parsed.instance,
        });
        const mergeResult = mergeManifests(local, remote, { prune: false });
        const report = buildReconciliationReport(local, remote, mergeResult);

        return buildReadResponse({
          severity: rollupAuditSeverity(findings),
          findings,
          summary: {
            local_resource_count: collectResourceUuids(local).size,
            live_resource_count: collectResourceUuids(remote).size,
            orphans_local: findings.filter((f) => f.kind === 'local_orphan').length,
            orphans_live: findings.filter((f) => f.kind === 'remote_only').length,
          },
          ...(partial ? { partial } : {}),
          diff_support: report,
        });
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown manifest action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isManifestErrorResult(
  result: ManifestActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
