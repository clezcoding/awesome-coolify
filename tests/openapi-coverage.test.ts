import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SPEC_PATH = resolve(import.meta.dirname, '../docs/coolify_openapi.json');
const COVERAGE_PATH = resolve(import.meta.dirname, '../docs/COVERAGE.md');

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
