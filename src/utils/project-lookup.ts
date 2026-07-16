import type { EnvConfig } from '../config/env.js';
import { fetchProjects, fetchProject } from '../api/client.js';

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
