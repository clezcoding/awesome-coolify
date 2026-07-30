/**
 * Wave 0 Nyquist RED scaffolds for Phase 28 resource-graph helpers.
 * resource-graph.ts loaded via dynamic import inside it.fails only —
 * production module ships in Plan 28-01.
 */
import { describe, expect, it } from 'vitest';

describe('edgesFromFlatResources (GRAPH-01, D-07, D-08)', () => {
  it.fails(
    'emits database_uuid + application_uuid edges from flat resources',
    async () => {
      const { edgesFromFlatResources } = await import('./resource-graph.js');

      const edges = edgesFromFlatResources([
        {
          uuid: 'app-uuid-1',
          name: 'api',
          type: 'application',
          database_uuid: 'db-uuid-1',
        },
        {
          uuid: 'child-app',
          name: 'wp-app',
          type: 'application',
          application_uuid: 'app-uuid-1',
        },
        {
          uuid: 'lonely',
          name: 'no-links',
          type: 'application',
        },
      ]);

      expect(edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from_uuid: 'app-uuid-1',
            from_type: 'application',
            to_uuid: 'db-uuid-1',
            to_type: 'database',
            relation: 'database_uuid',
          }),
          expect.objectContaining({
            from_uuid: 'child-app',
            from_type: 'application',
            to_uuid: 'app-uuid-1',
            to_type: 'application',
            relation: 'application_uuid',
          }),
        ]),
      );
      expect(edges.every((e) => e.relation !== 'fuzzy_name')).toBe(true);
      expect(edges).toHaveLength(2);
    },
  );
});

describe('findDependents (GRAPH-02, D-09, D-10)', () => {
  it.fails(
    'returns direct then transitive dependents up to depth cap',
    async () => {
      const { edgesFromFlatResources, findDependents } = await import(
        './resource-graph.js'
      );

      const edges = edgesFromFlatResources([
        {
          uuid: 'app-direct',
          type: 'application',
          database_uuid: 'db-uuid-1',
        },
        {
          uuid: 'app-transitive',
          type: 'application',
          application_uuid: 'app-direct',
        },
      ]);

      const result = findDependents(edges, 'db-uuid-1', { max_depth: 3 });

      expect(result.direct.map((d: { uuid: string }) => d.uuid)).toContain(
        'app-direct',
      );
      expect(result.transitive.map((d: { uuid: string }) => d.uuid)).toContain(
        'app-transitive',
      );
      expect(result.direct.map((d: { uuid: string }) => d.uuid)).not.toContain(
        'app-transitive',
      );
      expect(result.depth_cap ?? result.max_depth).toBe(3);
    },
  );
});
