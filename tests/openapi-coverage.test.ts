import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
const SPEC_PATH = resolve(ROOT, 'docs/coolify_openapi.json');
const MAP_PATH = resolve(ROOT, 'docs/coverage-map.yaml');
const COVERAGE_PATH = resolve(ROOT, 'docs/COVERAGE.md');
const CLIENT_PATH = resolve(ROOT, 'src/api/client.ts');
const TOOLS_DIR = resolve(ROOT, 'src/mcp/tools');

describe('indexOpenApiOperations', () => {
  it('returns >=136 operations with METHOD /path keys (OAPI-01, D-01/D-02)', async () => {
    const { indexOpenApiOperations } = await import(
      '../scripts/lib/openapi-coverage-parse.mjs'
    );
    const raw = readFileSync(SPEC_PATH, 'utf8');
    const ops = await indexOpenApiOperations(raw);

    expect(ops.length).toBeGreaterThanOrEqual(136);
    for (const op of ops) {
      expect(op.key).toMatch(/^[A-Z]+ \//);
      expect(op).toHaveProperty('operationId');
      expect(op).toHaveProperty('tags');
    }
  });
});

describe('classifyRows', () => {
  it('assigns covered, deferred, out-of-scope, and gap buckets per D-04', async () => {
    const { classifyRows } = await import(
      '../scripts/lib/openapi-coverage-join.mjs'
    );

    const rows = classifyRows({
      operations: [
        { key: 'GET /applications/{uuid}' },
        { key: 'GET /services/{uuid}/logs' },
        { key: 'POST /unknown/future-endpoint' },
      ],
      map: [
        {
          action: 'application.get',
          openapi: ['GET /applications/{uuid}'],
          client: ['fetchApplication'],
        },
      ],
      overrides: [
        {
          key: 'GET /services/{uuid}/logs',
          bucket: 'deferred',
          reason: 'SVC-04 — Coolify 4.1.x has no service log endpoint',
        },
        {
          action: 'manifest.sync',
          bucket: 'out-of-scope',
          reason: 'Local workspace file only — no Coolify REST op',
        },
      ],
      catalogs: {},
    });

    const byAction = Object.fromEntries(rows.map((r) => [r.action, r.bucket]));

    expect(byAction['application.get']).toBe('covered');
    expect(rows.some((r) => r.bucket === 'deferred')).toBe(true);
    expect(rows.some((r) => r.bucket === 'out-of-scope')).toBe(true);
    expect(rows.some((r) => r.bucket === 'gap')).toBe(true);
  });
});

describe('coverage-map completeness (OAPI-01/OAPI-02)', () => {
  it('lists every *ActionsCatalog action in coverage-map.yaml', async () => {
    const { loadActionsCatalogs } = await import(
      '../scripts/lib/openapi-coverage-join.mjs'
    );
    const catalogs = loadActionsCatalogs(TOOLS_DIR);
    const mapDoc = parseYaml(readFileSync(MAP_PATH, 'utf8'));
    const mapped = new Set((mapDoc?.actions ?? []).map((row: { action: string }) => row.action));

    const missing: string[] = [];
    for (const [tool, actions] of Object.entries(catalogs)) {
      for (const action of actions) {
        const key = `${tool}.${action}`;
        if (!mapped.has(key)) missing.push(key);
      }
    }

    expect(missing, `missing map rows: ${missing.join(', ')}`).toEqual([]);
    expect(mapped.size).toBeGreaterThanOrEqual(100);
  });

  it('maps every openapi key to a dereferenced v4.1.2 operation', async () => {
    const { indexOpenApiOperations } = await import(
      '../scripts/lib/openapi-coverage-parse.mjs'
    );
    const ops = await indexOpenApiOperations(readFileSync(SPEC_PATH, 'utf8'));
    const opKeys = new Set(ops.map((op) => op.key));

    const mapDoc = parseYaml(readFileSync(MAP_PATH, 'utf8'));
    const invalid: string[] = [];
    for (const row of mapDoc?.actions ?? []) {
      for (const key of row.openapi ?? []) {
        if (!opKeys.has(key)) invalid.push(`${row.action}: ${key}`);
      }
    }

    expect(invalid, `unknown openapi keys: ${invalid.join('; ')}`).toEqual([]);
  });

  it('maps every client fn to an export in src/api/client.ts', () => {
    const clientSource = readFileSync(CLIENT_PATH, 'utf8');
    const exports = new Set(
      [...clientSource.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]),
    );
    // alias export
    exports.add('bulkUpdateEnvs');

    const mapDoc = parseYaml(readFileSync(MAP_PATH, 'utf8'));
    const invalid: string[] = [];
    for (const row of mapDoc?.actions ?? []) {
      for (const fn of row.client ?? []) {
        if (!exports.has(fn)) invalid.push(`${row.action}: ${fn}`);
      }
    }

    expect(invalid, `unknown client exports: ${invalid.join('; ')}`).toEqual([]);
  });

  it('defers SVC-04 log endpoints and execute_command without failing as gap', async () => {
    const { classifyRows, loadActionsCatalogs } = await import(
      '../scripts/lib/openapi-coverage-join.mjs'
    );
    const { indexOpenApiOperations } = await import(
      '../scripts/lib/openapi-coverage-parse.mjs'
    );
    const overridesDoc = parseYaml(
      readFileSync(resolve(ROOT, 'docs/coverage-overrides.yaml'), 'utf8'),
    );
    const mapDoc = parseYaml(readFileSync(MAP_PATH, 'utf8'));
    const operations = await indexOpenApiOperations(readFileSync(SPEC_PATH, 'utf8'));
    const overrides = [
      ...(overridesDoc?.overrides ?? []),
      ...(overridesDoc?.action_overrides ?? []),
    ];
    const rows = classifyRows({
      operations,
      map: mapDoc?.actions ?? [],
      overrides,
      catalogs: loadActionsCatalogs(TOOLS_DIR),
    });

    const deferredKeys = rows.filter((r) => r.bucket === 'deferred').map((r) => r.openapi);
    expect(deferredKeys.some((k) => k.includes('logs'))).toBe(true);

    const executeRow = rows.find((r) => r.openapi === 'execute_command' || r.action === 'execute_command');
    if (executeRow) {
      expect(executeRow.bucket).toBe('out-of-scope');
    }
  });
});

describe('assertCoverageFresh', () => {
  it('throws when docs/COVERAGE.md is stale (D-06)', async () => {
    const { assertCoverageFresh } = await import('../scripts/openapi-coverage.mjs');
    const original = readFileSync(COVERAGE_PATH, 'utf8');

    try {
      writeFileSync(COVERAGE_PATH, `${original}\n<!-- stale -->\n`, 'utf8');
      await expect(assertCoverageFresh()).rejects.toThrow(/COVERAGE|stale|missing/i);
    } finally {
      writeFileSync(COVERAGE_PATH, original, 'utf8');
    }
  });
});
