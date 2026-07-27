---
phase: 23
slug: openapi-coverage-npm-release
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-27
validated: 2026-07-27
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/openapi-coverage.test.ts tests/npm-pack-allowlist.test.ts` |
| **Full suite command** | `npm test` (~1094 tests, ~9s) |
| **Estimated runtime** | ~9 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted openapi/npm-pack vitest
- **After every plan wave:** Run `npm test` + `npm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| **OAPI-01** | OpenAPI coverage map + override YAML validated | Unit | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| **OAPI-02** | `--check` exits non-zero on stale report; COVERAGE.md drift gate | Unit | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| **PUB-02** | npm pack tarball excludes forbidden paths | Unit | `npx vitest run tests/npm-pack-allowlist.test.ts` | ✅ | ✅ green |
| **PUB-01** | release.yml OIDC contract + milestone changeset major 1.0.0 | Unit | `rg -q 'id-token: write' .github/workflows/release.yml && test -f .changeset/v31-milestone-1-0-0.md` | ✅ | ✅ green |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-00-01 | 00 | 0 | OAPI-01 | T-23-01 | Override YAML schema validated | unit | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| 23-00-02 | 00 | 0 | OAPI-02 | T-23-02 | `--check` exits non-zero on stale report | unit | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| 23-01-02 | 01 | 1 | OAPI-01 | T-23-02 | 3-layer join tracer path | unit | `npm run openapi:coverage && npm run openapi:coverage -- --check` | ✅ | ✅ green |
| 23-01-03 | 01 | 1 | OAPI-02 | T-23-02 | `docs/COVERAGE.md` drift tests GREEN | unit | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| 23-02-01 | 02 | 2 | OAPI-01 | T-23-04 | OpenAPI v4.1.2 pin + OPENAPI.md | unit | `test -f docs/OPENAPI.md && rg -q 'v4\.1\.2' docs/OPENAPI.md` | ✅ | ✅ green |
| 23-02-02 | 02 | 2 | OAPI-01 | T-23-05 | Full coverage-map + overrides seeded | unit | `npx vitest run tests/openapi-coverage.test.ts` | ✅ | ✅ green |
| 23-02-03 | 02 | 2 | OAPI-02 | T-23-02 | Full COVERAGE.md + un-overridden gap fails `--check` | unit | `npm run openapi:coverage -- --check` | ✅ | ✅ green |
| 23-03-01 | 03 | 2 | PUB-02 | T-23-03 | Tarball excludes forbidden paths | unit | `npm run build && npx vitest run tests/npm-pack-allowlist.test.ts` | ✅ | ✅ green |
| 23-03-02 | 03 | 2 | PUB-02 | T-23-06 | Pack gate in full `npm test` suite | unit | `npm test` | ✅ | ✅ green |
| 23-04-02 | 04 | 3 | PUB-01 | T-23-09 | release.yml OIDC contract unchanged | unit | `rg -q 'id-token: write' .github/workflows/release.yml && rg -q 'changeset:emit-tag' .github/workflows/release.yml` | ✅ | ✅ green |
| 23-04-04 | 04 | 3 | PUB-01 | T-23-10 | Milestone Changeset major 1.0.0 | unit | `test -f .changeset/v31-milestone-1-0-0.md && rg -q 'awesome-coolify-mcp' .changeset/v31-milestone-1-0-0.md && rg -q major .changeset/v31-milestone-1-0-0.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Checkpoint rows (23-01-01 Scalar human-verify, 23-04-01 npm Trusted Publisher, 23-04-03 ship-1-0-0 decision) resolved at execution time — not counted as pending automated REQ rows.

---

## Wave 0 Requirements

- [x] `scripts/openapi-coverage.mjs` — generator CLI
- [x] `scripts/lib/openapi-coverage-*.mjs` — parse/join/render modules
- [x] `docs/COVERAGE.md` — initial committed report
- [x] `docs/coverage-overrides.yaml` — seed deferrals (SVC-04, execute_command, non-REST tools)
- [x] `docs/coverage-map.yaml` — client/action join data
- [x] `docs/OPENAPI.md` — v4.1.2 provenance
- [x] `tests/openapi-coverage.test.ts` — OAPI-01/OAPI-02
- [x] `tests/npm-pack-allowlist.test.ts` — PUB-02
- [x] `package.json` script `openapi:coverage` — maintainer entry
- [x] DevDeps: `@scalar/openapi-parser`, `@scalar/openapi-types`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm Trusted Publisher dashboard | PUB-01 | Not in repo | Verify npmjs.com trusted publisher for `release.yml` before 1.0.0 publish |
| Live npm publish 1.0.0 | PUB-01 | Milestone gate | Merge Version Packages PR; confirm OIDC publish succeeds |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-07-27

| Metric | Count |
|--------|-------|
| Gaps found | 14 (draft frontmatter; all per-task rows pending; checkpoint rows conflated with automated gaps) |
| Resolved | 14 |
| Escalated | 0 |

Nyquist reconciliation (23.1-03): confirmed openapi-coverage + npm-pack-allowlist tests green; checkpoint rows (Scalar verify, npm dashboard, ship decision) documented as manual-only; PUB-01 live publish stays Manual-Only; earned `status: validated` + `nyquist_compliant: true`.
