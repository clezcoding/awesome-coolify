# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)

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

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation & Multi-Instance Auth | v1.0 | 5/5 | Complete | 2026-07-12 |
| 2. Discovery & Read Projections | v1.0 | 5/5 | Complete | 2026-07-12 |
| 3. Diagnose & Issue Scan | v1.0 | 7/7 | Complete | 2026-07-12 |
| 4. App Deploy Lifecycle | v1.0 | 5/5 | Complete | 2026-07-13 |
| 5. Logs & Service/DB Ops | v1.0 | 5/5 | Complete | 2026-07-16 |
| 6. Bulk, Emergency & Safety | v1.0 | 3/3 | Complete | 2026-07-16 |
| 7. Distribution & Docs | v1.0 | 7/7 | Complete | 2026-07-16 |

---

## v2 Milestone (Future — Not Mapped to Phases)

Full feature parity with Coolify CLI, user-coolify MCP, and coolify-backup-mcp. Detailed REQ-IDs live in [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) § v2. Phases will be defined via `/gsd-new-milestone`.

| Group | Scope | REQ Prefix |
|-------|-------|------------|
| Context & Auth Extensions | Debug mode, shell completion, self-update, **multi-instance CRUD (CTX-04–06)** | V2-CTX |
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

**v1.1 candidate:** SVC-04 service/DB bounded log tail (blocked on Coolify v4.1.3+ / PR #6293 backport).

**Explicitly out of scope until Coolify API supports it:** container exec (V2-RT-01 blocked on API); global deployments list (unreliable in 4.1.x).

---
*Last updated: 2026-07-16 after v1.0 milestone archive*
