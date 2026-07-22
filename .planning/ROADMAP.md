# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Creation & CRUD** — Phases 8–13 (shipped 2026-07-21) → [archive](milestones/v2.0-ROADMAP.md)
- 🚧 **v3.0 Platform Foundation** — Phases 15–18 (in progress)
- 📋 **v3.1 Setup & Skills** — Phases 19+ (planned)

## v3.0 Platform Foundation — Milestone Goal

Agent can manage multiple Coolify instances (self-hosted + Cloud), route any tool call to a named instance, and persist UUID/domain metadata locally across sessions via a gitignored workspace manifest. A single CLI live-UAT script proves all 14 tools against real Coolify data before the milestone ships.

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

<details>
<summary>✅ v2.0 Creation & CRUD (Phases 8–13) — SHIPPED 2026-07-21</summary>

- [x] Phase 8: Keys & Server CRUD (5/5) — completed 2026-07-16
- [x] Phase 9: Project & Environment CRUD (6/6) — completed 2026-07-18
- [x] Phase 10: Application CRUD & Safety (5/5) — completed 2026-07-19
- [x] Phase 11: Service & Database CRUD (7/7) — completed 2026-07-19
- [x] Phase 12: Environment Variables & Smart Sync (7/7) — completed 2026-07-21
- [x] Phase 13: Database Backups (5/5) — completed 2026-07-21

Full phase details: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

</details>

### 🚧 v3.0 Platform Foundation (In Progress)

- [x] **Phase 15: Multi-Instance Registry & Routing** - Secure `instances.json` CRUD with per-request routing and env override (completed 2026-07-21)
- [x] **Phase 16: Coolify Cloud & Server Branding** - `app.coolify.io` support, cloud error hints, MCP list icon via `serverInfo.icons`, docs EN/DE (completed 2026-07-22)
- [ ] **Phase 17: Local Manifest & Sync** - `.coolify/manifest.json` schema, gitignore injection, `manifest:sync` reconciliation
- [ ] **Phase 18: Live UAT Harness** - One CLI script testing all 14 tools against real Coolify data with JSON report

### 📋 v3.1 Setup & Skills (Planned)

- [ ] **Phase 19+:** Standard setup wizard (`gh` preflight + Coolify wiring) and IDE skills package

## Phase Details

### Phase 15: Multi-Instance Registry & Routing

**Goal**: Agent can manage named Coolify instances in a secure registry and route any tool call to a chosen instance without cross-instance leakage
**Depends on**: Phase 13 (v2.0 shipped)
**Requirements**: CTX-04, CTX-05, CTX-06, CTX-08, CTX-09
**Success Criteria** (what must be TRUE):

  1. Agent can add, list, update, and delete named instances in `~/.coolify-mcp/instances.json` and the entries persist across sessions
  2. Agent can set a default instance, and `COOLIFY_URL`/`COOLIFY_TOKEN` env vars override the registry default when present
  3. Agent can call any of the 14 tools with an optional `instance` parameter and the call routes to that named instance's credentials
  4. Registry directory and file are created with `0o700`/`0o600` permissions, and list/get responses redact tokens unless `reveal: true`
  5. Concurrent registry writes do not corrupt the file (atomic temp-file + rename)

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 15-00-PLAN.md — Wave 0 RED test scaffolds (instance-registry.test.ts, instance.test.ts, env.test.ts soft-start)
- [x] 15-01-PLAN.md — InstanceManager core (CRUD, atomic writes, 0o700/0o600 perms, resolveCredentials) + errors.ts extension

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-02-PLAN.md — `instance` tool (list/get/add/update/delete/set-default/import-env) + softened env.ts + server soft-start
- [x] 15-03-PLAN.md — Route 5 lifecycle tools (application, service, database, deployment, emergency) via optional `instance` param

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-04-PLAN.md — Route 7 read/CRUD tools (resource, system, diagnose, server, private_key, project, environment) via optional `instance` param

**Cross-cutting constraints:**

- Each handler resolves credentials per-request via InstanceManager.resolveCredentials(args.instance, process.env) before constructing the Coolify client (CTX-06, D-10)
- Explicit `instance` param wins silently over env when both present (D-11)
- No call mixes env URL with registry token — partial env throws COOLIFY_PARTIAL_ENV (D-13)
- When no creds resolved, handler returns COOLIFY_NO_INSTANCE envelope (D-18/D-20)

### Phase 16: Coolify Cloud & Server Branding

