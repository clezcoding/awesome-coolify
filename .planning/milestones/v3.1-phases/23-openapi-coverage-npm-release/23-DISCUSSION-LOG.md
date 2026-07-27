# Phase 23: OpenAPI Coverage & npm Release - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `23-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 23-openapi-coverage-npm-release
**Mode:** `--batch` (3 batches, German prompts)
**Areas discussed:** coverage-mapping, gap-report, spec-provenance, release-trigger, tarball-guard

---

## Coverage Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| 1a | 3 layers: OpenAPI → `client.ts` → MCP action | ✓ |
| 1b | 2 layers: OpenAPI → MCP action | |
| 1c | OpenAPI → MCP tool only | |

| Option | Description | Selected |
|--------|-------------|----------|
| 2a | One row per action | ✓ |
| 2b | One row per tool, actions as column | |
| 2c | Tool level only | |

**User's choice:** 1a, 2a
**Notes:** Matches OAPI-01 and Phase 19 action-based schema.

---

## Gap Report

| Option | Description | Selected |
|--------|-------------|----------|
| 3a | Committed `docs/COVERAGE.md` + CI drift check | ✓ |
| 3b | CI artifact only | |
| 3c | Committed summary + JSON in CI | |

| Option | Description | Selected |
|--------|-------------|----------|
| 4a | 4 buckets: covered / deferred / out-of-scope / gap | ✓ |
| 4b | Binary covered / not-covered | |
| 4c | 5+ buckets incl. broken / schema-mismatch | |

**User's choice:** 3a, 4a

---

## OpenAPI Spec Provenance

| Option | Description | Selected |
|--------|-------------|----------|
| 5a | YAML only, JSON generated | |
| 5b | Both JSON and YAML committed | ✓ |
| 5c | JSON only | |

| Option | Description | Selected |
|--------|-------------|----------|
| 6a | Pin `v4.1.2` + `docs/OPENAPI.md` provenance | ✓ |
| 6b | Floating `v4.x` | |
| 6c | Spec version = package version | |

**User's choice:** 5b, 6a
**Notes:** User preferred dual-format commit over YAML-only recommendation.

---

## npm Release (v3.1)

| Option | Description | Selected |
|--------|-------------|----------|
| 7a | `0.5.0` → `1.0.0` | ✓ |
| 7b | `0.5.0` → `0.6.0` | |
| 7c | Stay `0.5.0` | |

| Option | Description | Selected |
|--------|-------------|----------|
| 8a | Chore PR + Changeset → Version Packages → `release.yml` | ✓ |
| 8b | `workflow_dispatch` publish workflow | |
| 8c | Manual GitHub Release + separate npm | |

**User's choice:** 7a, 8a

---

## Tarball Allowlist & CI

| Option | Description | Selected |
|--------|-------------|----------|
| 9a | `npm pack --dry-run` + forbidden-path assertions | ✓ |
| 9b | `publint` only | |
| 9c | Both publint and pack assertions | |

| Option | Description | Selected |
|--------|-------------|----------|
| 10a | Blocking PR if `docs/COVERAGE.md` stale | ✓ |
| 10b | Warning only | |
| 10c | Check on `main` only | |

| Option | Description | Selected |
|--------|-------------|----------|
| 11a | `docs/coverage-overrides.yaml` for deferred/out-of-scope | ✓ |
| 11b | Edit COVERAGE.md manually | |
| 11c | Inline comments in generator only | |

**User's choice:** 9a, 10a, 11a

---

## Claude's Discretion

- Script naming, parser choice, override YAML shape, client.ts discovery mechanism, CI job wiring (see CONTEXT.md).

## Deferred Ideas

- Closing all `gap` rows with new MCP tools — future phases.
- Automated OpenAPI sync from Coolify `main` — not in scope.
