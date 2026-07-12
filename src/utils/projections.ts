export interface ResourceSummary {
  uuid: string;
  name: string;
  type: 'application' | 'database' | 'service';
  status: string;
  health: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  updated_at: string;
}

export interface ApplicationSummary {
  uuid: string;
  name: string;
  status: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  project_uuid: string;
  server_uuid: string;
  destination_uuid: string;
  updated_at: string;
}

export interface ServiceSummary {
  uuid: string;
  name: string;
  status: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  project_uuid: string;
  server_uuid: string;
  updated_at: string;
}

export interface DatabaseSummary {
  uuid: string;
  name: string;
  status: string;
  type: string;
  project_name: string;
  server_name: string;
  project_uuid: string;
  server_uuid: string;
  updated_at: string;
}

export type ProjectionMode = 'summary' | 'full';

const SECRET_KEY_PATTERN = /password|token|secret|private|env/i;

export function projectResourceSummary(raw: Record<string, unknown>): ResourceSummary {
  const status = String(raw.status ?? 'unknown');
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    type: (raw.type as ResourceSummary['type']) || 'application',
    status,
    health: String(raw.health ?? raw.status_detail ?? status),
    fqdn: (raw.fqdn as string | null) ?? (raw.domain as string | null) ?? null,
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectApplicationSummary(raw: Record<string, unknown>): ApplicationSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? 'unknown'),
    fqdn: (raw.fqdn as string | null) ?? null,
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    project_uuid: (raw.project as { uuid?: string } | undefined)?.uuid ?? '',
    server_uuid: (raw.server as { uuid?: string } | undefined)?.uuid ?? '',
    destination_uuid: (raw.destination as { uuid?: string } | undefined)?.uuid ?? '',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectServiceSummary(raw: Record<string, unknown>): ServiceSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? 'unknown'),
    fqdn: (raw.fqdn as string | null) ?? null,
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    project_uuid: (raw.project as { uuid?: string } | undefined)?.uuid ?? '',
    server_uuid: (raw.server as { uuid?: string } | undefined)?.uuid ?? '',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectDatabaseSummary(raw: Record<string, unknown>): DatabaseSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? 'unknown'),
    type: String(raw.type ?? 'database'),
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    project_uuid: (raw.project as { uuid?: string } | undefined)?.uuid ?? '',
    server_uuid: (raw.server as { uuid?: string } | undefined)?.uuid ?? '',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function sanitizeFullProjection(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const clone = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;

  const maskSecrets = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        maskSecrets(value as Record<string, unknown>);
      } else if (SECRET_KEY_PATTERN.test(key) && typeof value === 'string') {
        obj[key] = '***';
      }
    }
  };

  maskSecrets(clone);
  return clone;
}

export function resolveProjection(
  projection?: ProjectionMode,
  includeFull?: boolean,
): ProjectionMode {
  if (includeFull === true || projection === 'full') {
    return 'full';
  }
  return 'summary';
}
