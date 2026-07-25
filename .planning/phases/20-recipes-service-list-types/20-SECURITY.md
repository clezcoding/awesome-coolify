---
phase: 20
slug: recipes-service-list-types
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 20 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| MCP client → recipe / service.list-types schema | Untrusted agent input; Zod + per-action superRefine | Action fields, type ids, repo_path, reveal flag |
| Handler → Coolify REST API | Validated payloads only over HTTPS | App/DB/service create bodies, env bulk-update |
| Handler → CDN / GitHub Raw | Hardcoded hosts only (no user URL) | service-templates.json by Coolify version pin |
| Handler → local filesystem | detectBuildPack metadata read on agent-supplied repo_path | Dockerfile / Dockerfile.* existence only |
| Coolify API response → agent | sanitize / slim map before return | Masked connection_string; slim { id, label }[] |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-20-00-01 | Information Disclosure | Test fixtures with fake connection strings | low | accept | Synthetic test-only URLs; real masking covered by T-20-01 in 20-03 | closed |
| T-20-01 (SSRF) | Tampering / SSRF | fetchServiceTemplates URL construction | high | mitigate | Hardcoded jsDelivr + GitHub Raw hosts only; version from fetchVersion or `v4.x` — never agent input (`src/utils/service-templates.ts`) | closed |
| T-20-01-02 | Denial of Service | Offline / CDN outage | medium | mitigate | Double-fetch failure → `COOLIFY_FETCH_TEMPLATES_FAILED` with recoveryHints; empty `{}` hard error | closed |
| T-20-01-03 | Information Disclosure | service-templates.json payload | low | mitigate | `mapTemplatesToSlimList` returns `{ id, label }[]` only | closed |
| T-20-02-01 | Tampering / SSRF | create-one-click type param | high | mitigate | Type validated against `fetchServiceTemplates` before `createService`; unknown → `COOLIFY_VALIDATION_ERROR` | closed |
| T-20-02-02 | Tampering / Path Traversal | create-git-app repo_path | low | accept | v3.1 trust model: agent-supplied workspace paths; metadata-only fs probes; realpath allowlist deferred | closed |
| T-20-02-03 | Spoofing | recipe create missing project/env | medium | mitigate | File-level superRefine enforces project XOR + environment XOR per create action | closed |
| T-20-02-04 | Repudiation | Duplicate create not idempotent | low | accept | Documented: re-call creates second resource | closed |
| T-20-01 (mask) | Information Disclosure | connection_string in create-app-db | high | mitigate | Field-level mask via `sanitizeFullProjection` unless `reveal:true` (`recipe.ts` create-app-db) | closed |
| T-20-03-01 | Denial of Service | Partial failure orphaned resources | medium | mitigate | `COOLIFY_RECIPE_PARTIAL_FAILURE` with created UUIDs + recoveryHints; no auto-rollback (D-15) | closed |
| T-20-03-02 | Repudiation | Duplicate create-app-db | low | accept | Documented non-idempotent create | closed |
| T-20-03-03 | Tampering | Concurrent create-app-db | low | accept | Sequential handler; interrupted runs leave resources; documented | closed |
| T-20-04-01 | Information Disclosure | create-git-app recoveryHints | low | accept | MANIFEST_HINT is static Tip; wrapMcpError redacts secrets | closed |
| T-20-04-02 | Information Disclosure | CoolifyApiError API message rethrow | medium | mitigate | Preserve redactSecrets via wrapMcpError; append static MANIFEST_HINT only (`appendManifestHint`) | closed |
| T-20-04-03 | Elevation of Privilege | instance soft hint | low | accept | D-20 soft guidance only; wizard owns hard routing in Phase 22 | closed |
| T-20-SC / T-20-04-SC | Tampering | npm package installs | low–high | accept / mitigate | No new packages in Phase 20 plans; deps already pinned | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-20-01 | T-20-00-01 | Synthetic fixtures only; no real credentials in tests | plan threat_model | 2026-07-25 |
| AR-20-02 | T-20-02-02 | Agent-trusted repo_path per v3.1; metadata-only fs; allowlist deferred | plan threat_model | 2026-07-25 |
| AR-20-03 | T-20-02-04 | Recipe creates intentionally non-idempotent; documented | plan threat_model | 2026-07-25 |
| AR-20-04 | T-20-03-02 | Re-call creates second app+db pair; documented in tool description | plan threat_model | 2026-07-25 |
| AR-20-05 | T-20-03-03 | Sequential handler; no distributed lock; documented | plan threat_model | 2026-07-25 |
| AR-20-06 | T-20-04-01 | Static MANIFEST_HINT Tip; no secrets in new hint text | plan threat_model | 2026-07-25 |
| AR-20-07 | T-20-04-03 | Soft instance/manifest hint cannot escalate privileges | plan threat_model | 2026-07-25 |
| AR-20-08 | T-20-SC | No new npm deps; legitimacy audit in RESEARCH | plan threat_model | 2026-07-25 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 16 | 16 | 0 | gsd-verify-work → secure-phase (ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
