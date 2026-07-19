# API Coverage — Coolify Services & Databases

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Phase 11 scope: SVC-06–10, DB-01–04 — create / update / delete / delete_preview on the `service` and `database` MCP tools.
> Prior-phase INTEGRATE rows are already shipped (Phases 2/5); listed so the Services + Databases surface is fully decided.

## Services (`/services`)

| capability | decision | reason |
|---|---|---|
| list services (`GET /services`) | INTEGRATE | Prior discovery/read phase; list already exposed for identity resolution via `resource.find` |
| get service (`GET /services/{uuid}`) | INTEGRATE | Prior service lifecycle phase; `service.get` |
| create one-click service (`POST /services` with `type`) | INTEGRATE | Phase 11 — `service({ action: 'create', type })` (SVC-06) |
| create custom service from Docker Compose YAML (`POST /services` with `docker_compose_raw`) | INTEGRATE | Phase 11 — `service({ action: 'create', compose })` or `compose_file`; MCP base64-encodes transparently (SVC-07) |
| update service (`PATCH /services/{uuid}`) | INTEGRATE | Phase 11 — curated fields + compose I/O + `force_domain_override` (SVC-08) |
| delete service (`DELETE /services/{uuid}`) | INTEGRATE | Phase 11 — confirm gate + safe delete defaults + `delete_preview` (SVC-09) |
| service start (`POST /services/{uuid}/start`) | INTEGRATE | Prior lifecycle phase; `service.start` |
| service stop (`POST /services/{uuid}/stop`) | INTEGRATE | Prior lifecycle phase; `service.stop` |
| service restart (`POST /services/{uuid}/restart`) | INTEGRATE | Prior lifecycle phase; `service.restart` (also used as `service.deploy` via `?latest=true`) |
| service env CRUD (`/services/{uuid}/envs*`) | OPT-OUT | Deferred to Phase 12 env-var CRUD |
| service storages (`/services/{uuid}/storages*`) | OPT-OUT | Not needed yet — storage volume CRUD not in v2.0 service CRUD goals (API gap per Out of Scope) |
| service scheduled-tasks (`/services/{uuid}/scheduled-tasks*`) | OPT-OUT | Not needed yet — scheduled tasks are a separate concern (API gap per Out of Scope) |

## Databases (`/databases`)

| capability | decision | reason |
|---|---|---|
| create PostgreSQL database (`POST /databases/postgresql`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'postgresql' })` (DB-01) |
| create MySQL database (`POST /databases/mysql`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'mysql' })` (DB-01) |
| create MariaDB database (`POST /databases/mariadb`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'mariadb' })` (DB-01) |
| create MongoDB database (`POST /databases/mongodb`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'mongodb' })`; includes `mongo_initdb_root_password` / `mongo_initdb_database` per Pitfall 2 (DB-01) |
| create Redis database (`POST /databases/redis`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'redis' })` (DB-01) |
| create Clickhouse database (`POST /databases/clickhouse`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'clickhouse' })` (DB-01) |
| create DragonFly database (`POST /databases/dragonfly`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'dragonfly' })` (DB-01) |
| create KeyDB database (`POST /databases/keydb`) | INTEGRATE | Phase 11 — `database({ action: 'create', engine: 'keydb' })` (DB-01) |
| get database (`GET /databases/{uuid}`) | INTEGRATE | Prior database lifecycle phase; `database.get` |
| update database (`PATCH /databases/{uuid}`) | INTEGRATE | Phase 11 — curated fields + `is_public` / `public_port` with confirm gate (DB-02, DB-04) |
| delete database (`DELETE /databases/{uuid}`) | INTEGRATE | Phase 11 — confirm gate + safe delete defaults + `delete_preview` (DB-03) |
| database start (`POST /databases/{uuid}/start`) | INTEGRATE | Prior lifecycle phase; `database.start` |
| database stop (`POST /databases/{uuid}/stop`) | INTEGRATE | Prior lifecycle phase; `database.stop` |
| database restart (`POST /databases/{uuid}/restart`) | INTEGRATE | Prior lifecycle phase; `database.restart` |
| database env CRUD (`/databases/{uuid}/envs*`) | OPT-OUT | Deferred to Phase 12 env-var CRUD |
| database storages (`/databases/{uuid}/storages*`) | OPT-OUT | Not needed yet — storage volume CRUD not in v2.0 database CRUD goals (API gap per Out of Scope) |
| database backup schedules (`/databases/{uuid}/backups*`) | OPT-OUT | Deferred to Phase 13 database backups |
| database backup executions (`/databases/{uuid}/backups/{scheduled_backup_uuid}/executions*`) | OPT-OUT | Deferred to Phase 13 database backups |
| database logs (`/databases/{uuid}/logs`) | OPT-OUT | SVC-04 deferred to v1.1 — Coolify 4.1.x REST API has no /services/{uuid}/logs or /databases/{uuid}/logs endpoint (PR #6293 backport pending) |

## Coverage Summary

- Services: 9 INTEGRATE (lifecycle from prior phases + 4 CRUD actions from Phase 11) · 3 OPT-OUT (env CRUD Phase 12, storages API gap, scheduled-tasks API gap)
- Databases: 14 INTEGRATE (8 engine posters + lifecycle + 3 CRUD actions from Phase 11) · 4 OPT-OUT (env CRUD Phase 12, storages API gap, backups Phase 13, logs v1.1)
- Every Phase 11 requirement (SVC-06–10, DB-01–04) maps to at least one INTEGRATE row.
- Every OPT-OUT has a one-line reason referencing either a later phase, an API gap, or the v1.1 deferral.

## Requirement → Capability Trace

| Req | Capability (this phase) |
|-----|-------------------------|
| SVC-06 | `POST /services` with `type` (one-click) |
| SVC-07 | `POST /services` with `docker_compose_raw` (custom compose, base64-encoded by MCP) |
| SVC-08 | `PATCH /services/{uuid}` (curated fields + compose I/O) |
| SVC-09 | `DELETE /services/{uuid}` (confirm gate + safe defaults + `delete_preview`) |
| SVC-10 | `POST/PATCH /services` 409 -> `COOLIFY_409` + `force_domain_override` hint (mirrors APP-21) |
| DB-01 | 8 × `POST /databases/{engine}` |
| DB-02 | `PATCH /databases/{uuid}` (curated engine-specific fields) |
| DB-03 | `DELETE /databases/{uuid}` (confirm gate + safe defaults + `delete_preview`) |
| DB-04 | `POST/PATCH /databases/{uuid}` with `is_public` / `public_port` (confirm gate per D-12) |
