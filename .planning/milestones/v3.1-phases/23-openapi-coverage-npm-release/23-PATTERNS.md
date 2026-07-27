# Phase 23: OpenAPI Coverage & npm Release - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 15
**Analogs found:** 13 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/openapi-coverage.mjs` | utility (CLI) | transform + file-I/O | `scripts/changeset-emit-new-tag.mjs` | exact |
| `scripts/lib/openapi-coverage-parse.mjs` | utility | transform | `scripts/lib/release-publish-gate.mjs` | exact |
| `scripts/lib/openapi-coverage-join.mjs` | utility | transform | `scripts/lib/release-publish-gate.mjs` | exact |
| `scripts/lib/openapi-coverage-render.mjs` | utility | transform | `scripts/lib/release-publish-gate.mjs` | role-match |
| `docs/OPENAPI.md` | config (provenance doc) | file-I/O | `docs/en/setup.md` | role-match |
| `docs/COVERAGE.md` | config (generated report) | transform output | `.planning/phases/21-deploy-watch/COVERAGE.md` | exact |
| `docs/coverage-overrides.yaml` | config | CRUD (read-merge) | `scripts/live-uat.matrix.json` + `src/utils/yaml-validator.ts` | partial |
| `docs/coverage-map.yaml` | config | CRUD (read-merge) | `scripts/live-uat.matrix.json` + `tests/integration/docs-parity.test.ts` | partial |
| `tests/openapi-coverage.test.ts` | test | transform validation | `tests/release-publish-gate.test.ts` | exact |
| `tests/npm-pack-allowlist.test.ts` | test | file-I/O validation | `tests/release-publish-gate.test.ts` + Phase 18-04 inline pack test | exact |
| `package.json` | config | — | `package.json` (`uat:live`, `changeset:emit-tag`) | exact |
| `.changeset/*.md` (milestone `1.0.0`) | config | — | `scripts/gsd-ensure-changeset.sh` fragment template | exact |
| `docs/coolify_openapi.json` | config (pinned spec) | file-I/O | `docs/coolify_openapi.yaml` (existing) | exact |
| `docs/coolify_openapi.yaml` | config (pinned spec) | file-I/O | existing tracked artifact | exact |
| `.github/workflows/ci.yml` | config | — | existing `ci.yml` (optional; prefer `pnpm test` gate) | role-match |

## Pattern Assignments

### `scripts/openapi-coverage.mjs` (utility CLI, transform + file-I/O)

**Analog:** `scripts/changeset-emit-new-tag.mjs` (main entry + `import.meta.url` root) + `scripts/kill-mcp.mjs` (`--check` / `--dry-run` argv flags)

**Shebang + module root** (kill-mcp.mjs lines 1-17):

```javascript
#!/usr/bin/env node
/**
 * OpenAPI coverage generator — maintainer/CI only; never ships in npm tarball.
 *
 * Usage:
 *   pnpm run openapi:coverage
 *   node scripts/openapi-coverage.mjs --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
```

**Read committed spec via `import.meta.url`** (changeset-emit-new-tag.mjs lines 29-31):

```javascript
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
```

**Drift `--check` pattern** (kill-mcp.mjs lines 17-18 — flag style; combine with write-to-temp + byte-compare per RESEARCH Pattern 4):

```javascript
const dryRun = process.argv.includes('--dry-run');
const inspect = process.argv.includes('--inspect');
```

Planner should: generate to string → if `--check`, compare to `docs/COVERAGE.md` and `process.exit(1)` on mismatch; else write file.

**Exit semantics** (kill-mcp.mjs lines 192-203, 222-224):

```javascript
if (killTargets.length === 0) {
  console.error('[kill-mcp] No awesome-coolify MCP server processes found.');
  process.exit(0);
}
// ...
process.exit(1);
```

Use `process.exit(1)` for stale COVERAGE.md; `console.error` for human messages; stdout only for generated markdown when not checking.

---

### `scripts/lib/openapi-coverage-parse.mjs` (utility, transform)

**Analog:** `scripts/lib/release-publish-gate.mjs` (pure exports, no side effects)

**Pure export module** (release-publish-gate.mjs lines 1-21):

```javascript
/**
 * Gate for changesets/action ↔ custom publish script.
 */
export function shouldAnnounceNewTag({ onNpm }) {
  return onNpm !== true;
}

