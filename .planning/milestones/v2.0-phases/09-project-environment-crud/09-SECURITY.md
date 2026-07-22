---
phase: 09
slug: project-environment-crud
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-18
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Agent → MCP project/environment tools | Agent invokes CRUD on Projects + Environments | name, initial_environment, uuid, project_uuid, project_name, description, confirm |
| MCP → Coolify API | ofetch client with bearer token | API token, project/env UUIDs in URL paths, JSON bodies (name/description only — no secrets) |
| MCP handler → Zod schema layer | Untrusted args parsed by discriminated union with `.strict()` + `superRefine` | Raw agent args → typed ProjectAction / EnvironmentAction |
| Test process → mocked ofetch | Vitest mocks replace API client layer | Fake project/env fixtures only — no real resources |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-9-00-SC | Tampering | npm installs (none new) | low | accept | No new packages introduced in 09-00; reuses approved zod/ofetch/vitest from Phase 8 audit | closed |
| T-9-01-T | Tampering | client.ts CRUD payloads | medium | mitigate | All payloads constructed from Zod-parsed fields; URL paths use validated uuid/name_or_uuid only (`client.ts:141,155,169,179,189,203,214,228`); Coolify routes validate server-side | closed |
| T-9-01-I | Information disclosure | resource.list projections | low | mitigate | `projectProjectSummary` emits only {uuid,name,description?} (`project.ts:198-209`); `projectEnvironmentSummary` emits only {uuid,name,project_uuid,project_name?} (`project.ts:211-219`, `environment.ts:203-219`) — no secret fields exist on these objects | closed |
| T-9-01-SC | Tampering | npm installs (none new) | low | accept | No new packages; reuses approved zod/ofetch from Phase 8 Package Legitimacy Audit | closed |
| T-9-02-T | Tampering | createActionSchema name/initial_environment | medium | mitigate | `z.string().min(1)` on name (`project.ts:87`); `.strict()` on all schemas; `requireUuidOrName` superRefine on mutations (`project.ts:50-64,81,109,123,133`); initial_environment optional at schema but handler guard enforces non-empty (`project.ts:377-385`) | closed |
| T-9-02-E | Elevation | delete without confirm | high | mitigate | `validateDeleteConfirm` throws `COOLIFY_CONFIRM_REQUIRED` before any DELETE call (`project.ts:221-235,478`); `confirm` defaults to false (`project.ts:116-119`); no `force` param in schema | closed |
| T-9-02-D | Denial | non-empty project delete | medium | mitigate | Client-side `fetchEnvironments` pre-check yields `COOLIFY_409` with `environment_uuids` before DELETE (`project.ts:480-498`) — prevents accidental cascade | closed |
| T-9-02-I | Information disclosure | project responses | low | accept | Project objects carry no secrets (uuid/name/description only); `sanitizeFullProjection` applied on full projection (`project.ts:367`) for parity | closed |
| T-9-02-SC | Tampering | npm installs (none new) | low | accept | No new packages; reuses approved zod/ofetch | closed |
| T-9-03-T | Tampering | environmentActionSchema project_uuid XOR project_name + env uuid XOR name | medium | mitigate | `z.string().min(1)` on env name (`environment.ts:114`); `requireProjectUuidOrName` enforces true XOR via `hasUuid === hasName` (`environment.ts:52-68`); `requireEnvUuidOrName` enforces OR (`environment.ts:70-84`); `.strict()` on all schemas | closed |
| T-9-03-E | Elevation | delete without confirm | high | mitigate | `validateDeleteConfirm` throws `COOLIFY_CONFIRM_REQUIRED` before any DELETE call (`environment.ts:221-235,483`); `confirm` defaults to false (`environment.ts:127-130`); no `force` param in schema | closed |
| T-9-03-D | Denial | non-empty environment delete (incl. async deleting/destroying children) | high | mitigate | Client-side `findEnvironmentChildResources` pre-check via `fetchResources` yields `COOLIFY_409` with `child_resource_uuids` before DELETE (`environment.ts:259-280,485-497`); matches resources by `environment_id`/`environment.uuid` regardless of status — async `deleting`/`destroying` children still block (RESEARCH pitfall 2) | closed |
| T-9-03-R | Repudiation | duplicate env name create | medium | mitigate | `isDuplicateEnvironmentError` catches COOLIFY_409 (envelope or HTTP 409) and re-surfaces with `DUPLICATE_ENV_RECOVERY_HINTS` (`environment.ts:282-301,457-466`) — no silent overwrite | closed |
| T-9-03-I | Information disclosure | environment responses | low | accept | Environment objects carry no secrets (uuid/name/project_uuid/project_name only); `sanitizeFullProjection` applied on full projection (`environment.ts:419`) | closed |
| T-9-03-SC | Tampering | npm installs (none new) | low | accept | No new packages; reuses approved zod/ofetch | closed |
| T-9-04-S | Spoofing | tool registration surface | low | accept | Tool names are static literals `'project'`/`'environment'` (`server.ts:461,492`); no client-controlled input reaches `registerTool` | closed |
| T-9-04-I | Information disclosure | tool descriptions | low | accept | Descriptions document safety semantics (confirm, 409, no cascade, D-05..D-15) — intended disclosure for safe agent use, no secrets | closed |
| T-9-04-SC | Tampering | npm installs (none new) | low | accept | No new packages | closed |
| T-9-05-V | Tampering | schema-layer optional initial_environment could bypass validation on live MCP | high | mitigate | Handler guard at start of `case 'create'` trims and rejects missing/empty `initial_environment` with `COOLIFY_422` + `INITIAL_ENV_RECOVERY_HINTS` before `createProject` (`project.ts:377-385`); D-11 dual-layer pattern (optional schema + handler enforcement) closes UAT G-09-10 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-9-00-SC | No new packages introduced in 09-00; reuses approved zod/ofetch/vitest from Phase 8 Package Legitimacy Audit. | gsd-security-auditor | 2026-07-18 |
| AR-09-02 | T-9-01-SC | No new packages in 09-01; reuses approved zod/ofetch from Phase 8 audit. | gsd-security-auditor | 2026-07-18 |
| AR-09-03 | T-9-02-SC | No new packages in 09-02; reuses approved zod/ofetch. | gsd-security-auditor | 2026-07-18 |
| AR-09-04 | T-9-02-I | Project objects carry no secrets (uuid/name/description only); `sanitizeFullProjection` applied on full projection for parity defense-in-depth. | gsd-security-auditor | 2026-07-18 |
| AR-09-05 | T-9-03-SC | No new packages in 09-03; reuses approved zod/ofetch. | gsd-security-auditor | 2026-07-18 |
| AR-09-06 | T-9-03-I | Environment objects carry no secrets (uuid/name/project_uuid/project_name only); `sanitizeFullProjection` applied on full projection for parity. | gsd-security-auditor | 2026-07-18 |
| AR-09-07 | T-9-04-S | Tool names are static literals; no client-controlled input reaches `registerTool`. No spoofing vector. | gsd-security-auditor | 2026-07-18 |
| AR-09-08 | T-9-04-I | Tool descriptions document confirm-gate, 409, and no-cascade semantics — intended disclosure to guide safe agent use. | gsd-security-auditor | 2026-07-18 |
| AR-09-09 | T-9-04-SC | No new packages in 09-04. | gsd-security-auditor | 2026-07-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-18 | 19 | 19 | 0 | gsd-security-auditor (L1, ASVS-1) |

### Security Audit 2026-07-18

| Metric | Count |
|--------|-------|
| Threats found | 19 |
| Closed | 19 |
| Open (blocking, severity ≥ high) | 0 |
| Open (non-blocking, severity < high) | 0 |
| Unregistered flags from SUMMARY.md | 0 |

**ASVS Level 1 verification depth:** mitigation pattern present in cited file (grep-level) + boundary placement check.

**Key evidence verified:**
- Confirm gate: `project.ts:478`, `environment.ts:483` — both call `validateDeleteConfirm` before DELETE
- Non-empty pre-check: `project.ts:480-498` (environments), `environment.ts:485-497` (child resources via `fetchResources`)
- No `force` param: grep returns 0 matches in `project.ts` / `environment.ts` schemas
- Schema strictness: `.strict()` on all 11 action schemas across both handlers
- initial_environment dual-layer: schema optional (`project.ts:88-93`) + handler guard (`project.ts:377-385`)
- Projection sanitization: `sanitizeFullProjection` on full-projection get paths (`project.ts:367`, `environment.ts:419`)
- Summary projections: only uuid/name(/description/project_uuid/project_name) emitted
- Tool registration: static literals, error envelopes wired (`server.ts:460-489,491-520`)

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-18