**Goal**: Agent can operate Coolify Cloud with the same tool surface, recover from cloud-only restrictions, and users see a branded icon in the MCP server list (like pg-aiguide)
**Depends on**: Phase 15
**Requirements**: CLD-01, CLD-02, CLD-03, BRND-01, BRND-02, BRND-03
**Success Criteria** (what must be TRUE):

  1. Agent can connect to `https://app.coolify.io` with a team-scoped Bearer token using the same tools as self-hosted instances
  2. Cloud-only or permission-denied endpoint failures return structured recovery hints instead of opaque 403/404 loops
  3. README EN/DE and install docs include a Coolify Cloud setup path with smoke-test instructions
  4. MCP `initialize` response includes `serverInfo.icons` pointing at a public HTTPS PNG (192×192 Hex Robot Helper on brand violet)
  5. Cursor MCP server list displays the awesome-coolify icon after reconnect (or documents known client limitation with title/description fallback)
  6. `McpServer` exposes `title`, `description`, and `websiteUrl` alongside icons

**Plans**: 5/5 plans executed

Plans:

**Wave 0**

- [x] 16-00-PLAN.md — Wave 0 RED test scaffolds (server.test.ts branding, errors.test.ts cloud mapping, instance.test.ts cloud-info)
- [x] 16-01-PLAN.md — Cloud error codes (COOLIFY_CLOUD_FORBIDDEN / COOLIFY_CLOUD_UNSUPPORTED) + isCloudUrl hostname detection in errors.ts
- [x] 16-02-PLAN.md — instance.cloud-info local/static discovery action (registry|env|infer source paths)
- [x] 16-03-PLAN.md — MCP branding: dedicated 192x192 icon asset + McpServer icons/title/description/websiteUrl

**Wave 1** *(blocked on Wave 0 completion)*

- [x] 16-04-PLAN.md — Docs EN/DE cloud topic + README links + CONVENTIONS dual-repo cleanup + D-09 Cursor icon screenshot verify gate

### Phase 17: Local Manifest & Sync

**Goal**: Agent can persist project/environment/server/resource UUIDs and domains in a workspace-local manifest and keep it fresh against the live API
**Depends on**: Phase 16
**Requirements**: MAN-01, MAN-02, MAN-03, MAN-04
**Success Criteria** (what must be TRUE):

  1. Agent can read and write `.coolify/manifest.json` storing project, environment, server, and resource UUIDs plus domains
  2. First manifest write auto-appends `.coolify/` to the workspace `.gitignore` if not already present
  3. Agent can run a `manifest:sync` action that reconciles manifest entries against the live API and refreshes stale UUIDs
  4. Operations against stale manifest UUIDs surface a refresh hint on API 404 (manifest is treated as cache, not source of truth)

**Plans**: 4 plans

Plans:

**Wave 0**

- [ ] 17-00-PLAN.md — Wave 0 RED test scaffolds (manifest utility, manifest MCP tool, project-root resolver) using it.fails + dynamic imports

**Wave 1** *(blocked on Wave 0 completion)*

- [ ] 17-01-PLAN.md — ManifestManager core (load/save/upsert/remove/hasUuid/clear, atomic writes, project-root resolution, .gitignore auto-append, autoUpsert/autoRemove hooks API) + committed example template (MAN-01, MAN-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 17-02-PLAN.md — `manifest` MCP tool with 7 actions (get/upsert/set/remove/sync/diff/clear) + server.ts registration + stale-UUID 404 hint injection in errors.ts (MAN-03, MAN-04)
- [ ] 17-03-PLAN.md — Auto-upsert/remove hooks wired into application/service/database mutation handlers with _meta.manifestWarning on best-effort failure (D-09, D-11)

### Phase 18: Live UAT Harness

**Goal**: Maintainer can prove all 14 MCP tools work against a live Coolify instance with one CLI script before v3.0 ships
**Depends on**: Phase 17
**Requirements**: UAT-01, UAT-02, UAT-03, UAT-04, UAT-05, UAT-06
**Success Criteria** (what must be TRUE):

  1. Maintainer can run one CLI script that exercises all 14 MCP tools against a live Coolify instance with real data
  2. Script resolves credentials from `.cursor/mcp.json`, env vars, or `instances.json` without printing tokens in output
  3. Script emits a structured JSON pass/fail report per tool/action with duration, error code, and recovery-hint presence
  4. Script covers v3.0 additions: multi-instance routing, cloud instance profile, and manifest read/write/sync
  5. Script documents safe preconditions and never deletes production resources without explicit `--confirm-destructive`
  6. CONTRIBUTING.md documents how to run live UAT locally and interpret failures

**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–7 | v1.0 | 37/37 | Complete | 2026-07-16 |
| 8–13 | v2.0 | 36/36 | Complete | 2026-07-21 |
| 14 | v3.0 | 0/0 | Archived (feasibility audit) | 2026-07-21 |
| 15 | v3.0 | 5/5 | Complete    | 2026-07-21 |
| 16 | v3.0 | 5/5 | Complete    | 2026-07-22 |
| 17 | v3.0 | 0/4 | Planned | - |
| 18 | v3.0 | 0/TBD | Not started | - |

**Next:** `/gsd-execute-phase 17`

---

*Last updated: 2026-07-21 — v3.0 roadmap revised (21 requirements: +BRND icon, +UAT harness)*
