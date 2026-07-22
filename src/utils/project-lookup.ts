import type { EnvConfig } from '../config/env.js';
import { fetchProjects, fetchProject, fetchEnvironments } from '../api/client.js';
import { CoolifyApiError } from './errors.js';

export type ProjectEnvironmentEntry = {
  project_uuid: string;
  project_name: string;
};

export type ProjectEnvironmentLookup = Map<number, ProjectEnvironmentEntry>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractEnvironmentIds(project: Record<string, unknown>): number[] {
  const environments = project.environments;
  if (!Array.isArray(environments)) return [];
  const ids: number[] = [];
  for (const environment of environments) {
    if (isRecord(environment) && typeof environment.id === 'number') {
      ids.push(environment.id);
    }
  }
  return ids;
}

export async function buildProjectEnvironmentIndex(
  env: EnvConfig,
): Promise<ProjectEnvironmentLookup> {
  const index = new Map<number, ProjectEnvironmentEntry>();
  const rawProjects = await fetchProjects(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  for (const raw of rawProjects) {
    if (!isRecord(raw)) continue;
    const projectUuid = String(raw.uuid ?? raw.id ?? '');
    const projectName = String(raw.name ?? '');
    if (!projectUuid) continue;

    let environmentIds = extractEnvironmentIds(raw);
    if (environmentIds.length === 0) {
      const detail = await fetchProject(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        projectUuid,
        env.COOLIFY_VERIFY_SSL,
      );
      if (isRecord(detail)) {
        environmentIds = extractEnvironmentIds(detail);
      }
    }

    const entry: ProjectEnvironmentEntry = {
      project_uuid: projectUuid,
      project_name: projectName,
    };
    for (const environmentId of environmentIds) {
      index.set(environmentId, entry);
    }
  }

  return index;
}

export async function resolveProjectUuid(
  project_uuid: string | undefined,
  project_name: string | undefined,
  env: EnvConfig,
): Promise<string> {
  if (project_uuid) {
    return project_uuid;
  }

  const rawProjects = await fetchProjects(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const matched = rawProjects
    .filter(isRecord)
    .filter((project) => {
      const name = project.name;
      return (
        typeof name === 'string' &&
        name.toLowerCase().includes(project_name!.toLowerCase())
      );
    });

  if (matched.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: `No project matched name substring '${project_name}'`,
      recoveryHints: [
        'Verify the project name exists on this Coolify instance.',
      ],
    });
  }

  if (matched.length > 1) {
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message: `Multiple projects matched name substring '${project_name}' — refusing to mutate.`,
      recoveryHints: [
        'Re-run the mutation with an explicit project_uuid.',
        ...matched.map(
          (project) => `- ${String(project.name)} (${String(project.uuid)})`,
        ),
      ],
    });
  }

  return String(matched[0].uuid);
}

export async function resolveEnvironmentUuid(
  env_uuid: string | undefined,
  env_name: string | undefined,
  project_uuid: string,
  env: EnvConfig,
): Promise<string> {
  if (env_uuid) {
    return env_uuid;
  }

  const rawEnvironments = await fetchEnvironments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    project_uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const matched = rawEnvironments
    .filter(isRecord)
    .filter((environment) => {
      const name = environment.name;
      return (
        typeof name === 'string' &&
        name.toLowerCase().includes(env_name!.toLowerCase())
      );
    });

  if (matched.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: `No environment matched name substring '${env_name}' in project '${project_uuid}'`,
      recoveryHints: [
        'Verify the environment name exists in the specified project.',
      ],
    });
  }

  if (matched.length > 1) {
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message: `Multiple environments matched name substring '${env_name}' — refusing to mutate.`,
      recoveryHints: [
        'Re-run the mutation with an explicit env_uuid.',
        ...matched.map(
          (environment) =>
            `- ${String(environment.name)} (${String(environment.uuid)})`,
        ),
      ],
    });
  }

  return String(matched[0].uuid);
}

export type ResolvedEnvironmentFromId = {
  environmentUuid: string;
  environmentName?: string;
  projectUuid: string;
  projectName?: string;
};

/**
 * Resolve Coolify 4.1.x numeric `environment_id` to environment UUID.
 * Uses project-scoped `/environments` when projectUuid is known; otherwise
 * builds the project↔environment_id index first.
 */
export async function resolveEnvironmentUuidFromId(
  environmentId: number,
  projectUuid: string | undefined,
  env: EnvConfig,
): Promise<ResolvedEnvironmentFromId | undefined> {
  let resolvedProjectUuid = projectUuid;
  let resolvedProjectName: string | undefined;

  if (!resolvedProjectUuid) {
    const index = await buildProjectEnvironmentIndex(env);
    const entry = index.get(environmentId);
    if (!entry) return undefined;
    resolvedProjectUuid = entry.project_uuid;
    resolvedProjectName = entry.project_name;
  }

  const rawEnvironments = await fetchEnvironments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    resolvedProjectUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  for (const raw of rawEnvironments) {
    if (!isRecord(raw)) continue;
    if (raw.id !== environmentId) continue;
    if (typeof raw.uuid !== 'string' || raw.uuid.length === 0) continue;
    return {
      environmentUuid: raw.uuid,
      environmentName:
        typeof raw.name === 'string' ? raw.name : undefined,
      projectUuid: resolvedProjectUuid,
      projectName: resolvedProjectName,
    };
  }

  return undefined;
}
