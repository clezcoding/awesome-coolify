import {
  generateHints,
  type FollowUpHint,
  type HintResourceType,
} from './diagnose-hints.js';
import { isDatabaseRawType } from './projections.js';

export interface ScanIssue {
  resource_type: 'application' | 'database' | 'service' | 'server';
  uuid: string;
  name: string;
  status: string;
  issue: string;
  hint: FollowUpHint;
}

export interface ClassifiedIssues {
  critical: ScanIssue[];
  high: ScanIssue[];
  info: ScanIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function statusStartsWith(value: unknown, prefix: string): boolean {
  return typeof value === 'string' && value.startsWith(prefix);
}

function statusIncludes(value: unknown, substring: string): boolean {
  return typeof value === 'string' && value.includes(substring);
}

function toResourceType(
  type: unknown,
): 'application' | 'database' | 'service' | null {
  if (type === 'application' || type === 'service') {
    return type;
  }
  if (typeof type === 'string' && isDatabaseRawType(type)) {
    return 'database';
  }
  return null;
}

export function classifyIssues(
  servers: unknown[],
  resources: unknown[],
): ClassifiedIssues {
  const critical: ScanIssue[] = [];
  const high: ScanIssue[] = [];
  const info: ScanIssue[] = [];

  for (const raw of servers) {
    if (!isRecord(raw)) continue;
    const reachable = (raw.settings as { is_reachable?: boolean } | undefined)
      ?.is_reachable;
    if (reachable === false) {
      const uuid = String(raw.uuid ?? raw.id ?? '');
      const name = String(raw.name ?? '');
      const hints = generateHints('server', uuid, 'unreachable');
      critical.push({
        resource_type: 'server',
        uuid,
        name,
        status: 'unreachable',
        issue: 'Server unreachable',
        hint: hints[0],
      });
    }
  }

  for (const raw of resources) {
    if (!isRecord(raw)) continue;
    const resourceType = toResourceType(raw.type);
    if (!resourceType) continue;

    const uuid = String(raw.uuid ?? raw.id ?? '');
    const name = String(raw.name ?? '');
    const status = String(raw.status ?? 'unknown');
    const health = raw.health !== undefined ? String(raw.health) : undefined;

    if (statusIncludes(status, 'unhealthy')) {
      const hints = generateHints(
        resourceType as HintResourceType,
        uuid,
        status,
        health,
      );
      high.push({
        resource_type: resourceType,
        uuid,
        name,
        status,
        issue: `${resourceType} unhealthy`,
        hint: hints[0],
      });
    } else if (
      statusStartsWith(status, 'exited') ||
      statusStartsWith(status, 'stopped')
    ) {
      const hints = generateHints(
        resourceType as HintResourceType,
        uuid,
        status,
        health,
      );
      info.push({
        resource_type: resourceType,
        uuid,
        name,
        status,
        issue: `${resourceType} stopped`,
        hint: hints[0],
      });
    }
  }

  return { critical, high, info };
}
