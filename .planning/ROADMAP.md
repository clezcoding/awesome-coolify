# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v2.0 Creation & CRUD** — Phases 8–13 (planning 2026-07-16)

## Phases

<details>
<summary>✅ v1.0 Ops MVP (Phases 1–7) — SHIPPED 2026-07-16</summary>

- [x] Phase 1: Foundation & Multi-Instance Auth (5/5) — completed 2026-07-12
- [x] Phase 2: Discovery & Read Projections (5/5) — completed 2026-07-12
- [x] Phase 3: Diagnose & Issue Scan (7/7) — completed 2026-07-12
- [x] Phase 4: App Deploy Lifecycle (5/5) — completed 2026-07-13
- [x] Phase 5: Logs & Service/DB Ops (5/5) — completed 2026-07-16 (SVC-04 deferred v1.1)
- [x] Phase 6: Bulk, Emergency & Safety (3/3) — completed 2026-07-16
- [x] Phase 7: Distribution & Docs (7/7) — completed 2026-07-16

Full phase details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### v2.0 Creation & CRUD (Phases 8–13)

- [x] Phase 8: Keys & Server CRUD (completed 2026-07-16)
- [x] Phase 9: Project & Environment CRUD (completed 2026-07-17)
- [x] Phase 10: Application CRUD & Safety (completed 2026-07-19)
- [x] Phase 11: Service & Database CRUD (completed 2026-07-19)
- [ ] Phase 12: Environment Variables & Smart Sync
- [ ] Phase 13: Database Backups

## Progress

| Phase | Milestone | Requirements | Status | Completed |
|-------|-----------|--------------|--------|-----------|
| 1. Foundation & Multi-Instance Auth | v1.0 | — | Complete | 2026-07-12 |
| 2. Discovery & Read Projections | v1.0 | — | Complete | 2026-07-12 |
| 3. Diagnose & Issue Scan | v1.0 | — | Complete | 2026-07-12 |
| 4. App Deploy Lifecycle | v1.0 | — | Complete | 2026-07-13 |
| 5. Logs & Service/DB Ops | v1.0 | — | Complete | 2026-07-16 |
| 6. Bulk, Emergency & Safety | v1.0 | — | Complete | 2026-07-16 |
| 7. Distribution & Docs | v1.0 | — | Complete | 2026-07-16 |
| 8. Keys & Server CRUD | v2.0 | 5/5 | Complete    | 2026-07-16 |
| 9. Project & Environment CRUD | v2.0 | 5 | Complete    | 2026-07-18 |
| 10. Application CRUD & Safety | v2.0 | 14 | Complete    | 2026-07-19 |
| 11. Service & Database CRUD | v2.0 | 9 | In Progress|  |
| 12. Environment Variables & Smart Sync | v2.0 | 6 | Planned | — |
| 13. Database Backups | v2.0 | 6 | Planned | — |

**v2.0 coverage:** 50 requirements mapped across 6 phases · 100% covered

---

## v2.0 Phase Details

### Phase 8: Keys & Server CRUD

**Slug:** `keys-server-crud`
**Goal:** Agent can register SSH private keys and stand up target servers with auto-validation — the prerequisites for every subsequent deployment target.

**Requirements:** KEY-01, KEY-02, KEY-03, KEY-04, KEY-05, SRV-01, SRV-02, SRV-03, SRV-04, SRV-05

**Success criteria:**

1. Agent calls `private_key({ action: 'create' })` with PEM content and receives masked key UUID + name; subsequent `private_key({ action: 'get' })` returns metadata without leaking PEM material.
2. Agent calls `server({ action: 'create' })` with name/IP/port/user and a referenced `private_key_uuid`; server is registered and a validation call is automatically chained, returning `{ status: 'valid', reachable: true }` or a structured `COOLIFY_SSH_UNREACHABLE` recovery hint.
3. Agent calls `server({ action: 'update', is_build_server: true })` and `server({ action: 'validate' })` on demand; responses reflect updated fields and fresh validation state.
4. Agent calls `server({ action: 'delete' })` without `confirm: true` and receives `COOLIFY_CONFIRM_REQUIRED`; with `confirm: true` the server is removed and `delete_volumes` defaults to `false` unless explicitly overridden.
5. Agent calls `private_key({ action: 'delete' })` with `confirm: true` for an unused key and succeeds; deletion of a key still referenced by a server returns a structured `COOLIFY_409` hint listing dependent server UUIDs.

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 08-00-PLAN.md — Wave 0 RED test scaffolds for private_key + server (KEY-01..05, SRV-01..05)
- [x] 08-01-PLAN.md — API client + errors + projections + resource.list type=server extensions

