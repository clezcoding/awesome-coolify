import type { EnvConfig } from '../config/env.js';
import { ManifestManager } from './manifest.js';
import { resolveEnvironmentUuidFromId } from './project-lookup.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function extractManifestContextFromRaw(raw: Record<string, unknown>): {
  projectUuid?: string;
  projectName?: string;
  environmentUuid?: string;
  environmentName?: string;
} {
  const project = raw.project;
  const environment = raw.environment;

  return {
    projectUuid:
      isRecord(project) && typeof project.uuid === 'string'
        ? project.uuid
        : undefined,
    projectName:
      isRecord(project) && typeof project.name === 'string'
        ? project.name
        : undefined,
    environmentUuid:
      isRecord(environment) && typeof environment.uuid === 'string'
        ? environment.uuid
        : undefined,
    environmentName:
      isRecord(environment) && typeof environment.name === 'string'
        ? environment.name
        : undefined,
  };
}

/**
 * Resolve project/environment context for manifest auto-upsert on update.
 * Priority: nested environment → environment_id lookup → existing manifest
 * entry → parsed environment_uuid fallback.
 */
export async function resolveUpdateManifestContext(input: {
  raw: Record<string, unknown>;
  resourceUuid: string;
  env: EnvConfig;
  parsedProjectUuid?: string;
  parsedEnvironmentUuid?: string;
  parsedEnvironmentName?: string;
}): Promise<{
  projectUuid?: string;
  projectName?: string;
  environmentUuid?: string;
  environmentName?: string;
}> {
  const ctx = extractManifestContextFromRaw(input.raw);
  let projectUuid = ctx.projectUuid ?? input.parsedProjectUuid;
  let projectName = ctx.projectName;
  let environmentUuid = ctx.environmentUuid ?? input.parsedEnvironmentUuid;
  let environmentName = ctx.environmentName ?? input.parsedEnvironmentName;

  if (!environmentUuid && typeof input.raw.environment_id === 'number') {
    const resolved = await resolveEnvironmentUuidFromId(
      input.raw.environment_id,
      projectUuid,
      input.env,
    );
    if (resolved) {
      environmentUuid = resolved.environmentUuid;
      environmentName = environmentName ?? resolved.environmentName;
      projectUuid = projectUuid ?? resolved.projectUuid;
      projectName = projectName ?? resolved.projectName;
    }
  }

  if (!environmentUuid) {
    try {
      const fromManifest = ManifestManager.findResourceContext(
        input.resourceUuid,
      );
      if (fromManifest) {
        environmentUuid = fromManifest.environmentUuid;
        environmentName = environmentName ?? fromManifest.environmentName;
        projectUuid = projectUuid ?? fromManifest.projectUuid;
        projectName = projectName ?? fromManifest.projectName;
      }
    } catch {
      /* manifest unavailable — skip cache fallback */
    }
  }

  return {
    projectUuid,
    projectName,
    environmentUuid,
    environmentName,
  };
}
