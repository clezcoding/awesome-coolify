---
phase: 30
slug: deploy-guard
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-31
---

# Phase 30 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP client → deployment.preflight | Untrusted app identifiers; read-only advisory | App identity args; masked env key presence |
| MCP client → deployment.rollback | Mutation; confirm gate required | confirm, wait, force, instance; git pin + deploy |
| Coolify API → MCP factor collectors | Live health/env/deploy/DNS config | Risk findings; env values must stay masked |
| Preflight/rollback response → agent | Advisory + preview payloads | Must not leak secret env values |
| Public docs / coverage map | Must not claim nonexistent APIs | OpenAPI path mapping only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-30-01 | Information Disclosure | preflight env_completeness | high | mitigate | `maskEnvRecords(..., false)`; no reveal on preflight | closed |
| T-30-01-01 | Information Disclosure | env_completeness | high | mitigate | `maskEnvRecords`; preflight never enables reveal | closed |
| T-30-01-02 | Tampering | DNS SSRF | high | mitigate | Coolify application fields only; no external HTTP probes | closed |
| T-30-02 | Tampering | rollback without confirm | high | mitigate | `confirm !== true` → `COOLIFY_CONFIRM_REQUIRED` + preview | closed |
| T-30-02-01 | Tampering | rollback without confirm | high | mitigate | Same confirm gate + preview payload | closed |
| T-30-02-02 | Tampering | deploy without pin | critical | mitigate | Git: `updateApplication` SHA pin before `triggerDeploy`; docker: require image tag | closed |
| T-30-03 | Spoofing | ambiguous app identity | high | mitigate | `resolveAppMutationUuid` → `COOLIFY_AMBIGUOUS_MATCH` | closed |
| T-30-04 | Tampering | git commit pin injection | medium | mitigate | `GIT_COMMIT_SHA_RE` (`^[0-9a-f]{7,64}$`) before PATCH | closed |
| T-30-02-03 | Tampering | commit injection | medium | mitigate | Same SHA format validation before PATCH | closed |
| T-30-03-01 | Tampering | false endpoint docs | medium | mitigate | Coverage maps rollback to real `POST /deploy` + PATCH paths | closed |
| T-30-SC | Tampering | npm installs | low | accept | Phase installs no packages | closed |
| T-30-01-SC | Tampering | npm installs | low | accept | No new packages | closed |
| T-30-02-SC | Tampering | npm installs | low | accept | No new packages | closed |
| T-30-03-SC | Tampering | npm installs | low | accept | Existing devDeps only | closed |

*Status: open · closed — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-30-SC | T-30-SC / T-30-01-SC / T-30-02-SC / T-30-03-SC | Phase 30 adds no new npm dependencies; supply-chain risk unchanged from baseline | Phase 30 PLANs (30-00..30-03) | 2026-07-31 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-31 | 14 | 14 | 0 | gsd-secure-phase (L1 grep; ASVS 1 short-circuit) |

### Security Audit 2026-07-31

| Metric | Count |
|--------|-------|
| Threats found | 14 |
| Closed | 14 |
| Open | 0 |

**Evidence summary (L1):**

- T-30-01 / T-30-01-01: `deploy-preflight.ts` `maskEnvRecords(runtime, false)`
- T-30-01-02: `collectDnsReadinessFactor` reads Coolify app DNS fields only; no outbound fetch
- T-30-02 / T-30-02-01: `executeDeploymentRollback` throws `COOLIFY_CONFIRM_REQUIRED` when `confirm !== true`
- T-30-02-02: git path calls `updateApplication` before `triggerDeploy`; docker requires tag; tests cover pin order
- T-30-03: `resolveAppMutationUuid` on preflight + rollback handlers
- T-30-04 / T-30-02-03: `GIT_COMMIT_SHA_RE` validation before PATCH
- T-30-03-01: `docs/coverage-map.yaml` `deployment.rollback` → `POST /deploy` (+ GET/PATCH)
- T-30-SC family: no new packages in phase

**Unregistered flags:** None — SUMMARY.md has no open Threat Flags; register authored at plan time.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-31
