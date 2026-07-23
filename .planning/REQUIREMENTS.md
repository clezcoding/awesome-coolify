# Requirements: Coolify MCP Server

**Defined:** 2026-07-24
**Milestone:** v3.1 Setup, Skills & DX
**Core Value:** AI agent manages Coolify instances — deploy, logs, diagnose, create infrastructure — via one MCP server.

## v3.1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### DX / Schemas

- [ ] **DX-01**: Agent sees action catalogs and key parameters in every tool description (Cursor-friendly; mitigates empty UI tooltips)
- [ ] **DX-02**: Tool input schemas remain agent-callable with visible parameters (flat/top-level shape or equivalent) so Cursor does not show empty `properties: {}` while preserving action routing

### MCP Prompts

- [ ] **PROMPT-01**: User can invoke MCP prompt `deploy` with parameterized guidance for deploy + watch flow
- [ ] **PROMPT-02**: User can invoke MCP prompt `diagnose` for app/server/scan troubleshooting
- [ ] **PROMPT-03**: User can invoke MCP prompt `new-project` for setup/recipe onboarding
- [ ] **PROMPT-04**: User can invoke MCP prompt `incident` for emergency/redeploy triage

### Recipes / Discovery

- [ ] **RECIPE-01**: Agent can call `service.list-types` to discover Coolify one-click service types dynamically (no local YAML catalog)
- [ ] **RECIPE-02**: Agent can run recipe `git-app` — Git repo → build_pack detection → application create/wire
- [ ] **RECIPE-03**: Agent can run recipe `app+db` — application + database + `DATABASE_URL` (or equivalent) env wiring
- [ ] **RECIPE-04**: Agent can run recipe `one-click` — create service from a type returned by `list-types`

### Setup

- [ ] **SETUP-01**: Setup flow verifies `gh` presence and auth; if missing, provides install/login guidance (headless-safe, no indefinite TTY block)
- [ ] **SETUP-02**: Setup wizard wires Coolify project/environment/server linkage and updates workspace manifest
- [ ] **SETUP-03**: Setup supports non-interactive / ask-human pause path so agents can resume after user completes `gh auth`

### IDE Skills

- [ ] **SKILL-01**: Repo ships Coolify skill pack for Cursor, Claude Code, and Codex with consistent workflows
- [ ] **SKILL-02**: Skills document recipes, deploy watch, prompts, and safety rules (confirm gates, reveal opt-in)

### Deploy Watch

- [ ] **WATCH-01**: Agent can call `deployment.watch` to poll a deployment until terminal status with backoff and bounded timeout
- [ ] **WATCH-02**: Skill and/or prompt documents watch usage (non-blocking forever; timeout/recovery guidance)

### OpenAPI Coverage

- [ ] **OAPI-01**: Maintainer can run coverage tooling that maps Coolify OpenAPI paths/ops to MCP/client surface
- [ ] **OAPI-02**: Coverage tooling produces a gap report (committed artifact and/or CI output)

### npm Publish

- [ ] **PUB-01**: Maintainer-triggered Release workflow publishes `awesome-coolify-mcp` to npm (OIDC / trusted publishing)
- [ ] **PUB-02**: Published tarball excludes UAT harness, secrets, and non-package paths (allowlist verified)

## Future Requirements

Deferred beyond v3.1.

### Logs (v1.1)

- **SVC-04**: User can fetch bounded service/database log tails when Coolify API exposes endpoints

### Platform (later)

- Cross-instance fan-out queries
- Cursor MCP list icon rendering (client limitation; server icons already correct)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Own YAML/stack template catalog | Coolify 200+ one-click + coolify-examples are source of truth; forks drift |
| Synchronous watch without timeout | Blocks agents; causes timeouts / polling storms |
| Auto-push unfinished git changes in setup | Bypass branch protection / human verification |
| Execute Command in Container | Coolify 4.1.x API broken/missing |
| Shared manifest committed to git | Leak/merge risk |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DX-01 | — | Unmapped |
| DX-02 | — | Unmapped |
| PROMPT-01 | — | Unmapped |
| PROMPT-02 | — | Unmapped |
| PROMPT-03 | — | Unmapped |
| PROMPT-04 | — | Unmapped |
| RECIPE-01 | — | Unmapped |
| RECIPE-02 | — | Unmapped |
| RECIPE-03 | — | Unmapped |
| RECIPE-04 | — | Unmapped |
| SETUP-01 | — | Unmapped |
| SETUP-02 | — | Unmapped |
| SETUP-03 | — | Unmapped |
| SKILL-01 | — | Unmapped |
| SKILL-02 | — | Unmapped |
| WATCH-01 | — | Unmapped |
| WATCH-02 | — | Unmapped |
| OAPI-01 | — | Unmapped |
| OAPI-02 | — | Unmapped |
| PUB-01 | — | Unmapped |
| PUB-02 | — | Unmapped |

**Coverage:**
- v3.1 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️ (filled by roadmapper)

---
*Requirements defined: 2026-07-24*
*Last updated: 2026-07-24 after milestone v3.1 scoping*
