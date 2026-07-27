---
phase: 23
slug: openapi-coverage-npm-release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-27
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` (~1094 tests, ~9s) |
| **Estimated runtime** | ~9 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (or targeted `pnpm test tests/openapi-coverage.test.ts -x`)
- **After every plan wave:** Run `pnpm test` + `pnpm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-00-01 | 00 | 0 | OAPI-01 | T-23-01 | Override YAML schema validated | unit | `pnpm test tests/openapi-coverage.test.ts -x` | ❌ W0 | ⬜ pending |
| 23-00-02 | 00 | 0 | OAPI-02 | T-23-02 | `--check` exits non-zero on stale report | unit | `pnpm test tests/openapi-coverage.test.ts -x` | ❌ W0 | ⬜ pending |
| 23-01-01 | 01 | 1 | OAPI-01 | T-23-01 | Scalar human-verify gate before install | checkpoint | Human "approved" on npmjs.com Scalar packages | — | ⬜ pending |
| 23-01-02 | 01 | 1 | OAPI-01 | T-23-02 | 3-layer join tracer path | unit | `pnpm run openapi:coverage && pnpm run openapi:coverage -- --check` | ❌ W0 | ⬜ pending |
| 23-01-03 | 01 | 1 | OAPI-02 | T-23-02 | `docs/COVERAGE.md` drift tests GREEN | unit | `pnpm test tests/openapi-coverage.test.ts -x` | ❌ W0 | ⬜ pending |
| 23-02-01 | 02 | 2 | OAPI-01 | T-23-04 | OpenAPI v4.1.2 pin + OPENAPI.md | unit | `test -f docs/OPENAPI.md && rg -q 'v4\.1\.2' docs/OPENAPI.md` | ❌ W0 | ⬜ pending |
| 23-02-02 | 02 | 2 | OAPI-01 | T-23-05 | Full coverage-map + overrides seeded | unit | `pnpm test tests/openapi-coverage.test.ts -x` | ❌ W0 | ⬜ pending |
| 23-02-03 | 02 | 2 | OAPI-02 | T-23-02 | Full COVERAGE.md + un-overridden gap fails `--check` | unit | `pnpm run openapi:coverage -- --check` | ❌ W0 | ⬜ pending |
| 23-03-01 | 03 | 2 | PUB-02 | T-23-03 | Tarball excludes forbidden paths | unit | `pnpm run build && pnpm test tests/npm-pack-allowlist.test.ts -x` | ❌ W0 | ⬜ pending |
| 23-03-02 | 03 | 2 | PUB-02 | T-23-06 | Pack gate in full `pnpm test` suite | unit | `pnpm test -x` | ❌ W0 | ⬜ pending |
| 23-04-01 | 04 | 3 | PUB-01 | T-23-08 | npm Trusted Publisher dashboard verified | checkpoint | Human "approved" on npmjs.com trusted publisher | — | ⬜ pending |
| 23-04-02 | 04 | 3 | PUB-01 | T-23-09 | release.yml OIDC contract unchanged | unit | `rg -q 'id-token: write' .github/workflows/release.yml && rg -q 'changeset:emit-tag' .github/workflows/release.yml` | ✅ | ⬜ pending |
| 23-04-03 | 04 | 3 | PUB-01 | T-23-08 | ship-1-0-0 decision recorded | checkpoint | Select ship-1-0-0 per D-10 | — | ⬜ pending |
| 23-04-04 | 04 | 3 | PUB-01 | T-23-10 | Milestone Changeset major 1.0.0 | unit | `test -f .changeset/v31-milestone-1-0-0.md && rg -q 'awesome-coolify-mcp' .changeset/v31-milestone-1-0-0.md && rg -q major .changeset/v31-milestone-1-0-0.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/openapi-coverage.mjs` — generator CLI
- [ ] `scripts/lib/openapi-coverage-*.mjs` — parse/join/render modules
- [ ] `docs/COVERAGE.md` — initial committed report
- [ ] `docs/coverage-overrides.yaml` — seed deferrals (SVC-04, execute_command, non-REST tools)
- [ ] `docs/coverage-map.yaml` — client/action join data
- [ ] `docs/OPENAPI.md` — v4.1.2 provenance
- [ ] `tests/openapi-coverage.test.ts` — OAPI-01/OAPI-02
- [ ] `tests/npm-pack-allowlist.test.ts` — PUB-02
- [ ] `package.json` script `openapi:coverage` — maintainer entry
- [ ] DevDeps: `@scalar/openapi-parser`, `@scalar/openapi-types` (after human-verify checkpoint)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm Trusted Publisher dashboard | PUB-01 | Not in repo | Verify npmjs.com trusted publisher for `release.yml` before 1.0.0 publish |
| Live npm publish 1.0.0 | PUB-01 | Milestone gate | Merge Version Packages PR; confirm OIDC publish succeeds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
