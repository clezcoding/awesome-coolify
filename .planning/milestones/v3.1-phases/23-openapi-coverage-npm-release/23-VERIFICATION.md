---
phase: 23-openapi-coverage-npm-release
verified: 2026-07-27T02:38:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 23: OpenAPI Coverage & npm Release Verification Report

**Phase Goal:** Coverage map (Coolify OpenAPI → MCP surface/gaps) + maintainer OIDC Release publish  
**Verified:** 2026-07-27T02:38:00Z  
**Status:** passed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Maintainer runs coverage tooling mapping Coolify OpenAPI paths/ops to MCP/client surface (OAPI-01, SC1) | ✓ VERIFIED | `package.json` script `openapi:coverage` → `scripts/openapi-coverage.mjs`; Scalar `dereference()` in `scripts/lib/openapi-coverage-parse.mjs`; 3-layer join in `openapi-coverage-join.mjs`; `pnpm run openapi:coverage -- --check` exit 0 |
| 2 | Coverage tooling produces committed gap report with four buckets (OAPI-02, SC2, D-03/D-04) | ✓ VERIFIED | `docs/COVERAGE.md` committed with summary counts (covered 85, deferred 2, out-of-scope 31, gap 57) and full per-action table; `docs/coverage-map.yaml` (100 actions); `docs/coverage-overrides.yaml` |
| 3 | CI blocks stale `docs/COVERAGE.md` relative to generator (D-06) | ✓ VERIFIED | `assertCoverageFresh()` in `scripts/openapi-coverage.mjs` byte-compares output; vitest `assertCoverageFresh` test corrupts file and expects throw; runs in required CI via `pnpm test` (`.github/workflows/ci.yml`) |
| 4 | OpenAPI spec pinned to Coolify v4.1.2 with provenance doc (D-07/D-08/D-09) | ✓ VERIFIED | `docs/OPENAPI.md` documents upstream URL, tag `v4.1.2`, fetch date 2026-07-27, 136 ops; `docs/coolify_openapi.yaml` + `.json` tracked; vitest confirms ≥136 dereferenced ops |
| 5 | Full coverage-map lists every `*ActionsCatalog` action (OAPI-01) | ✓ VERIFIED | `tests/openapi-coverage.test.ts` map completeness test passes; `rg -c '^  - action:' docs/coverage-map.yaml` → 100; openapi keys validated against spec; client fns validated against `src/api/client.ts` |
| 6 | Published tarball excludes UAT harness, secrets, non-package paths (PUB-02, SC4, D-13) | ✓ VERIFIED | `tests/npm-pack-allowlist.test.ts` GREEN: `FORBIDDEN_PREFIXES` rejects `scripts/`, `tests/`, `.planning/`, `.github/`, `skills/`, `.cursor/`, `docs/coolify_openapi*`, `docs/COVERAGE*`; asserts `dist/`, `LICENSE`, `.env.example`, README present; no `.env` |
| 7 | Milestone Changeset major bump to `awesome-coolify-mcp@1.0.0` ready (PUB-01, D-10) | ✓ VERIFIED | `.changeset/v31-milestone-1-0-0.md` exists with `"awesome-coolify-mcp": major` and v3.1 milestone body; per human scope: actual npm publish occurs post-merge via Version Packages → `release.yml` (not required at phase verify time) |
| 8 | Release OIDC path unchanged; existing trusted-publishing contract (PUB-01, D-11/D-12, SC3) | ✓ VERIFIED | `.github/workflows/release.yml` has `id-token: write` and `publish: pnpm run changeset:emit-tag`; `tests/release-publish-gate.test.ts` passes; `CONTRIBUTING.md` trusted-publisher checklist added; no `release.yml` diff in phase commits; legacy `publish.yml` pre-existed (not created in Phase 23) |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `scripts/openapi-coverage.mjs` | CLI generate + `--check` | ✓ VERIFIED | Wired to parse/join/render libs; exports `assertCoverageFresh` |
| `scripts/lib/openapi-coverage-parse.mjs` | Scalar dereference index | ✓ VERIFIED | `indexOpenApiOperations()` uses `@scalar/openapi-parser` |
| `scripts/lib/openapi-coverage-join.mjs` | 3-layer join + 4 buckets | ✓ VERIFIED | `classifyRows`, `loadActionsCatalogs`; override merge from YAML |
| `scripts/lib/openapi-coverage-render.mjs` | Markdown report | ✓ VERIFIED | Used by CLI; produces committed `docs/COVERAGE.md` shape |
| `docs/COVERAGE.md` | Committed gap report | ✓ VERIFIED | 198 lines; summary + full table; `--check` passes |
| `docs/coverage-map.yaml` | Full action map | ✓ VERIFIED | 100 actions; completeness test passes |
| `docs/coverage-overrides.yaml` | Deferred/out-of-scope seeds | ✓ VERIFIED | SVC-04 logs deferred; `execute_command` out-of-scope; `action_overrides` for non-REST tools |
| `docs/OPENAPI.md` | Provenance doc | ✓ VERIFIED | v4.1.2 pin, refresh procedure, operation count |
| `docs/coolify_openapi.json` / `.yaml` | Pinned spec artifacts | ✓ VERIFIED | Tracked; canonical Coolify API specs per human clarification |
| `tests/openapi-coverage.test.ts` | Coverage guards | ✓ VERIFIED | 7 tests GREEN; zero `it.fails` |
| `tests/npm-pack-allowlist.test.ts` | Pack surface gate | ✓ VERIFIED | 2 tests GREEN; `getPackPaths()` + `FORBIDDEN_PREFIXES` |
| `.changeset/v31-milestone-1-0-0.md` | Milestone semver fragment | ✓ VERIFIED | Major bump for Version Packages flow |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `openapi-coverage.mjs` | `docs/COVERAGE.md` | generate + byte-compare `--check` | ✓ WIRED | Default writes file; `--check` compares regenerated markdown |
| `openapi-coverage-parse.mjs` | `docs/coolify_openapi.json` | `readFileSync` + `dereference()` | ✓ WIRED | ≥136 operations indexed |
| `openapi-coverage-join.mjs` | `coverage-map.yaml` + `coverage-overrides.yaml` | yaml parse + `classifyRows` | ✓ WIRED | Overrides merge into bucket assignment |
| `coverage-map.yaml` | `src/mcp/tools/*ActionsCatalog` | vitest completeness test | ✓ WIRED | All catalog actions mapped |
| `coverage-map.yaml` | `src/api/client.ts` | client column → export names | ✓ WIRED | Vitest validates every client fn |
| `tests/npm-pack-allowlist.test.ts` | `package.json` `files` | `npm pack --dry-run --json` | ✓ WIRED | Forbidden paths absent from tarball |
| `.changeset/v31-milestone-1-0-0.md` | `release.yml` | Changesets → Version Packages → OIDC publish | ✓ WIRED | Documented in CONTRIBUTING; gate tests pass |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `docs/COVERAGE.md` | per-action rows | `classifyRows()` over live spec + map + catalogs | Yes — 175 rows from real OpenAPI + MCP inventory | ✓ FLOWING |
| `tests/npm-pack-allowlist.test.ts` | `paths[]` | `npm pack --dry-run --json` after `pnpm run build` | Yes — real tarball file list from built `dist/` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| COVERAGE drift gate | `pnpm run openapi:coverage -- --check` | exit 0 | ✓ PASS |
| OpenAPI coverage tests | `pnpm test tests/openapi-coverage.test.ts` | 7 passed | ✓ PASS |
| npm pack allowlist | `pnpm test tests/npm-pack-allowlist.test.ts` | 2 passed (includes build) | ✓ PASS |
| Release publish gate | `pnpm test tests/release-publish-gate.test.ts` | 5 passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared probes or migration probe scripts.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| OAPI-01 | 23-00, 23-01, 23-02 | Maintainer runs coverage tooling mapping OpenAPI → MCP/client | ✓ SATISFIED | `pnpm run openapi:coverage`; full `coverage-map.yaml`; parse/join/render pipeline |
| OAPI-02 | 23-00, 23-01, 23-02 | Gap report as committed artifact and/or CI output | ✓ SATISFIED | `docs/COVERAGE.md`; drift enforced in vitest + `--check` CLI |
| PUB-01 | 23-04 | OIDC Release publishes to npm (scoped: changeset + verified path) | ✓ SATISFIED | `.changeset/v31-milestone-1-0-0.md`; `release.yml` OIDC contract; CONTRIBUTING checklist; Trusted Publisher approved at Plan 23-04 human checkpoint (documented in `23-04-SUMMARY.md`) |
| PUB-02 | 23-00, 23-03 | Tarball excludes UAT harness, secrets, non-package paths | ✓ SATISFIED | `tests/npm-pack-allowlist.test.ts` in CI test suite |

No orphaned requirement IDs — all four Phase 23 IDs appear in plan frontmatter and are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | None in phase-delivered files | — | — |

Scanned phase key files for `TBD`/`FIXME`/`XXX`/`PLACEHOLDER`/stub returns — none found.

### Execution Checkpoints (informational)

These were satisfied during plan execution but are not re-verifiable from git alone:

- **Plan 23-01:** Human approved `@scalar/openapi-parser` install (`23-01-SUMMARY.md`)
- **Plan 23-04:** Human approved npm Trusted Publisher for `release.yml` / `clezcoding/awesome-coolify` (`23-04-SUMMARY.md`)
- **Plan 23-04:** Decision checkpoint `ship-1-0-0` selected

Per human verification scope: **1.0.0 on npm registry is NOT required** at phase verify time — publish follows Version Packages merge.

### Gaps Summary

None. Phase goal achieved in codebase. Post-merge maintainer action (outside phase boundary): merge Version Packages PR and confirm OIDC publish succeeds on npm registry.

---

_Verified: 2026-07-27T02:38:00Z_  
_Verifier: Claude (gsd-verifier)_
