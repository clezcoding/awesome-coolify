# Roadmap: Coolify MCP Server

## Overview

Coolify MCP Server v1 ships as seven vertical MVP slices: foundation and multi-instance auth first, then read/discovery with payload guards, diagnose/issue scan, app deploy lifecycle, logs and service/DB ops, bulk/emergency with safety gates, and finally npm/GitHub distribution. Each phase delivers an end-to-end agent capability testable against a real Coolify 4.1.x instance before the next layer. Create/Delete CRUD, env-var sync, teams, cloud tokens, and full parity with legacy MCPs stay deferred to v2.

## Phases

**Phase Numbering:**

- Integer phases (1–7): Planned v1 milestone work
- Decimal phases (e.g. 2.1): Urgent insertions (marked INSERTED) — none yet

- [ ] **Phase 1: Foundation & Multi-Instance Auth** — MCP stdio server, action schema, Zod, Coolify client, instances.json, structured errors
- [ ] **Phase 2: Discovery & Read Projections** — Infrastructure overview, resource lists, discovery, docs search, bounded summaries
- [ ] **Phase 3: Diagnose & Issue Scan** — App/server diagnose, global unhealthy scan, follow-up hints
- [ ] **Phase 4: App Deploy Lifecycle** — Start/stop/restart, deploy, wait-mode, deployments, batch deploy
- [ ] **Phase 5: Logs & Service/DB Ops** — App runtime/build logs, service/DB lifecycle, pull-latest deploy
- [ ] **Phase 6: Bulk, Emergency & Safety** — Project redeploy/restart, stop-all, masking, confirm gate
- [ ] **Phase 7: Distribution & Docs** — npm publish, GitHub README, Cursor/Claude Desktop setup

## Phase Details

### Phase 1: Foundation & Multi-Instance Auth

**Goal:** As an AI agent operator, I want MCP stdio server with multi-instance Coolify auth and structured errors, so that every later tool shares one connection layer and recovery path.
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

**Plans:** 1/5 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking skeleton: scaffold, MCP stdio, system health

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — Structured error envelope + retry client

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03-PLAN.md — Secret redaction + stderr logger

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-04-PLAN.md — Full system/meta tools + Zod schemas

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-05-PLAN.md — Build + MCP client handshake smoke (DIST-03)

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

**Plans:** TBD

Plans:

- [ ] 02-01: TBD

### Phase 3: Diagnose & Issue Scan

**Goal:** As an AI agent, I want app/server diagnose and global issue scan, so that I can triage unhealthy deployments before acting.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** SYS-03, SYS-04, SYS-05, OUT-06
**Success Criteria** (what must be TRUE):

  1. Agent diagnoses app by UUID, name, or domain — receives status, health, env count, recent deployments
  2. Agent diagnoses server by UUID, name, or IP — receives resources, domains, validation state
  3. Agent runs global issue scan — surfaces unhealthy apps/DBs/services and unreachable servers
  4. Get/diagnose responses include follow-up action hints (e.g. "View logs", "Restart", "Deploy")

**Plans:** TBD

Plans:

- [ ] 03-01: TBD

### Phase 4: App Deploy Lifecycle

**Goal:** As an AI agent, I want full app lifecycle and deploy control with wait-mode, so that I can ship and monitor releases without manual Coolify UI.
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

**Plans:** TBD

Plans:

- [ ] 04-01: TBD

### Phase 5: Logs & Service/DB Ops

**Goal:** As an AI agent, I want bounded logs and service/DB lifecycle control, so that I can debug runtime issues and operate one-click services safely.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** APP-10, APP-11, SVC-03–05
**Success Criteria** (what must be TRUE):

  1. Agent reads app runtime logs with limit and optional follow mode — output stays within `max_chars`
  2. Agent fetches deployment build logs on demand with pagination
  3. Agent starts, stops, and restarts services and databases
  4. Agent reads service/DB logs with bounded tail
  5. Agent deploys/restarts service with pull-latest-images option

**Plans:** TBD

Plans:

- [ ] 05-01: TBD

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

**Plans:** TBD

Plans:

- [ ] 06-01: TBD

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

**Plans:** TBD

Plans:

- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Multi-Instance Auth | 1/5 | In Progress|  |
| 2. Discovery & Read Projections | 0/TBD | Not started | - |
| 3. Diagnose & Issue Scan | 0/TBD | Not started | - |
| 4. App Deploy Lifecycle | 0/TBD | Not started | - |
| 5. Logs & Service/DB Ops | 0/TBD | Not started | - |
| 6. Bulk, Emergency & Safety | 0/TBD | Not started | - |
| 7. Distribution & Docs | 0/TBD | Not started | - |

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
