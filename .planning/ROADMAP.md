# Roadmap: Coolify MCP Server

## Overview

Coolify MCP Server v1 ships as seven vertical MVP slices: foundation and multi-instance auth first, then read/discovery with payload guards, diagnose/issue scan, app deploy lifecycle, logs and service/DB ops, bulk/emergency with safety gates, and finally npm/GitHub distribution. Each phase delivers an end-to-end agent capability testable against a real Coolify 4.1.x instance before the next layer. Create/Delete CRUD, env-var sync, teams, cloud tokens, and full parity with legacy MCPs stay deferred to v2.

## Phases

**Phase Numbering:**

- Integer phases (1–7): Planned v1 milestone work
- Decimal phases (e.g. 2.1): Urgent insertions (marked INSERTED) — none yet

- [x] **Phase 1: Foundation & Multi-Instance Auth** — MCP stdio server, action schema, Zod, Coolify client, instances.json, structured errors (completed 2026-07-12)
- [x] **Phase 2: Discovery & Read Projections** — Infrastructure overview, resource lists, discovery, docs search, bounded summaries (completed 2026-07-12)
- [x] **Phase 3: Diagnose & Issue Scan** — App/server diagnose, global unhealthy scan, follow-up hints (completed 2026-07-12)
- [x] **Phase 4: App Deploy Lifecycle** — Start/stop/restart, deploy, wait-mode, deployments, batch deploy (completed 2026-07-13)
- [x] **Phase 5: Logs & Service/DB Ops** — App runtime/build logs, service/DB lifecycle, pull-latest deploy (completed 2026-07-16; SVC-04 service/DB logs deferred to v1.1 — no endpoint in Coolify 4.1.x)
- [x] **Phase 6: Bulk, Emergency & Safety** — Project redeploy/restart, stop-all, masking, confirm gate (completed 2026-07-16)
- [x] **Phase 7: Distribution & Docs** — npm publish, GitHub README, Cursor/Claude Desktop setup (completed 2026-07-16)

## Phase Details

### Phase 1: Foundation & Multi-Instance Auth

**Goal:** As a Coolify operator, I want to connect via MCP stdio with structured errors, so that later tools share one connection layer and recovery path.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** CTX-01–07, ERR-01–03, DX-01–02, DIST-03
**Success Criteria** (what must be TRUE):

  1. Agent runs `npx coolify-mcp` (or local dev entry) and MCP stdio handshake succeeds in Cursor and Claude Desktop
  2. Agent calls health, version, and meta tools — receives Coolify API version, MCP server version, and connection status
  3. Agent adds, lists, gets, updates, deletes instances in `~/.coolify-mcp/instances.json`; sets default and switches active instance; verifies connection per instance
  4. Agent passes per-request API token override without persisting it to disk
  5. API failures return structured codes (401, 404, 422, 500) with recovery hints; transient errors retry with exponential backoff
  6. Domain tools register as action-based handlers (e.g. `application({ action: 'list' })`) with Zod-validated inputs — not 60+ granular tools

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking skeleton: scaffold, MCP stdio, system health

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Structured error envelope + retry client

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Secret redaction + stderr logger

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Full system/meta tools + Zod schemas

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Build + MCP client handshake smoke (DIST-03)

### Phase 2: Discovery & Read Projections