export function npmHasVersion(name, version, run) {
  try {
    const out = run(`npm view ${name}@${version} version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return out === version;
  } catch {
    return false;
  }
}
```

**YAML read pattern** (yaml-validator.ts lines 1-33 — use `parse` from `yaml` for overrides/map ingest only; OpenAPI `$ref` via Scalar):

```typescript
import { parse } from 'yaml';

export function validateCompose(
  yaml: string,
): { ok: true } | { ok: false; error: string } {
  if (yaml.trim() === '') {
    return { ok: false, error: 'compose YAML is empty' };
  }
  try {
    parse(yaml);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
```

**OpenAPI enumeration** (RESEARCH Pattern 1 — new dep, no codebase analog):

```javascript
import { readFileSync } from 'node:fs';
import { dereference } from '@scalar/openapi-parser';

const raw = readFileSync('docs/coolify_openapi.json', 'utf8');
const { schema, errors } = await dereference(raw);
if (errors?.length) throw new Error(`OpenAPI dereference failed: ${errors.length} errors`);
```

Export `indexOpenApiOperations(schema)` returning `{ key: 'METHOD /path', operationId, tags }[]`.

---

### `scripts/lib/openapi-coverage-join.mjs` (utility, transform)

**Analog:** `scripts/lib/release-publish-gate.mjs` + `tests/integration/docs-parity.test.ts` (action inventory)

**Action inventory source** (docs-parity.test.ts lines 36-53 — mirror for validation; generator should parse `*ActionsCatalog` from disk):

```typescript
const TOOL_ACTIONS: Record<string, readonly string[]> = {
  system: ['health', 'version', 'verify', 'infrastructure_overview'],
  meta: ['version'],
  resource: ['list', 'find'],
  diagnose: ['app', 'server', 'scan'],
  application: ['start', 'stop', 'restart', 'deploy', 'logs', 'get'],
  deployment: ['list', 'get', 'cancel'],
  service: ['start', 'stop', 'restart', 'deploy', 'get'],
  database: ['start', 'stop', 'restart', 'get'],
  // ...
};
```

**Catalog literal format** (service.ts lines 262-263):

```typescript
export const serviceActionsCatalog =
  'Actions: get(uuid, format?, projection?, reveal?) · list-types(format?, projection?) · create(server_uuid, type?, compose?) · update(uuid) · delete(uuid, confirm) · delete_preview(uuid) · start(uuid) · stop(uuid) · restart(uuid) · deploy(uuid) · envs:list(uuid) · envs:get(uuid, key) · envs:create(uuid, key, value) · envs:update(uuid, key, value) · envs:delete(uuid, env_uuid, confirm) · envs:bulk-update(uuid, entries, confirm)';
```

**Client layer exports** (client.ts lines 65-128 — grep `^export (async )?function` for map key validation):

```typescript
export function createAuthenticatedFetch(token: string, verifySsl = true) {
  // ...
}

export async function fetchHealth(
  // ...
```

Join module exports `classifyRows({ operations, map, overrides, catalogs })` → rows with bucket `covered|deferred|out-of-scope|gap`.

---

### `scripts/lib/openapi-coverage-render.mjs` (utility, transform)

**Analog:** `.planning/phases/21-deploy-watch/COVERAGE.md` (table + summary header)

**Report header + capability table** (21-deploy-watch/COVERAGE.md lines 1-24):

```markdown
# API Coverage — Phase 21 Deploy Watch

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Capability surface

| capability | decision | reason |
|---|---|---|
| `deployment.watch` action on existing `deployment` tool | INTEGRATE | WATCH-01; D-01 |
```

Phase 23 `docs/COVERAGE.md` should use: title `# OpenAPI Coverage — awesome-coolify-mcp`, summary counts (four buckets), per-action table columns: `tool.action` | `client` | `openapi` | `bucket` | `reason`.

---

### `docs/OPENAPI.md` (provenance doc)

**Analog:** `docs/en/setup.md` (English prose, tables, fenced commands)

**Doc structure** (setup.md lines 1-27):

```markdown
# Setup Guide

Use the MCP **`setup` tool** to onboard a workspace — ...

---

## Overview

The `setup` tool orchestrates:
```

**Required sections for OPENAPI.md:** upstream URL (`https://raw.githubusercontent.com/coollabsio/coolify/v4.1.2/openapi.yaml`), pinned tag `v4.1.2`, fetch date, operation count, refresh steps (`curl` + JSON convert), link to `docs/coolify_openapi.{yaml,json}`.

**Pin convention** (spike 001 README lines 48-54):

```bash
curl -fsSL https://raw.githubusercontent.com/coollabsio/coolify/v4.x/openapi.yaml
```

Replace `v4.x` with exact `v4.1.2` per D-08/D-09.

---

### `docs/COVERAGE.md` (generated report)

**Analog:** `.planning/phases/21-deploy-watch/COVERAGE.md`

Copy: committed markdown, table-first, explicit opt-out reasons, footer timestamp. Do **not** copy phase-scoped title — use repo-level title. Generator owns body; humans only edit via `coverage-map.yaml` / `coverage-overrides.yaml`.

---

### `docs/coverage-overrides.yaml` (config)

**Analog:** No YAML config files in repo — partial match `scripts/live-uat.matrix.json` (declarative data) + `yaml-validator.ts` (parse)

**Declarative matrix pattern** (live-uat.mjs line 14):

```javascript
const matrixPath = resolve(root, 'scripts/live-uat.matrix.json');
```

**Recommended schema** (RESEARCH Pattern 3):

```yaml
overrides:
  - key: "GET /services/{uuid}/logs"
    bucket: deferred
    reason: "SVC-04 — Coolify 4.1.x has no service log endpoint"
action_overrides:
  - action: manifest.sync
    bucket: out-of-scope
    reason: "Local workspace file only — no Coolify REST op"
```

Seed: SVC-04 logs, `execute_command`, non-REST tools (`manifest.*`, `docs.search`, `setup.*`, `recipe.*`, `instance.*`, `meta.version`).

---

### `docs/coverage-map.yaml` (config)

**Analog:** `tests/integration/docs-parity.test.ts` `TOOL_ACTIONS` + explicit client fn names from `src/api/client.ts`

**Join shape** (RESEARCH — single file discretion):

```yaml
actions:
  - action: service.deploy
    client: [triggerServiceDeploy]  # or actual export name
    openapi: ["POST /services/{uuid}/deploy"]
```

Test guard: every `*ActionsCatalog` action appears; every `openapi` key exists in dereferenced spec; every `client` export exists in `client.ts`.

---

### `tests/openapi-coverage.test.ts` (test)

**Analog:** `tests/release-publish-gate.test.ts`

**Import `.mjs` from tests** (release-publish-gate.test.ts lines 1-15):

```typescript
import { describe, expect, it } from 'vitest';
import {
  npmHasVersion,
  shouldAnnounceNewTag,
} from '../scripts/lib/release-publish-gate.mjs';

describe('shouldAnnounceNewTag', () => {
  it('announces when version is not on npm', () => {
    expect(shouldAnnounceNewTag({ onNpm: false })).toBe(true);
  });
});
```

**Test cases to mirror:**
- `indexOpenApiOperations` returns 136 ops (or current count)
- join classifies known `covered` / `deferred` / `out-of-scope` rows
- `--check` / `assertCoverageFresh()` throws on stale `docs/COVERAGE.md`
- every catalog action in map (grep `src/mcp/tools/*.ts` like `server.test.ts` lines 10-12)

**Vitest config** (vitest.config.ts lines 3-7):

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
```

Place at `tests/openapi-coverage.test.ts` — included by default.

---

### `tests/npm-pack-allowlist.test.ts` (test)

**Analog:** Phase 18-04 PLAN Task 1 automated verify + `tests/release-publish-gate.test.ts`

**Pack JSON inspection** (18-04-PLAN.md lines 72-73):

```javascript
const r=spawnSync('npm',['pack','--dry-run','--json'],{encoding:'utf8'});
const files=JSON.parse(r.stdout)[0].files.map(f=>f.path);
const bad=files.filter(f=>f.includes('scripts/live-uat'));
```

**Forbidden prefixes** (RESEARCH Pattern 5):

```javascript
import { execFileSync } from 'node:child_process';

const json = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' }));
const paths = json[0].files.map((f) => f.path);
const forbidden = [/^scripts\//, /^tests\//, /^\.planning\//, /^\.github\//, /^skills\//, /^docs\/coolify_openapi/];
```

Run `pnpm run build` in `beforeAll`. Assert README/LICENSE allowed; forbidden absent. Complements existing `pnpm run publint` in ci.yml line 40-41.

---

### `package.json` (config)

**Analog:** existing `package.json` scripts block

**Script alias pattern** (package.json lines 9-24):

```json
"scripts": {
  "build": "tsup",
  "changeset:emit-tag": "node scripts/changeset-emit-new-tag.mjs",
  "publint": "publint",
  "uat:live": "node scripts/live-uat.mjs"
}
```

Add: `"openapi:coverage": "node scripts/openapi-coverage.mjs"`. DevDeps: `@scalar/openapi-parser`, `@scalar/openapi-types` (after human-verify checkpoint per RESEARCH).

**Files allowlist — do not expand** (package.json lines 26-30):

```json
"files": [
  "dist",
  ".env.example",
  "LICENSE"
]
```

---

### `.changeset/*.md` (milestone `1.0.0`)

**Analog:** `scripts/gsd-ensure-changeset.sh` fragment template (lines 135-138)

```markdown
---
"awesome-coolify-mcp": major
---

v3.1 milestone: OpenAPI coverage map, committed gap report, npm 1.0.0.
```

Use `major` bump `0.5.0` → `1.0.0` per D-10. Create on milestone-close chore PR only (CONTRIBUTING.md § Milestone npm release); not on routine phase ships.

---

### `docs/coolify_openapi.json` / `docs/coolify_openapi.yaml` (modify/verify)

**Analog:** existing tracked files at repo root `docs/`

Current JSON has `"info": { "version": "0.1" }` — no v4.1.2 marker. Refresh from `v4.1.2` tag per D-08; keep both formats (D-07). Provenance lives in `docs/OPENAPI.md`, not embedded in spec.

---

### `.github/workflows/ci.yml` (optional modify)

**Analog:** existing `ci.yml` — RESEARCH recommends wiring drift via `pnpm test` instead of new workflow step

**Current required job** (ci.yml lines 14-41):

```yaml
  lint-test-build:
    name: Lint, Test & Build
    runs-on: ubuntu-latest
    steps:
      # ...
      - name: Tests
        run: pnpm test

      - name: publint
        run: pnpm run publint
```

If coverage `--check` lives in Vitest, no ci.yml change needed (D-06 satisfied by required `Lint, Test & Build`). Optional dedicated step only if not in test suite.

---

## Shared Patterns

### ESM maintainer scripts (`scripts/*.mjs`)

**Source:** `scripts/changeset-emit-new-tag.mjs`, `scripts/kill-mcp.mjs`
**Apply to:** all `scripts/openapi-coverage*.mjs`

```javascript
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

No `require()`; `"type": "module"` in package.json.

### Pure `scripts/lib/*.mjs` exports + Vitest import

**Source:** `scripts/lib/release-publish-gate.mjs` + `tests/release-publish-gate.test.ts`
**Apply to:** parse/join/render modules + both new test files

Keep CLI thin; test lib functions directly via `import from '../scripts/lib/...mjs'`.

### MCP action literals (`*ActionsCatalog`)

**Source:** `src/mcp/tools/service.ts` lines 262-263; `src/mcp/server.ts` imports all catalogs
**Apply to:** join layer, `coverage-map.yaml` validation, COVERAGE row keys

Row key = `tool.action` (e.g. `service.deploy`). Multi-action tools: one row per catalog action (D-02).

### REST client as layer 2

**Source:** `src/api/client.ts`
**Apply to:** `coverage-map.yaml` client column

All HTTP centralized here (~50 unique paths). Map explicit fn names; do not AST-trace handlers (RESEARCH Pitfall 2/3).

### Milestone release (verify only)

**Source:** `.github/workflows/release.yml` lines 9-72
**Apply to:** PUB-01 verification; **no changes** unless blocker (D-12)

```yaml
permissions:
  contents: write
  pull-requests: write
  id-token: write # OIDC npm publish
```

```yaml
      - name: Changesets
        uses: changesets/action@v1.9.0
        with:
          version: pnpm run version
          publish: pnpm run changeset:emit-tag
          createGithubReleases: false
```

Publish idempotency: `scripts/changeset-emit-new-tag.mjs` + `release-publish-gate.mjs`.

### Tarball surface gate

**Source:** `package.json` `files` + Phase 18-04 pack verify
**Apply to:** `tests/npm-pack-allowlist.test.ts`

Forbidden paths absent; `dist`, `.env.example`, `LICENSE`, README always present. `publint` supplementary only (D-14).

### Committed-doc drift enforcement

**Source:** RESEARCH Pattern 4; husky-green CI via `pnpm test`
**Apply to:** `docs/COVERAGE.md`

Regenerate → byte-compare → exit 1. Same spirit as format/lint drift; not CI-only artifact (D-03).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|-------------|
| `docs/coverage-overrides.yaml` | config | CRUD | No versioned YAML config in repo; use `live-uat.matrix.json` + `yaml` parse patterns |
| `docs/coverage-map.yaml` | config | CRUD | No join-map YAML precedent; `docs-parity.test.ts` TOOL_ACTIONS is closest inventory |

Planner should use RESEARCH.md Patterns 2–3 for schema; validate with Vitest.

## Metadata

**Analog search scope:** `scripts/`, `scripts/lib/`, `tests/`, `tests/integration/`, `docs/`, `.github/workflows/`, `src/mcp/tools/`, `src/api/`, `.planning/phases/*/COVERAGE.md`
**Files scanned:** ~35
**Pattern extraction date:** 2026-07-27
