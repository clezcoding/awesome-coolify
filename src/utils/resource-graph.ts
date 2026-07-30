/**
 * UUID-only dependency graph helpers (Phase 28 GRAPH-01 / D-07 / D-08).
 * Primary edges: database_uuid, application_uuid on flat /resources;
 * service nested applications/databases via GET /services/{uuid}.
 */

export type GraphRelation =
  | 'database_uuid'
  | 'application_uuid'
  | 'service_child';

export type GraphEdge = {
  from_uuid: string;
  from_type: string;
  to_uuid: string;
  to_type: string;
  relation: GraphRelation;
};

export type GraphNode = {
  uuid: string;
  type: string;
  name?: string;
  status?: string;
  project_uuid?: string;
  environment_id?: string;
};

export type GraphDependent = {
  uuid: string;
  type: string;
  depth: number;
};

export type ResourceGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    services_enriched: number;
    service_fetch_errors?: Array<{
      uuid: string;
      code?: string;
      message: string;
    }>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function projectUuid(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (isRecord(value) && typeof value.uuid === 'string') return value.uuid;
  return undefined;
}

/** Child → parent edges from flat `/resources` UUID link fields only. */
export function edgesFromFlatResources(
  resources: unknown[],
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const item of resources) {
    if (!isRecord(item)) continue;
    const childUuid = String(item.uuid ?? '');
    if (!childUuid) continue;
    const childType = String(item.type ?? 'unknown');

    const databaseUuid = item.database_uuid;
    if (typeof databaseUuid === 'string' && databaseUuid.length > 0) {
      edges.push({
        from_uuid: childUuid,
        from_type: childType,
        to_uuid: databaseUuid,
        to_type: 'database',
        relation: 'database_uuid',
      });
    }

    const applicationUuid = item.application_uuid;
    if (typeof applicationUuid === 'string' && applicationUuid.length > 0) {
      edges.push({
        from_uuid: childUuid,
        from_type: childType,
        to_uuid: applicationUuid,
        to_type: 'application',
        relation: 'application_uuid',
      });
    }
  }

  return edges;
}

/** Child → service edges from a fetched service record's nested arrays. */
export function edgesFromServiceRecord(
  serviceUuid: string,
  record: unknown,
): GraphEdge[] {
  if (!isRecord(record)) return [];

  const edges: GraphEdge[] = [];
  const applications = Array.isArray(record.applications)
    ? record.applications
    : [];
  const databases = Array.isArray(record.databases) ? record.databases : [];

  for (const child of applications) {
    if (!isRecord(child)) continue;
    const childUuid = String(child.uuid ?? '');
    if (!childUuid) continue;
    edges.push({
      from_uuid: childUuid,
      from_type:
        child.type != null ? String(child.type) : 'service-application',
      to_uuid: serviceUuid,
      to_type: 'service',
      relation: 'service_child',
    });
  }

  for (const child of databases) {
    if (!isRecord(child)) continue;
    const childUuid = String(child.uuid ?? '');
    if (!childUuid) continue;
    edges.push({
      from_uuid: childUuid,
      from_type:
        child.type != null ? String(child.type) : 'service-database',
      to_uuid: serviceUuid,
      to_type: 'service',
      relation: 'service_child',
    });
  }

  return edges;
}

export function nodesFromResources(resources: unknown[]): GraphNode[] {
  const nodes: GraphNode[] = [];
  const seen = new Set<string>();

  for (const item of resources) {
    if (!isRecord(item)) continue;
    const uuid = String(item.uuid ?? '');
    if (!uuid || seen.has(uuid)) continue;
    seen.add(uuid);

    const projectUuidValue = projectUuid(item.project);
    const environmentId =
      typeof item.environment_id === 'string'
        ? item.environment_id
        : projectUuid(item.environment);

    nodes.push({
      uuid,
      type: String(item.type ?? 'unknown'),
      ...(item.name != null ? { name: String(item.name) } : {}),
      ...(item.status != null ? { status: String(item.status) } : {}),
      ...(projectUuidValue ? { project_uuid: projectUuidValue } : {}),
      ...(environmentId ? { environment_id: environmentId } : {}),
    });
  }

  return nodes;
}

export type EnrichServicesResult = {
  edges: GraphEdge[];
  services_enriched: number;
  service_fetch_errors: Array<{
    uuid: string;
    code?: string;
    message: string;
  }>;
};

const DEFAULT_SERVICE_CONCURRENCY = 5;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!);
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/**
 * Fetch nested service children with bounded concurrency.
 * Soft-fails individual fetchService errors into service_fetch_errors.
 */