**Wave 2** *(ready — Wave 1 complete)*

- [x] 08-02-PLAN.md — private_key tool handler (list/get/create/update/delete/delete_preview)
- [x] 08-03-PLAN.md — server tool handler (get/create/update/delete/delete_preview/validate)

**Wave 3** *(ready — Wave 2 complete)*

- [x] 08-04-PLAN.md — Register private_key + server tools in MCP server

### Phase 9: Project & Environment CRUD

**Slug:** `project-environment-crud`
**Goal:** Agent can create the organizational boundaries (projects + environments) that scope every app, service, and database in later phases.

**Requirements:** PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05

**Success criteria:**

1. Agent calls `project({ action: 'create' })` with name + description and receives the new project UUID; `project({ action: 'get' })` returns the created fields verbatim.
2. Agent calls `project({ action: 'update' })` to rename or change description; subsequent get reflects the new values.
3. Agent calls `project({ action: 'delete' })` without `confirm: true` and gets `COOLIFY_CONFIRM_REQUIRED`; with `confirm: true` on an empty project, deletion succeeds.
4. Agent calls `environment({ action: 'create' })` scoped to a project UUID/name and receives the environment UUID; `resource.list` afterwards shows the new environment.
5. Agent attempts `environment({ action: 'delete' })` on a non-empty environment and receives a structured `COOLIFY_409` hint listing child resource UUIDs; deletion of an empty environment with `confirm: true` succeeds.

**Plans:** 6/6 plans executed

Plans:

- [x] 09-05-PLAN.md

**Wave 1**

- [x] 09-00-PLAN.md — Wave 0 RED test scaffolds for project + environment (PROJ-01..05)
- [x] 09-01-PLAN.md — API client CRUD + resource.list type=project|environment + project/env name resolvers

**Wave 2** *(ready — Wave 1 complete)*

- [x] 09-02-PLAN.md — project tool handler (list/get/create/update/delete/delete_preview)
- [x] 09-03-PLAN.md — environment tool handler (list/get/create/delete/delete_preview; no update — API gap)

**Wave 3** *(ready — Wave 2 complete)*

- [x] 09-04-PLAN.md — Register project + environment tools in MCP server

**API coverage:** `COVERAGE.md` — projects/environments endpoint matrix (9 INTEGRATE, 6 OPT-OUT)

### Phase 10: Application CRUD & Safety

**Slug:** `application-crud-safety`
**Goal:** Agent can create all five application source types, update their configuration, and delete them safely — with the cross-cutting safety guarantees (confirm gates, safe delete defaults, Zod validation, secret masking) enforced as the canonical reference implementation for later phases.

**Requirements:** APP-12, APP-13, APP-14, APP-15, APP-16, APP-17, APP-18, APP-19, APP-20, APP-21, SAF-01, SAF-02, SAF-03, SAF-04

**Success criteria:**

1. Agent creates an application from each of public Git, private Git via deploy key, private Git via GitHub App, inline Dockerfile, and Docker registry image; each returns the app UUID and accepts `instant_deploy: true` to trigger a first deploy on creation.
2. Agent calls `application({ action: 'update' })` to set FQDN, build commands, healthcheck, and labels; subsequent `application({ action: 'get' })` reflects every changed field.
3. Agent calls `application({ action: 'delete' })` without `confirm: true` and receives `COOLIFY_CONFIRM_REQUIRED` (SAF-01); with `confirm: true`, deletion proceeds with `delete_volumes=false` and `delete_configurations=false` defaults (SAF-02) unless explicitly overridden.
4. Agent attempts to create an application with a duplicate FQDN and receives a structured 409 recovery hint offering `force_domain_override: true` (APP-21); retry with that flag succeeds.
5. Agent enables HTTP basic auth on an application (APP-19) and receives masked credentials in the response; `reveal: true` opt-in unmasks them per SAF-04.
6. Malformed create/update payloads are rejected by Zod before any API call (SAF-03), returning a structured `COOLIFY_VALIDATION_ERROR` with the offending field paths.

**Plans:** 5/5 plans executed

Plans:

**Wave 1** *(parallel — no file overlap)*

- [x] 10-00-PLAN.md — Wave 0 RED test scaffolds for application create/update/delete/delete_preview (APP-12..APP-21, SAF-01..SAF-04)
- [x] 10-01-PLAN.md — API client CRUD (5 POST + PATCH + DELETE) + COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough

**Wave 2** *(ready — Wave 1 complete)*

