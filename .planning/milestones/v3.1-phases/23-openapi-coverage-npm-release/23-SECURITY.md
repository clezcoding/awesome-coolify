---
phase: 23
slug: openapi-coverage-npm-release
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-27
---

# Phase 23 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| Maintainer script → OpenAPI JSON | Reads committed spec only; no network at runtime | `docs/coolify_openapi.json` |
| DevDep install → npm registry | Scalar packages [SUS] — human-verify gate | `@scalar/openapi-parser`, `@scalar/openapi-types` |
| Upstream GitHub → committed spec | Supply-chain: pinned tag fetch | Coolify `v4.1.2` OpenAPI |
| npm pack → tarball file list | Proves consumer surface; no publish | Pack paths; no secrets |
| CI `release.yml` → npm registry | OIDC trusted publishing; no long-lived token | Package version / provenance |
| Maintainer → npmjs.com dashboard | Trusted publisher config outside git | Publisher ↔ workflow binding |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-23-00-01 | Information Disclosure | pack test fixtures | low | accept | Wave 0 scaffold only; no secrets in fixtures | closed |
| T-23-SC | Tampering | npm/pip/cargo installs | high | mitigate | Human-verify Scalar install; slopcheck; no unplanned deps in release plan | closed |
| T-23-01 | Tampering | `@scalar/openapi-parser` install | high | mitigate | Checkpoint:human-verify before `pnpm add`; deps present as declared | closed |
| T-23-02 | Repudiation | stale `COVERAGE.md` | medium | mitigate | `--check` CLI + `assertCoverageFresh` in vitest (D-06) | closed |
| T-23-03 | Information Disclosure | npm tarball / overrides reasons | high | mitigate | Forbidden-prefix + no-`.env` pack assertions (D-13); overrides public-only | closed |
| T-23-04 | Tampering | OpenAPI upstream fetch | medium | mitigate | Pin `v4.1.2`; provenance in `docs/OPENAPI.md` | closed |
| T-23-05 | Repudiation | gap vs deferred misclassification | medium | mitigate | Versioned `docs/coverage-overrides.yaml` with reasons (D-05) | closed |
| T-23-06 | Information Disclosure | `.env` secrets in pack | critical | mitigate | Assert no `.env` in tarball; only `.env.example` allowed | closed |
| T-23-07 | Tampering | `package.json` files expansion | medium | mitigate | Allowlist assertions hold without expanding `files` | closed |
| T-23-08 | Spoofing | npm publish identity | critical | mitigate | OIDC Trusted Publisher scoped to `release.yml`; UAT human confirm | closed |
| T-23-09 | Tampering | `release.yml` changes | high | mitigate | D-12: no contract change; `release-publish-gate` tests | closed |
| T-23-10 | Repudiation | duplicate publish | medium | mitigate | `changeset-emit-new-tag.mjs` + `npm view` idempotency tests | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-23-01 | T-23-00-01 | Wave 0 RED scaffolds only; no secret fixtures | plan threat_model | 2026-07-27 |
| AR-23-02 | T-23-03 (overrides) | Public repo; override reasons contain no secrets | plan threat_model | 2026-07-27 |
| AR-23-03 | T-23-SC (Plan 04) | No new deps in release/Trusted-Publisher plan | plan threat_model | 2026-07-27 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-27 | 12 | 12 | 0 | /gsd-verify-work → secure-phase (ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-27
