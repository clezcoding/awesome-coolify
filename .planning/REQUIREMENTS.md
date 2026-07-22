# Requirements: Coolify MCP Server — v3.0 Platform Foundation

**Defined:** 2026-07-21
**Core Value:** AI agent manages Coolify instances — deploy, logs, diagnose, create infrastructure — via one MCP server.

## v3.0 Requirements

Requirements for this milestone. Each maps to roadmap phases (15+).

### Multi-Instance (CTX)

- [x] **CTX-04**: Agent can add, list, update, and delete named instances in `~/.coolify-mcp/instances.json`
- [x] **CTX-05**: Agent can set the default instance; `COOLIFY_URL`/`COOLIFY_TOKEN` env vars override registry when present
- [x] **CTX-06**: Agent can route any tool call to a named instance via optional `instance` parameter
- [x] **CTX-08**: Registry directory uses `0o700` and file uses `0o600`; tokens are redacted in list/get responses unless `reveal: true`
- [x] **CTX-09**: Registry writes are atomic (write temp file + rename) to prevent corruption under concurrent access

### Coolify Cloud (CLD)

- [ ] **CLD-01**: Agent can connect to `https://app.coolify.io` with a team-scoped Bearer token using the same tool surface as self-hosted
- [ ] **CLD-02**: Cloud-only or permission-denied endpoint failures return structured recovery hints (not opaque 403/404 loops)
- [ ] **CLD-03**: README EN/DE and install docs include a Coolify Cloud setup path with smoke-test instructions

### Server Branding (BRND)

- [ ] **BRND-01**: MCP `initialize` response exposes `serverInfo.icons` so Cursor (and other MCP clients) can show a brand icon in the server list
- [ ] **BRND-02**: Icon asset is a circular/list-friendly PNG (192×192) served via public HTTPS (jsDelivr `docs/assets/`) — Hex Robot Helper mascot on brand violet background
- [ ] **BRND-03**: `McpServer` metadata includes `title`, `description`, and `websiteUrl` as fallback when a client does not render icons

### Local Manifest (MAN)

- [ ] **MAN-01**: Agent can read and write `.coolify/manifest.json` storing project, environment, server, and resource UUIDs plus domains
- [ ] **MAN-02**: First manifest write auto-appends `.coolify/` to the workspace `.gitignore` if not already present
- [ ] **MAN-03**: Agent can reconcile manifest against live API via a `manifest:sync` action (refresh stale entries)
- [ ] **MAN-04**: Operations against stale manifest UUIDs surface refresh hints on API 404 (manifest is cache, not source of truth)

### Live UAT Harness (UAT)

- [ ] **UAT-01**: Maintainer can run one CLI script that exercises all 14 MCP tools against a live Coolify instance with real data
- [ ] **UAT-02**: Script resolves credentials from `.cursor/mcp.json`, env vars, or `instances.json` without printing tokens in output
- [ ] **UAT-03**: Script emits structured JSON pass/fail report per tool/action with duration, error code, and recovery-hint presence
- [ ] **UAT-04**: Script covers v3.0 additions: multi-instance routing, cloud instance profile, manifest read/write/sync
- [ ] **UAT-05**: Script documents safe preconditions (existing UAT project/resources or optional setup mode) and never deletes production resources without explicit `--confirm-destructive`
- [ ] **UAT-06**: CONTRIBUTING.md documents how to run live UAT locally and interpret failures

## v3.1 Requirements (Deferred)

Tracked but not in v3.0 roadmap.

### Setup Wizard (SETUP)

- **SETUP-01**: Agent runs `gh` preflight (installed + authenticated) before setup wizard continues
- **SETUP-02**: Agent can run interactive project setup wizard (repo create, Coolify wiring, services)
- **SETUP-03**: Wizard pauses with recovery guide when preflight fails

### IDE Skills (SKILL)

- **SKILL-01**: Repo ships IDE skill package (Cursor, Claude Code, Codex) under `.agents/skills/` with install paths
- **SKILL-02**: Skills document MCP config, typical Coolify workflows, and manifest maintenance patterns

## Out of Scope

| Feature | Reason |
|---------|--------|
| SVC-04 service/DB bounded logs | v1.1 — Coolify API 4.1.3+ gap |
| Live npm publish | Maintainer task outside milestone |
| Cross-instance fan-out queries | Rate limits, token cost, security (research anti-feature) |
| Shared manifest committed to git | Merge conflicts, leak risk — use `.coolify-manifest.example.json` only |
| Standard setup wizard | Deferred v3.1 |
| Custom IDE skills package | Deferred v3.1 |
| Execute command in container | Coolify 4.1.x API broken/missing |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTX-04 | Phase 15 | Complete |
| CTX-05 | Phase 15 | Complete |
| CTX-06 | Phase 15 | Complete |
| CTX-08 | Phase 15 | Complete |
| CTX-09 | Phase 15 | Complete |
| CLD-01 | Phase 16 | Pending |
| CLD-02 | Phase 16 | Pending |
| CLD-03 | Phase 16 | Pending |
| BRND-01 | Phase 16 | Pending |
| BRND-02 | Phase 16 | Pending |
| BRND-03 | Phase 16 | Pending |
| MAN-01 | Phase 17 | Pending |
| MAN-02 | Phase 17 | Pending |
| MAN-03 | Phase 17 | Pending |
| MAN-04 | Phase 17 | Pending |
| UAT-01 | Phase 18 | Pending |
| UAT-02 | Phase 18 | Pending |
| UAT-03 | Phase 18 | Pending |
| UAT-04 | Phase 18 | Pending |
| UAT-05 | Phase 18 | Pending |
| UAT-06 | Phase 18 | Pending |

**Coverage:**

- v3.0 requirements: 21 total
- Mapped to phases: 21 (Phase 15: 5, Phase 16: 6, Phase 17: 4, Phase 18: 6)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-21*
*Last updated: 2026-07-21 after MCP server list icon (BRND) added*
