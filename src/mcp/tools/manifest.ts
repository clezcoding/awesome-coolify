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
  ManifestManager,
  manifestResourceSchema,
  manifestSchema,
  type Manifest,
  type ManifestResource,
} from '../../utils/manifest.js';
import { InstanceManager } from '../../utils/instance-registry.js';
import { optionalInstanceParam } from './shared-read-params.js';

const manifestResourceInputSchema = manifestResourceSchema;

const getActionSchema = z
  .object({
    action: z.literal('get'),
  })
  .strict();

const upsertActionSchema = z
  .object({
    action: z.literal('upsert'),
    resource: manifestResourceInputSchema,
    project_uuid: z.string().uuid(),
    project_name: z.string().optional(),
    environment_uuid: z.string().uuid(),
    environment_name: z.string().optional(),
  })
  .strict();

const setActionSchema = z
  .object({
    action: z.literal('set'),
    manifest: manifestSchema,
  })
  .strict();

const removeActionSchema = z
  .object({
    action: z.literal('remove'),
    uuid: z.string().uuid(),
  })
  .strict();

const clearActionSchema = z
  .object({
    action: z.literal('clear'),
    confirm: z.boolean(),
  })
  .strict();

const syncActionSchema = z
  .object({
    action: z.literal('sync'),
    instance: optionalInstanceParam.instance,
    dry_run: z.boolean().optional(),
    confirm: z.boolean().optional(),
    prune: z.boolean().optional(),
  })
  .strict();

const diffActionSchema = z
  .object({
    action: z.literal('diff'),
    instance: optionalInstanceParam.instance,
  })
  .strict();

export const manifestActionSchema = z.discriminatedUnion('action', [
  getActionSchema,
  upsertActionSchema,
  setActionSchema,
  removeActionSchema,
  clearActionSchema,
  syncActionSchema,
  diffActionSchema,
]);

export type ManifestAction = z.infer<typeof manifestActionSchema>;

export type ManifestActionResult =
  | ReadResponse<unknown>
  | McpErrorResult;

type ApiResource = {
  uuid: string;
  name: string;
  type: string;
  fqdn?: string;
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

function resourceToManifestEntry(resource: ApiResource): ManifestResource | null {
  const type = mapResourceType(resource.type);
  if (!type) return null;
  return {
    uuid: resource.uuid,
    type,
    name: resource.name,
    domains: resource.fqdn ? [resource.fqdn] : [],
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

  const manifestProjects: Manifest['projects'] = [];

  for (const project of projects as { uuid: string; name: string }[]) {
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

  for (const raw of resources as ApiResource[]) {
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
    servers: (servers as { uuid: string; name: string }[]).map((server) => ({
      uuid: server.uuid,
      name: server.name,
    })),
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