export async function enrichServiceEdges(
  serviceUuids: string[],
  fetchServiceFn: (uuid: string) => Promise<unknown>,
  concurrency = DEFAULT_SERVICE_CONCURRENCY,
): Promise<EnrichServicesResult> {
  const unique = [...new Set(serviceUuids.filter(Boolean))];
  const edges: GraphEdge[] = [];
  const service_fetch_errors: EnrichServicesResult['service_fetch_errors'] = [];
  let services_enriched = 0;

  const settled = await mapPool(unique, concurrency, async (uuid) => {
    try {
      const record = await fetchServiceFn(uuid);
      return { uuid, ok: true as const, record };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      const code =
        error &&
        typeof error === 'object' &&
        'envelope' in error &&
        isRecord((error as { envelope: unknown }).envelope)
          ? String(
              ((error as { envelope: Record<string, unknown> }).envelope
                .code as string) ?? '',
            ) || undefined
          : undefined;
      return { uuid, ok: false as const, message, code };
    }
  });

  for (const item of settled) {
    if (item.ok) {
      services_enriched += 1;
      edges.push(...edgesFromServiceRecord(item.uuid, item.record));
    } else {
      service_fetch_errors.push({
        uuid: item.uuid,
        ...(item.code ? { code: item.code } : {}),
        message: item.message,
      });
    }
  }

  return { edges, services_enriched, service_fetch_errors };
}

export function buildGraph(input: {
  resources: unknown[];
  serviceEdges?: GraphEdge[];
  services_enriched?: number;
  service_fetch_errors?: EnrichServicesResult['service_fetch_errors'];
}): ResourceGraph {
  const flatEdges = edgesFromFlatResources(input.resources);
  const serviceEdges = input.serviceEdges ?? [];
  const nodes = nodesFromResources(input.resources);

  // Ensure nested service children appear as nodes when missing from flat list.
  const seen = new Set(nodes.map((n) => n.uuid));
  for (const edge of serviceEdges) {
    if (!seen.has(edge.from_uuid)) {
      seen.add(edge.from_uuid);
      nodes.push({
        uuid: edge.from_uuid,
        type: edge.from_type,
      });
    }
    if (!seen.has(edge.to_uuid)) {
      seen.add(edge.to_uuid);
      nodes.push({
        uuid: edge.to_uuid,
        type: edge.to_type,
      });
    }
  }

  const meta: ResourceGraph['meta'] = {
    services_enriched: input.services_enriched ?? 0,
  };
  if (input.service_fetch_errors && input.service_fetch_errors.length > 0) {
    meta.service_fetch_errors = input.service_fetch_errors;
  }

  return {
    nodes,
    edges: [...flatEdges, ...serviceEdges],
    meta,
  };
}

/**
 * Reverse BFS: edges are child→parent, so dependents of target are nodes
 * with an edge to_uuid === target (and transitive).
 */
export function findDependents(
  edges: GraphEdge[],
  targetUuid: string,
  options: { max_depth?: number } = {},
): {
  direct: GraphDependent[];
  transitive: GraphDependent[];
  depth_cap: number;
  max_depth: number;
} {
  const maxDepth = options.max_depth ?? 3;

  const childrenOf = new Map<string, Array<{ uuid: string; type: string }>>();
  for (const edge of edges) {
    const list = childrenOf.get(edge.to_uuid) ?? [];
    list.push({ uuid: edge.from_uuid, type: edge.from_type });
    childrenOf.set(edge.to_uuid, list);
  }

  const direct: GraphDependent[] = [];
  const transitive: GraphDependent[] = [];
  const visited = new Set<string>([targetUuid]);
  let frontier = [targetUuid];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    depth += 1;
    const next: string[] = [];
    for (const parent of frontier) {
      for (const child of childrenOf.get(parent) ?? []) {
        if (visited.has(child.uuid)) continue;
        visited.add(child.uuid);
        const dep: GraphDependent = {
          uuid: child.uuid,
          type: child.type,
          depth,
        };
        if (depth === 1) {
          direct.push(dep);
        } else {
          transitive.push(dep);
        }
        next.push(child.uuid);
      }
    }
    frontier = next;
  }

  return {
    direct,
    transitive,
    depth_cap: maxDepth,
    max_depth: maxDepth,
  };
}

/** Nodes that appear in no edge (completely isolated). */
export function findOrphans(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  const linked = new Set<string>();
  for (const edge of edges) {
    linked.add(edge.from_uuid);
    linked.add(edge.to_uuid);
  }
  return nodes.filter((node) => !linked.has(node.uuid));
}
