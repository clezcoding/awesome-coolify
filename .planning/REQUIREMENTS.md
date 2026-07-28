# Requirements: Coolify MCP Server

**Defined:** 2026-07-27
**Milestone:** v3.2 Observability & DX
**Core Value:** AI agent manages Coolify instances — deploy, logs, diagnose, create infrastructure — via one MCP server.

## v3.2 Requirements

Requirements for this milestone. Each maps to roadmap phases. Scoped to **Coolify 4.1.2** (latest stable installable); no 4.2.0 service/DB log APIs.

### Capabilities

- [x] **CAP-01**: Agent can read Coolify server version and `awesome-coolify-mcp` package version via `system.version`
- [x] **CAP-02**: `system.version` returns capability flags for features known on Coolify 4.1.2 (`application_logs`, `deployment_watch`, `deploy_watch`, etc.) so agents avoid calling unsupported APIs

### Observability / Logs

- [x] **OBS-01**: Agent can fetch deployment build logs via `deployment.logs` (by `deployment_uuid`) without routing through `application.logs`
- [x] **OBS-02**: Agent can follow application logs with bounded polling (watch-style) until timeout or terminal condition (`application.logs:follow` or equivalent)
- [x] **OBS-03**: Existing `application.logs` runtime and build paths remain unchanged (no regression)

### Diagnose

- [x] **DIAG-01**: Agent can call `diagnose.logs` for an application — combines app diagnose triage with a bounded log tail in one action

### MCP Prompts

- [x] **PROMPT-01**: `incident` MCP prompt documents `deployment.logs`, application log follow, and `diagnose.logs` (application-only; no service/DB log steps)

### IDE Skills

- [x] **SKILL-01**: `coolify-setup` skill documents app log troubleshooting, capability discovery via `system.version`, and links to incident/deploy/diagnose skills

### Branding

- [x] **BRND-01**: MCP `initialize` advertises icons via spec-compliant workarounds (data URI and/or multi-size PNG entries)
- [ ] **BRND-02**: Maintainer re-verify gate documents outcome for Cursor dev (`dist/`) and npm (`npx awesome-coolify-mcp`) paths; client limitation accepted if UI still omits custom icon

### Docs

- [x] **DOC-01**: PROJECT.md and README EN/DE reflect npm `1.0.1` shipped state (no stale “pending Version Packages” wording)

## Future Requirements

Deferred beyond v3.2.

### Logs (v3.3 — Coolify 4.2.0+ stable)

- **SVC-04**: User can fetch bounded service log tails via `GET /services/{uuid}/logs`
- **SVC-05**: User can fetch bounded database log tails via `GET /databases/{uuid}/logs`
- **SVC-06**: Agent can fetch compose sub-service logs (`/services/{uuid}/applications|databases/{id}/logs`)

### Platform (later)

- Cross-instance fan-out queries
- OpenAPI gap closure (bulk of ~57 rows)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Service/DB runtime logs | Coolify 4.1.2 has no endpoints (404 verified); deferred to v3.3 when 4.2.0+ stable |
| Sub-service compose log endpoints | Same 4.2.0 API dependency |
| `diagnose.logs` for service/database | Requires SVC-04/05 |
| Stub tools returning COOLIFY_501 for missing API | Project rule: no non-functional tools |
| Coolify instance upgrade | User-operated; document min version only |
| Full OpenAPI gap closure | Diminishing returns; separate milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAP-01 | Phase 24 | Complete |
| CAP-02 | Phase 24 | Complete |
| OBS-01 | Phase 24 | Complete |
| OBS-02 | Phase 25 | Complete |
| OBS-03 | Phase 25 | Complete |
| DIAG-01 | Phase 26 | Complete |
| PROMPT-01 | Phase 26 | Complete |
| SKILL-01 | Phase 26 | Complete |
| BRND-01 | Phase 27 | Complete |
| BRND-02 | Phase 27 | Pending |
| DOC-01 | Phase 27 | Complete |

**Coverage:**

- v3.2 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-27*
*Last updated: 2026-07-27 after v3.2 roadmap (Phases 24–27)*
