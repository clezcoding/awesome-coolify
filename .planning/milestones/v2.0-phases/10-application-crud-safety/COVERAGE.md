# API Coverage — Coolify Applications

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Phase 10 scope: APP-12–21, SAF-01–04 — create / update / delete / delete_preview on the `application` MCP tool.
> Prior-phase INTEGRATE rows are already shipped (Phases 2/4); listed so the Applications surface is fully decided.

| capability | decision | reason |
|---|---|---|
| list applications (`GET /applications`) | INTEGRATE | Prior discovery/read phase; list already exposed for identity resolution |
| get application (`GET /applications/{uuid}`) | INTEGRATE | Prior app lifecycle phase; `application.get` |
| create public git (`POST /applications/public`) | INTEGRATE | Phase 10 — `source_type: public_git` |
| create private deploy-key (`POST /applications/private-deploy-key`) | INTEGRATE | Phase 10 — `source_type: private_deploy_key` |
| create private github-app (`POST /applications/private-github-app`) | INTEGRATE | Phase 10 — `source_type: private_github_app` (UUID ref only; no GitHub App CRUD) |
| create dockerfile (`POST /applications/dockerfile`) | INTEGRATE | Phase 10 — `source_type: dockerfile` |
| create dockerimage (`POST /applications/dockerimage`) | INTEGRATE | Phase 10 — `source_type: dockerimage` |
| update application (`PATCH /applications/{uuid}`) | INTEGRATE | Phase 10 — curated fields + `force_domain_override` + HTTP basic-auth |
| delete application (`DELETE /applications/{uuid}`) | INTEGRATE | Phase 10 — confirm gate + safe delete defaults + `delete_preview` |
| application logs (`GET /applications/{uuid}/logs`) | INTEGRATE | Prior lifecycle phase; `application.logs` |
| application start (`POST /applications/{uuid}/start`) | INTEGRATE | Prior lifecycle phase; `application.start` |
| application stop (`POST /applications/{uuid}/stop`) | INTEGRATE | Prior lifecycle phase; `application.stop` |
| application restart (`POST /applications/{uuid}/restart`) | INTEGRATE | Prior lifecycle phase; `application.restart` |
| application deploy (`POST /deploy` / app deploy path) | INTEGRATE | Prior lifecycle phase; `application.deploy` + wait/poll |
| create dockercompose application | OPT-OUT | Explicitly out of scope — route to `service.create` (Phase 11); Zod rejects `build_pack: dockercompose` |
| application env CRUD (`/applications/{uuid}/envs*`) | OPT-OUT | Deferred to Phase 12 env-var CRUD |
| application storages (`/applications/{uuid}/storages*`) | OPT-OUT | Not needed yet — storage volume CRUD not in v2.0 application CRUD goals |
| application PR previews (`/applications/{uuid}/previews*`) | OPT-OUT | Explicitly out of scope for Phase 10; preview policy not discussed |
| application scheduled-tasks (`/applications/{uuid}/scheduled-tasks*`) | OPT-OUT | Not needed yet — scheduled tasks are a separate concern |
| GitHub App resource CRUD | OPT-OUT | Explicitly out of scope — tracked as V2-GH; Phase 10 only accepts `github_app_uuid` on create |