- [x] 10-02-PLAN.md — application create handler (5 source types, instant_deploy fire-and-forget, 409 force_domain_override, Zod validation)

**Wave 3** *(ready — Wave 2 complete)*

- [x] 10-03-PLAN.md — application update handler (curated fields, HTTP basic auth, secret masking, 409 on update)

**Wave 4** *(ready — Wave 3 complete)*

- [x] 10-04-PLAN.md — application delete + delete_preview handler (confirm gate, safe defaults, two-stage preview)

### Phase 11: Service & Database CRUD

**Slug:** `service-database-crud`
**Goal:** Agent can deploy multi-container stacks as custom services and provision managed databases across 8 engines — with transparent base64 compose encoding, public access toggles, and safe delete defaults.

**Requirements:** SVC-06, SVC-07, SVC-08, SVC-09, SVC-10, DB-01, DB-02, DB-03, DB-04

**Success criteria:**

1. Agent calls `service({ action: 'create', type: '<one-click>' })` with a one-click service type and receives the service UUID; subsequent `service({ action: 'get' })` returns the deployed compose content.
2. Agent calls `service({ action: 'create', compose: '<raw YAML>' })` and the MCP transparently base64-encodes the YAML for the Coolify API (SVC-07); the agent never sees base64 in its input or output.
3. Agent calls `service({ action: 'update' })` to change compose or configuration; `service({ action: 'delete' })` with `confirm: true` removes the service with safe defaults (SVC-09).
4. Agent creates a database of each supported engine (postgresql, mysql, mariadb, mongodb, redis, clickhouse, dragonfly, keydb) and receives the connection UUID; `database({ action: 'get' })` masks connection strings per SAF-04.
5. Agent calls `database({ action: 'update', public_access: true, public_port: 5432 })` and the database becomes externally reachable (DB-04); disabling public access reverses the state.
6. Duplicate-FQDN create attempts on services return a structured 409 hint with `force_domain_override` option (SVC-10), mirroring the APP-21 pattern.

**Plans:** 7/7 plans executed

Plans:

**Wave 1** *(parallel — no file overlap)*

- [x] 11-00-PLAN.md — Wave 0 RED test scaffolds for service + database CRUD (SVC-06..SVC-10, DB-01..DB-04)
- [x] 11-01-PLAN.md — API client CRUD (3 service + 8 database posters + update/delete) + yaml-validator helper (encode/decode/validate)

**Wave 2** *(ready — Wave 1 complete; parallel — service.ts vs database.ts no overlap)*

- [x] 11-02-PLAN.md — service create handler (one-click type XOR compose, transparent base64, instant_deploy default true, 409 force_domain_override, soft success)
- [x] 11-03-PLAN.md — database create handler (8 engines, public access confirm gate D-12, instant_deploy default true, secret masking)

**Wave 3** *(ready — Wave 2 complete; parallel — service.ts vs database.ts no overlap)*

- [x] 11-04-PLAN.md — service update + delete + delete_preview handler (curated PATCH, compose I/O, confirm gate, safe defaults, two-stage preview)
- [x] 11-05-PLAN.md — database update + delete + delete_preview handler (curated PATCH, update-path public access confirm gate, safe defaults, two-stage preview)

**Gap Closure** *(G-11-3, G-11-4 — Coolify 4.1.2 plain-YAML compose projection)*

- [x] 11-06-PLAN.md — projectServiceCompose plain-YAML fallback chain + live UAT re-test Tests 3+4

**API coverage:** `COVERAGE.md` — services/databases endpoint matrix (23 INTEGRATE, 7 OPT-OUT)

### Phase 12: Environment Variables & Smart Sync

**Slug:** `environment-variables-smart-sync`
**Goal:** Agent can manage runtime configuration on apps, services, and databases — individual CRUD, bulk patch, and a local `.env` diff-sync engine — with full flag support and no secret leakage.

**Requirements:** ENV-01, ENV-02, ENV-03, ENV-04, ENV-05, ENV-06

**Success criteria:**

1. Agent creates an env var on an application, a service, and a database (ENV-01); each returns the env var UUID with the value masked by default.
2. Agent updates and deletes env vars by UUID (ENV-02, ENV-03); `reveal: true` is required to read back the plaintext value, otherwise `***` is returned (SAF-04 continuity).
3. Agent calls `application({ action: 'envs:bulk-update' })` with a list of `{ key, value, ... }` entries and the MCP issues a single `PATCH /applications/{uuid}/envs/bulk` call (ENV-04); response confirms per-key disposition.
4. Agent calls `application({ action: 'envs:sync', env_file: '.env' })` and the MCP diffs the local file against remote state, reporting `{ added, updated, unchanged, removed }` and applying creates/updates without deleting unspecified keys (ENV-05).
5. Env var payloads accept all supported flags — `is_preview`, `is_literal`, `is_multiline`, `is_shown_once` — and the flags round-trip correctly on subsequent get (ENV-06).
6. Sync and bulk operations never log raw env values to stderr; logs redact values with the same redactor used for API errors.

