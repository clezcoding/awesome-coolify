import type { FollowUpHint } from './diagnose-hints.js';
import type { Manifest, ManifestResource } from './manifest.js';

export type ManifestAuditFinding = {
  severity: 'critical' | 'high' | 'info';
  kind: string;
  uuid: string;
  resource_type?: 'application' | 'service' | 'database';
  issue: string;
  local?: Record<string, unknown>;
  live?: Record<string, unknown>;
  hint: FollowUpHint;
};

type AuditSeverity = ManifestAuditFinding['severity'] | 'ok';

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  critical: 3,
  high: 2,
  info: 1,
  ok: 0,
};

type IndexedResource = {
  resource: ManifestResource;
  project_uuid: string;
  environment_uuid: string;
};

function indexManifestResources(manifest: Manifest): Map<string, IndexedResource> {
  const index = new Map<string, IndexedResource>();
  for (const project of manifest.projects) {
    for (const environment of project.environments) {
      for (const resource of environment.resources) {
        index.set(resource.uuid, {
          resource,
          project_uuid: project.uuid,
          environment_uuid: environment.uuid,
        });
      }
    }
  }
  return index;
}

function domainsEqual(local: string[], live: string[]): boolean {
  const sortCopy = (domains: string[]) => [...domains].sort();
  const a = sortCopy(local);
  const b = sortCopy(live);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function maxSeverity(a: AuditSeverity, b: AuditSeverity): AuditSeverity {
  return (SEVERITY_RANK[a] ?? -1) >= (SEVERITY_RANK[b] ?? -1) ? a : b;
}

function manifestSyncHint(instance?: string, label?: string): FollowUpHint {
  return {
    tool: 'manifest',
    action: 'sync',
    args: { dry_run: true, ...(instance ? { instance } : {}) },
    label: label ?? 'Preview manifest sync to reconcile cache',
    available_in_phase: 17,
  };
}

function manifestUpsertHint(instance?: string): FollowUpHint {
  return {
    tool: 'manifest',
    action: 'upsert',
    args: instance ? { instance } : {},
    label: 'Add resource to local manifest cache via upsert',
    available_in_phase: 17,
  };
}

function domainUpdateHint(
  uuid: string,
  resourceType: ManifestResource['type'],
): FollowUpHint {
  const tool =
    resourceType === 'application'
      ? 'application'
      : resourceType === 'service'
        ? 'service'
        : 'database';
  return {
    tool,
    action: 'update',
    args: { uuid },
    label: 'Update resource domains to match live state',
    available_in_phase: 10,
  };
}

export function rollupAuditSeverity(
  findings: ManifestAuditFinding[],
): AuditSeverity {
  let highest: AuditSeverity = 'ok';
  for (const finding of findings) {
    highest = maxSeverity(highest, finding.severity);
  }
  return highest;
}

export function buildManifestAuditFindings(
  local: Manifest,
  live: Manifest,
  options?: { instance?: string },
): ManifestAuditFinding[] {
  const instance = options?.instance;
  const localIndex = indexManifestResources(local);
  const liveIndex = indexManifestResources(live);
  const findings: ManifestAuditFinding[] = [];

  for (const [uuid, localEntry] of localIndex) {
    if (!liveIndex.has(uuid)) {
      findings.push({
        severity: 'high',
        kind: 'local_orphan',
        uuid,
        resource_type: localEntry.resource.type,
        issue: 'Resource exists in local manifest but not in live Coolify inventory',
        local: {
          name: localEntry.resource.name,
          type: localEntry.resource.type,
          project_uuid: localEntry.project_uuid,
          environment_uuid: localEntry.environment_uuid,
        },
        hint: manifestSyncHint(
          instance,
          'Preview manifest sync to remove stale local cache entry',
        ),
      });
    }
  }

  for (const [uuid, liveEntry] of liveIndex) {
    if (!localIndex.has(uuid)) {
      findings.push({
        severity: 'info',
        kind: 'remote_only',
        uuid,
        resource_type: liveEntry.resource.type,
        issue: 'Resource exists in live Coolify inventory but not in local manifest',
        live: {
          name: liveEntry.resource.name,
          type: liveEntry.resource.type,
          project_uuid: liveEntry.project_uuid,
          environment_uuid: liveEntry.environment_uuid,
        },
        hint: manifestSyncHint(instance, 'Sync live resource into local manifest cache'),
      });
    }
  }

  for (const [uuid, localEntry] of localIndex) {
    const liveEntry = liveIndex.get(uuid);
    if (!liveEntry) continue;

    if (
      localEntry.project_uuid !== liveEntry.project_uuid ||
      localEntry.environment_uuid !== liveEntry.environment_uuid
    ) {
      findings.push({
        severity: 'critical',
        kind: 'nesting_mismatch',
        uuid,
        resource_type: localEntry.resource.type,
        issue: 'Resource project or environment nesting differs between local manifest and live state',
        local: {
          project_uuid: localEntry.project_uuid,
          environment_uuid: localEntry.environment_uuid,
        },
        live: {
          project_uuid: liveEntry.project_uuid,
          environment_uuid: liveEntry.environment_uuid,
        },
        hint: manifestSyncHint(instance, 'Sync to reconcile project/environment nesting'),
      });
    }

    if (localEntry.resource.type !== liveEntry.resource.type) {
      findings.push({
        severity: 'critical',
        kind: 'type_mismatch',
        uuid,
        resource_type: localEntry.resource.type,
        issue: 'Resource type differs between local manifest and live state',
        local: { type: localEntry.resource.type },
        live: { type: liveEntry.resource.type },
        hint: manifestSyncHint(instance, 'Sync and manually review resource type mismatch'),
      });
    }

    if (localEntry.resource.name !== liveEntry.resource.name) {
      findings.push({
        severity: 'info',
        kind: 'name_drift',
        uuid,
        resource_type: localEntry.resource.type,
        issue: 'Resource name differs between local manifest and live state',
        local: { name: localEntry.resource.name },
        live: { name: liveEntry.resource.name },
        hint: manifestUpsertHint(instance),
      });
    }

    if (!domainsEqual(localEntry.resource.domains, liveEntry.resource.domains)) {
      findings.push({
        severity: 'high',
        kind: 'domain_drift',
        uuid,
        resource_type: localEntry.resource.type,
        issue: 'Resource domains differ between local manifest and live state',
        local: { domains: localEntry.resource.domains },
        live: { domains: liveEntry.resource.domains },
        hint: domainUpdateHint(uuid, localEntry.resource.type),
      });
    }
  }

  return findings;
}
