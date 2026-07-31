---
phase: 29-drift-heal
verified: 2026-07-30T03:27:00Z
status: passed
score: 18/18 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 29: Drift & Heal Verification Report

**Phase Goal:** Agent can detect configuration drift between local manifest and live state and receive actionable remediation guidance
**Verified:** 2026-07-30T03:27:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Agent runs manifest audit comparing local `.coolify/manifest.json` vs live Coolify state with remediation steps (ROADMAP SC1, DRIFT-01) | ✓ VERIFIED | `manifest.audit` handler in `src/mcp/tools/manifest.ts:626-673`; `buildManifestAuditFindings` in `src/utils/manifest-audit.ts:106-224`; 9 passing audit tests |
| 2 | Agent compares environment variables across environments and receives promotion suggestions via `env.promote` / `envs:promote` (ROADMAP SC2, DRIFT-02) | ✓ VERIFIED | `handleApplicationEnvsPromote` in `src/mcp/tools/application.ts:3242-3368`; preview buckets `only_in_source`, `only_in_target`, `value_mismatches`; 9 passing promote tests |
| 3 | Audit and drift results include concrete fix hints, not raw diff only (ROADMAP SC3, DRIFT-03) | ✓ VERIFIED | `findings[].hint: FollowUpHint` in `manifest-audit.ts`; `promotion_suggestions[].hint` in `application.ts:3161-3180`; tests assert `expectFollowUpHint` / `expectPromoteFollowUpHint` |
| 4 | `manifest.audit` returns severity-tagged findings (`critical` \| `high` \| `info`) with FollowUpHint remediation objects | ✓ VERIFIED | `ManifestAuditFinding` type `manifest-audit.ts:4-13`; test `returns findings[] with severity...` |
| 5 | `manifest.diff` remains raw structural report; audit is separate envelope (D-03) | ✓ VERIFIED | `diff` case returns `{ diff: report }` only; audit returns `{ findings, summary, diff_support }`; test `audit returns findings envelope separate from manifest.diff` |
| 6 | Audit compares resource presence by UUID, type, name, domains, and project/environment nesting (D-04) | ✓ VERIFIED | Finding kinds: `local_orphan`, `remote_only`, `nesting_mismatch`, `type_mismatch`, `name_drift`, `domain_drift`; dedicated tests for domain/nesting/type |
| 7 | `manifest.audit` is advisory-only — never mutates manifest or live state (D-06, D-16) | ✓ VERIFIED | Audit handler only reads + returns; spy test confirms `ManifestManager.save`/`upsert` never called |
| 8 | Missing local manifest returns structured error with `manifest.sync`/`manifest.upsert` recovery hints (D-07) | ✓ VERIFIED | `ManifestManager.exists()` guard `manifest.ts:640-648`; test asserts `COOLIFY_VALIDATION_ERROR` + recovery hints |
| 9 | Audit without credentials returns `COOLIFY_NO_INSTANCE` with recovery hints (D-07, D-12) | ✓ VERIFIED | Credential resolution mirrors `diff`; test with `emptyEnv` |
| 10 | Audit returns soft partials when one live fetch fails while keeping sibling findings (D-06, D-13) | ✓ VERIFIED | `fetchLiveManifestSnapshot` with `softPartial: true` uses `Promise.allSettled` `manifest.ts:269-294`; test with `rejectProjects: true` |
| 11 | `envs:promote` defaults to preview (`dry_run: true`) and requires `confirm: true` to apply (D-09, D-16) | ✓ VERIFIED | `dryRun = parsed.dry_run !== false` `application.ts:3248`; `validateEnvMutationConfirm` on apply; tests for default dry_run and confirm gate |
| 12 | Preview masks env values by default (T-29-01, D-08) | ✓ VERIFIED | `maskPromoteValue` / `maskEnvRecord`; test asserts secret not in JSON output |
| 13 | Apply defaults `conflict_policy` to `keep_remote` — mismatches not clobbered unless opted in (D-10) | ✓ VERIFIED | `policy = parsed.conflict_policy ?? 'keep_remote'` `application.ts:3294`; tests for keep_remote, overwrite, abort |
| 14 | Promote scoped to one Coolify instance per call with explicit `source_uuid` and `target_uuid` (D-11, D-12) | ✓ VERIFIED | Schema requires both UUIDs; `fetchEnvs` called for both; no cross-instance routing |
| 15 | `system.version` exposes `manifest_audit` and `envs_promote` capability keys (D-15) | ✓ VERIFIED | `src/mcp/capabilities.ts:57-66`; `system.test.ts` asserts 13 keys including both |
| 16 | `docs/COVERAGE.md` records audit and promote as MCP composites over existing APIs, not new REST endpoints (D-14) | ✓ VERIFIED | Rows at `docs/COVERAGE.md:40,100`; `docs/coverage-map.yaml:55,233` |
| 17 | README EN and DE document `manifest.audit`, `env.promote` naming, safety defaults, remediation hints (D-15) | ✓ VERIFIED | `README.md` and `README.de.md` sections at lines ~398, 462, 472, 608, 638, 640, 743, 761 |
| 18 | Docs do not claim auto-heal, cross-instance promotion, new drift/heal tool, or Coolify-native promote endpoint | ✓ VERIFIED | README explicitly states advisory-only, single-instance, MCP composites; no false claims found |