### Phase 13: Database Backups

**Slug:** `database-backups`
**Goal:** Agent can configure, list, update, delete, and trigger database backup schedules — and inspect execution history — for any database created in Phase 11.

**Requirements:** BAK-01, BAK-02, BAK-03, BAK-04, BAK-05, BAK-06

**Success criteria:**

1. Agent calls `database({ action: 'backup:create' })` with frequency, retention, and optional S3 settings; the schedule is registered and returned with its UUID (BAK-01).
2. Agent calls `database({ action: 'backup:list' })` and receives all backup configurations for that database with schedule, retention, and destination summary (BAK-02).
3. Agent calls `database({ action: 'backup:update' })` to change frequency or retention (BAK-03) and `database({ action: 'backup:delete' })` with `confirm: true` to remove a schedule (BAK-04); deletion without confirm returns `COOLIFY_CONFIRM_REQUIRED`.
4. Agent calls `database({ action: 'backup:now' })` and the MCP triggers an immediate backup, returning a job/execution reference (BAK-05).
5. Agent calls `database({ action: 'backup:history' })` and receives the execution log with status, timestamps, and size per run (BAK-06).
6. S3 credentials in backup configuration responses are masked by default; `reveal: true` opt-in unmasks them per SAF-04 continuity.

---

## v2.x+ (Future — Not Mapped to Phases)

Full feature parity with Coolify CLI, user-coolify MCP, and coolify-backup-mcp. Detailed REQ-IDs live in [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) § v2. Phases will be defined via `/gsd-new-milestone`.

| Group | Scope | REQ Prefix |
|-------|-------|------------|
| Context & Auth Extensions | Debug mode, shell completion, self-update, **multi-instance CRUD (CTX-04–06)** | V2-CTX |
| Teams | List, get, current team, members, invite | V2-TEAM |
| Cloud Provider | Hetzner/DigitalOcean tokens and provisioning | V2-CLOUD |
| GitHub Apps | CRUD, repos/branches, enterprise URLs | V2-GH |
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

**v1.1 candidate:** SVC-04 service/DB bounded log tail (blocked on Coolify v4.1.3+ / PR #6293 backport).

**Explicitly out of scope until Coolify API supports it:** container exec (V2-RT-01 blocked on API); global deployments list (unreliable in 4.1.x); storage volume CRUD (no REST endpoint); scheduled tasks / cron CRUD (no REST endpoint).

---

## Backlog

> Items here are unsequenced. Promote with `/gsd-review-backlog` when ready for active planning.

### Phase 999.1: Feasibility Audit — Milestone-Ideen Jul 2026 (BACKLOG)

**Gate:** Start only after **v2.0 Creation & CRUD** (Phases 8–13) is fully complete.

**Goal:** Capture explore-session feasibility findings for four post-v2.0 ideas; use as input for v3.0 milestone scoping.

**Requirements:** TBD (promote to REQ-IDs when v3.0 is opened)

**Plans:** 0 plans

**Findings summary:**

| Idea | Verdict | Blocker / Dependency |
|------|---------|----------------------|
| Coolify Cloud MCP support | ✅ Likely works today (`COOLIFY_URL=https://app.coolify.io`) | Docs/branding + live smoke test |
| Standard-Setup Tool (incl. `gh` repo create) | ✅ API ready; MCP Create-CRUD needed first | v2.0 Phases 8–11; GitHub CLI preflight |
| Custom Skills pro IDE | ✅ Pure DX, no API | Content + per-IDE install paths |
| Lokale Manifest-Datei (UUIDs, Domains) | ✅ Agent-side only | Schema + `.gitignore` convention |

**Setup-Tool design note (Idee 2):** On first invoke, preflight `gh` CLI — check installed + authenticated. If missing, emit step-by-step setup guide and pause until user confirms ready. Repo creation via `gh repo create`; Coolify wiring via existing GitHub App + Create endpoints (post-v2.0).

Plans:

- [ ] TBD (promote with `/gsd-review-backlog` after v2.0 ships)

---
*Last updated: 2026-07-18 after Phase 9 complete*