**Goal:** As an AI agent, I want to list and find Coolify resources with bounded summaries, so that I can orient before any mutating operation without blowing the context window.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** SYS-01, SYS-02, SYS-06, SYS-07, APP-01, APP-02, SVC-01, SVC-02, OUT-01, OUT-03, OUT-04, OUT-05, DX-03
**Success Criteria** (what must be TRUE):

  1. Agent fetches infrastructure overview with counts (servers, projects, apps, databases, services)
  2. Agent lists unified resources and apps/services/databases with summary projection (essential fields only)
  3. Agent gets app or service/DB details in summary or full projection on demand
  4. Agent finds resource by UUID, name, domain, or IP via discovery action
  5. Agent searches Coolify documentation (how-to, config, troubleshooting)
  6. Responses honor `format` (table, JSON, pretty), pagination (`page`, `per_page`), and `max_chars` cap; large payloads emit size warning before return

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Shared projections, formatters, read params (OUT-01, OUT-03–05, DX-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Infrastructure overview + resource.list (SYS-01, SYS-02, APP-01, SVC-01)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — application/service/database get (APP-02, SVC-02, OUT-04)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — resource.find + docs.search (SYS-06, SYS-07)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-05-PLAN.md — Integration tests + validation sign-off

### Phase 3: Diagnose & Issue Scan

**Goal:** As a AI agent, I want to run app/server diagnose and global issue scan, so that I can triage unhealthy deployments before acting.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** SYS-03, SYS-04, SYS-05, OUT-06
**Success Criteria** (what must be TRUE):

  1. Agent diagnoses app by UUID, name, or domain — receives status, health, env count, recent deployments
  2. Agent diagnoses server by UUID, name, or IP — receives resources, domains, validation state
  3. Agent runs global issue scan — surfaces unhealthy apps/DBs/services and unreachable servers
  4. Get/diagnose responses include follow-up action hints (e.g. "View logs", "Restart", "Deploy")

**Plans:** 7/7 plans complete

Plans:

- [x] 03-07-PLAN.md — Gap closure: toolOutputSchema _meta + MCP schema regression test + UAT heal

- [x] 03-01-PLAN.md
- [x] 03-02-PLAN.md
- [x] 03-03-PLAN.md
- [x] 03-04-PLAN.md
- [x] 03-05-PLAN.md
- [x] 03-06-PLAN.md

### Phase 4: App Deploy Lifecycle

**Goal:** As a Coolify operator, I want to start, stop, restart, deploy, and cancel application deployments with wait-mode across my fleet, so that I can ship and monitor releases without the Coolify UI.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** APP-03–09, DEP-01–03
**Success Criteria** (what must be TRUE):

  1. Agent starts, stops, and restarts apps by UUID, name, or tag
  2. Agent triggers deploy with optional force rebuild (no cache)
  3. Agent uses deploy wait-mode — polls until finished/failed/cancelled or timeout
  4. Agent lists deployments per app and gets deployment details (status, commit, timestamps)
  5. Agent cancels in-flight deployment
  6. Agent deploys by resource name, batch-deploys comma-separated UUIDs or tags; deployment responses include `logs_available` hint without inline log bloat

**Plans:** 5/5 plans complete

Plans:

**Wave 1**

- [x] 04-01-PLAN.md — App lifecycle (start/stop/restart) + COOLIFY_AMBIGUOUS_MATCH + strict mutation resolver (APP-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — Single deploy + force + wait-mode polling + logs_available hint (APP-04, APP-05, APP-06, DEP-01, DEP-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-03-PLAN.md — deployment tool: list/get/cancel with graceful 400 (APP-07, APP-08, APP-09)
- [x] 04-04-PLAN.md — Batch deploy by uuids/tags with sequential best-effort wait (DEP-02, DEP-03)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-05-PLAN.md — Integration sign-off: deploy-flow.test.ts + VALIDATION.md + build green (APP-03–09, DEP-01–03)

### Phase 5: Logs & Service/DB Ops

**Goal:** As a AI agent, I want to read bounded logs and control service/DB lifecycle, so that I can debug runtime issues and operate one-click services safely.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** APP-10, APP-11, SVC-03–05
**Success Criteria** (what must be TRUE):

  1. Agent reads app runtime logs with limit and optional follow mode — output stays within `max_chars`
  2. Agent fetches deployment build logs on demand with pagination
  3. Agent starts, stops, and restarts services and databases
  4. ~~Agent reads service/DB logs with bounded tail~~ **DEFERRED to v1.1** — Coolify 4.1.x REST API does not expose /services/{uuid}/logs or /databases/{uuid}/logs (404 confirmed live spike 004; PR #6293 merged 2026-07-06 to `next` branch, NOT backported to v4.1.2). Re-add when instance upgrades to v4.1.3+. Tracked in 05-CONTEXT.md <deferred>. v1 ships NO service.logs / database.logs actions (no stub, no COOLIFY_501).
  5. Agent deploys/restarts service with pull-latest-images option

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — App logs (runtime + build JSON-array pipeline) + sharedLogParamsSchema + COOLIFY_403_SENSITIVE_REQUIRED (APP-10, APP-11)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Service lifecycle (start/stop/restart) + service.deploy pull-latest via POST /services/{uuid}/restart?latest=true (SVC-03, SVC-05)
- [x] 05-03-PLAN.md — Database lifecycle (start/stop/restart, no deploy per D-18) (SVC-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-04-PLAN.md — SVC-04/SC4 deferral doc — amend ROADMAP, no code, no stubs (requirements: [])

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-05-PLAN.md — Integration sign-off + VALIDATION restructure (APP-10, APP-11, SVC-03, SVC-05)

**Note:** SVC-04 (service/DB bounded log tail) deferred to v1.1 — Coolify 4.1.x REST API has no `/services/{uuid}/logs` or `/databases/{uuid}/logs` endpoint (RESEARCH §2 / spike 004). PR #6293 merged to `next` 2026-07-06; backport pending. User directive: "KEINE Tools die nicht funktionieren."

### Phase 6: Bulk, Emergency & Safety

**Goal:** As an AI agent operator, I want bulk project ops and emergency stop with credential masking and confirm gates, so that high-impact actions are deliberate and secrets never leak.
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** EMG-01–03, OUT-02, OUT-07
**Success Criteria** (what must be TRUE):

  1. Agent stops all running apps (emergency) — requires `confirm: true`
  2. Agent redeploys all apps in a project — requires `confirm: true`
  3. Agent restarts all apps in a project — requires `confirm: true`
  4. Sensitive values (tokens, passwords, webhooks) masked as `***` by default; reveal only on explicit opt-in
  5. All destructive ops reject without `confirm: true` and return clear recovery hint

**Plans:** 3/3 plans complete

Plans:

**Wave 1**

- [x] 06-01-PLAN.md — Emergency tool: stop_all / redeploy_project / restart_project with confirm gate (EMG-01, EMG-02, EMG-03, OUT-07)
- [x] 06-02-PLAN.md — Reveal opt-in masking on full projections (OUT-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-03-PLAN.md — Integration sign-off: emergency + reveal handler-level suite + VALIDATION (EMG-01, EMG-02, EMG-03, OUT-02, OUT-07)

### Phase 7: Distribution & Docs

**Goal:** As a community user, I want npm install and complete GitHub README, so that I can adopt the MCP without reading source code.
**Mode:** mvp
**Depends on:** Phase 6
**Requirements:** DIST-01, DIST-02
**Success Criteria** (what must be TRUE):

  1. `npx coolify-mcp` (or published package name) installs and starts without manual build steps
  2. README covers setup, multi-instance config, tool reference, and copy-paste Cursor/Claude Desktop examples
  3. README documents action-based tool patterns and links to v2 roadmap for deferred CRUD features
  4. Package metadata (name, version, bin) matches PROJECT.md distribution constraints

**Plans:** 4/5 plans executed

Plans:

- [x] 07-04-PLAN.md
- [ ] 07-05-PLAN.md

**Wave 1**

- [x] 07-01-PLAN.md — npm publish-ready packaging (name=awesome-coolify-mcp, bin, prepublishOnly, files+LICENSE, engines, repository/bugs/homepage, keywords) + Wave 0 docs-parity test scaffold + CONTRIBUTING.md maintainer publish workflow (DIST-01, DIST-02)

**Wave 2** *(blocked on Wave 1 / 07-01 completion)*

- [x] 07-02-PLAN.md — README.md + README.de.md full parity rewrite (10-tool / 32-action table, 3 install paths, Safety section, no .planning links, CONTRIBUTING.md pointer) + docs/mcp.example.json update; turns docs-parity test GREEN (DIST-02)

**Wave 3** *(blocked on Wave 2 / 07-02 completion)*

- [x] 07-03-PLAN.md — GitHub Pages configurator (docs/install.html + docs/index.html) with 15+ per-client format adapters + Cursor/VS Code deeplink generators + install-configurator.test.ts incl. `<script src=` negative grep (DIST-02)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Multi-Instance Auth | 5/5 | Complete    | 2026-07-12 |
| 2. Discovery & Read Projections | 5/5 | Complete    | 2026-07-12 |
| 3. Diagnose & Issue Scan | 7/7 | Complete    | 2026-07-12 |
| 4. App Deploy Lifecycle | 5/5 | Complete    | 2026-07-13 |
| 5. Logs & Service/DB Ops | 5/5 | Complete    | 2026-07-16 |
| 6. Bulk, Emergency & Safety | 3/3 | Complete    | 2026-07-16 |
| 7. Distribution & Docs | 4/5 | In Progress|  |

---

## v2 Milestone (Future — Not Mapped to Phases)

Full feature parity with Coolify CLI, user-coolify MCP, and coolify-backup-mcp. Detailed REQ-IDs live in `.planning/REQUIREMENTS.md` § v2. Phases will be defined after v1 release via `/gsd-new-milestone`.

| Group | Scope | REQ Prefix |
|-------|-------|------------|
| Context & Auth Extensions | Debug mode, shell completion, self-update | V2-CTX |
| Teams | List, get, current team, members, invite | V2-TEAM |
| Projects & Environments CRUD | Create/update/delete projects and environments | V2-PROJ |
| Servers CRUD | Server lifecycle, validation, build-server, domains | V2-SRV |
| Private Keys | PEM key management | V2-KEY |
| Cloud Provider | Hetzner/DigitalOcean tokens and provisioning | V2-CLOUD |
| GitHub Apps | CRUD, repos/branches, enterprise URLs | V2-GH |
| Application CRUD & Config | All create paths, update, delete, health checks, auth | V2-APP |
| Application Env Vars | CRUD, bulk, sync from `.env` | V2-ENV |
| Application Storage | Persistent volumes / file mounts | V2-STOR |
| One-Click Services | Service CRUD, compose YAML, env, storage | V2-SVC |
| Databases | 8 DB types, CRUD, public access, env, storage | V2-DB |
| Database Backups | Schedules, executions, trigger | V2-BAK |
| Scheduled Tasks | Cron CRUD, executions, run-once | V2-CRON |
| Agent & DX (Section 21) | Idempotency, dry-run, audit log, OpenAPI, planner | V2-DX |
| Observability (Section 21) | Metrics, Traefik, containers, events, log search | V2-OBS |
| Networking & Security (Section 21) | SSL, firewall, IP allowlist, secrets rotation | V2-SEC |
| CI/CD (Section 21) | Webhooks, previews, rollback, canary, registry creds | V2-CICD |
| Multi-Tenancy (Section 21) | RBAC deploy rules, per-project tokens | V2-TEN |
| Data & Storage (Section 21) | Snapshots, S3 backup, connection strings, migration | V2-DATA |
| Infrastructure as Code (Section 21) | Export/import, drift detection, Terraform wrapper | V2-IAC |
| Cloud & Server (Section 21) | Docker cleanup, swarm, auto-scaling | V2-INFRA |
| Reliability (Section 21) | Queue depth, build limits, maintenance mode | V2-REL |
| Container Runtime (Section 21) | Exec, file transfer, port-forward (when API exists) | V2-RT |

**Explicitly out of scope until Coolify API supports it:** container exec (V2-RT-01 blocked on API); global deployments list (unreliable in 4.1.x).

---
*Roadmap created: 2026-07-12*
*Granularity: standard (7 phases) | Mode: mvp per phase*
*Coverage: 52/52 v1 REQ-IDs mapped*