**Score:** 18/18 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/manifest.ts` | `exists()` guard | ✓ VERIFIED | `ManifestManager.exists()` at line 100 |
| `src/utils/manifest-audit.ts` | Finding builder + rollup | ✓ VERIFIED | 224 lines; exports `buildManifestAuditFindings`, `rollupAuditSeverity` |
| `src/mcp/tools/manifest.ts` | `audit` action handler | ✓ VERIFIED | Catalog, schema, handler wired; `audit` in actions list |
| `src/mcp/tools/manifest.test.ts` | GREEN audit tests | ✓ VERIFIED | 9 tests pass; no `it.fails` remaining |
| `src/mcp/tools/application.ts` | `envs:promote` handler | ✓ VERIFIED | Schema, confirm gate, preview/apply paths |
| `src/mcp/tools/application.test.ts` | GREEN promote tests | ✓ VERIFIED | 9 tests pass; no `it.fails` remaining |
| `src/mcp/capabilities.ts` | `manifest_audit`, `envs_promote` | ✓ VERIFIED | Both registered with 4.1.2 min version |
| `src/mcp/tools/system.test.ts` | Capability assertions | ✓ VERIFIED | 1 test pass for 13-key map |
| `docs/coverage-map.yaml` | Source map rows | ✓ VERIFIED | `manifest.audit` and `application.envs:promote` rows present |
| `docs/COVERAGE.md` | Generated coverage report | ✓ VERIFIED | Both actions listed as `covered` |
| `README.md` / `README.de.md` | EN/DE discoverability | ✓ VERIFIED | Bilingual drift-heal sections aligned |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `manifest.audit` handler | `ManifestManager.exists/load` | missing-file guard before load | ✓ WIRED | `manifest.ts:640-651` |
| `manifest.audit` handler | `fetchLiveManifestSnapshot` | soft partial live fetch | ✓ WIRED | `manifest.ts:652-655` |
| `buildManifestAuditFindings` | `FollowUpHint` | hint generators per finding kind | ✓ WIRED | `manifest-audit.ts:57-94, 130-218` |
| `handleApplicationEnvsPromote` | `fetchEnvs` | parallel source + target reads | ✓ WIRED | `application.ts:3251-3266` |
| `handleApplicationEnvsPromote` | `diffEnvs` | source as local, target as remote | ✓ WIRED | `application.ts:3272` |
| `handleApplicationEnvsPromote` | `createEnv` / `bulkUpdateEnvs` | confirm-gated apply | ✓ WIRED | `application.ts:3303-3348` |
| `system.version` | `COOLIFY_412_CAPABILITIES` | capability map | ✓ WIRED | `capabilities.ts` consumed by system tool |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `manifest.audit` response | `findings` | `buildManifestAuditFindings(local, remote)` | Yes — computed from manifest indexes | ✓ FLOWING |
| `envs:promote` preview | `promotion_suggestions` | `diffEnvs(sourceEnvs, targetEnvs)` | Yes — derived from env diff | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| manifest.audit tests | `npx vitest run src/mcp/tools/manifest.test.ts -t "manifest.audit"` | 9 passed | ✓ PASS |
| envs:promote tests | `npx vitest run src/mcp/tools/application.test.ts -t "envs:promote"` | 9 passed | ✓ PASS |
| capability keys | `npx vitest run src/mcp/tools/system.test.ts -t "manifest_audit\|envs_promote"` | 1 passed | ✓ PASS |
| docs parity | `npx vitest run tests/integration/docs-parity.test.ts` | 7 passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no phase-declared probes; migration/tooling probe pattern not applicable.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DRIFT-01 | 00, 01, 03 | Manifest audit vs live with remediation | ✓ SATISFIED | `manifest.audit` + `manifest-audit.ts` + 9 tests |
| DRIFT-02 | 00, 02, 03 | Env compare + promotion suggestions | ✓ SATISFIED | `application.envs:promote` + 9 tests |
| DRIFT-03 | 00, 01, 02, 03 | Concrete fix hints, not raw diff only | ✓ SATISFIED | `FollowUpHint` on findings and promotion_suggestions |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None in phase-modified source files | — | — |

No `TBD`/`FIXME`/`XXX` debt markers. No remaining `it.fails` scaffolds (only historical comments in test files).

### Human Verification Required

None — all behavior-dependent truths exercised by passing unit tests.

### Gaps Summary

No gaps. Phase 29 goal achieved in codebase:

- **DRIFT-01:** `manifest.audit` compares local manifest vs live inventory and returns severity-tagged findings with structured remediation hints pointing to `manifest.sync`, `manifest.upsert`, or domain CRUD actions.
- **DRIFT-02:** `application.envs:promote` compares env vars between two application UUIDs with preview-by-default and confirm-gated apply.
- **DRIFT-03:** Both surfaces return `FollowUpHint`-shaped objects; raw diff data is supporting detail (`diff_support` on audit, diff buckets on promote), not the sole payload.

Discoverability complete: `manifest_audit` and `envs_promote` capability keys, coverage-map rows, bilingual README docs, docs-parity test green.

---

_Verified: 2026-07-30T03:27:00Z_
_Verifier: Claude (gsd-verifier)_
