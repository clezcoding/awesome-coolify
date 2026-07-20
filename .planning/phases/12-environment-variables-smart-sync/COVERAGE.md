# API Coverage — Coolify Environment Variables

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Phase 12 scope: ENV-01–06 — env-var CRUD + bulk-update on `application`, `service`, `database` MCP tools; `envs:sync` (local `.env` diff-sync engine) on `application` only.
> Per D-01: NO dedicated `env` MCP tool — env capabilities are `envs:*` actions on the three existing domain tools.

## Applications (`/applications/{uuid}/envs`)

| capability | decision | reason |
|---|---|---|
| list envs (`GET /applications/{uuid}/envs`) | INTEGRATE | Phase 12 — `application({ action: 'envs:list' })` (ENV-01 read path, D-04) |
| get env by env_uuid (`GET /applications/{uuid}/envs` + client-side filter) | INTEGRATE | Phase 12 — `application({ action: 'envs:get', env_uuid })` or `key` lookup (D-03, D-04) |
| create env (`POST /applications/{uuid}/envs`) | INTEGRATE | Phase 12 — `application({ action: 'envs:create' })` with all 4 flags (ENV-01, ENV-06) |
| update env by env_uuid (`PATCH /applications/{uuid}/envs/bulk` with single-element `data[]`) | INTEGRATE | Phase 12 — `application({ action: 'envs:update', env_uuid })` resolves key from list, then bulk PATCH one element (research finding — no single-env PATCH-by-env_uuid endpoint; D-02) |
| delete env by env_uuid (`DELETE /applications/{uuid}/envs/{env_uuid}`) | INTEGRATE | Phase 12 — `application({ action: 'envs:delete', env_uuid, confirm: true })` (ENV-03, D-13) |
| bulk-update envs (`PATCH /applications/{uuid}/envs/bulk` with `data: [...]`) | INTEGRATE | Phase 12 — `application({ action: 'envs:bulk-update', entries: [...], confirm: true })` (ENV-04, D-10, D-11) |
| sync local `.env` (`GET` + `POST` + `PATCH /bulk` + optional `DELETE`) | INTEGRATE | Phase 12 — `application({ action: 'envs:sync', env_file|env_content, dry_run, prune, confirm, conflict_policy })` (ENV-05, D-05..D-08, D-12) — MCP-side diff engine, app-only per D-09 |

## Services (`/services/{uuid}/envs`)

| capability | decision | reason |
|---|---|---|
| list envs (`GET /services/{uuid}/envs`) | INTEGRATE | Phase 12 — `service({ action: 'envs:list' })` (D-04) |
| get env by env_uuid | INTEGRATE | Phase 12 — `service({ action: 'envs:get', env_uuid })` or `key` (D-03, D-04) |
| create env (`POST /services/{uuid}/envs`) | INTEGRATE | Phase 12 — `service({ action: 'envs:create' })` with all 4 flags (ENV-01, ENV-06) |
| update env by env_uuid (`PATCH /services/{uuid}/envs/bulk` single-element) | INTEGRATE | Phase 12 — `service({ action: 'envs:update', env_uuid })` (ENV-02, D-02) |
| delete env by env_uuid (`DELETE /services/{uuid}/envs/{env_uuid}`) | INTEGRATE | Phase 12 — `service({ action: 'envs:delete', env_uuid, confirm: true })` (ENV-03, D-13) |
| bulk-update envs (`PATCH /services/{uuid}/envs/bulk`) | INTEGRATE | Phase 12 — `service({ action: 'envs:bulk-update', confirm: true })` (ENV-04, D-10, D-11) |
| sync local `.env` | OPT-OUT | D-09 — sync is application-only per ENV-05; service sync deferred (CONTEXT.md Deferred Ideas) |

## Databases (`/databases/{uuid}/envs`)

| capability | decision | reason |
|---|---|---|
| list envs (`GET /databases/{uuid}/envs`) | INTEGRATE | Phase 12 — `database({ action: 'envs:list' })` (D-04) |
| get env by env_uuid | INTEGRATE | Phase 12 — `database({ action: 'envs:get', env_uuid })` or `key` (D-03, D-04) |
| create env (`POST /databases/{uuid}/envs`) | INTEGRATE | Phase 12 — `database({ action: 'envs:create' })` — flags `is_literal`, `is_multiline`, `is_shown_once` only; `is_preview` OMITTED per OpenAPI (Pitfall 1, D-16, ENV-06) |
| update env by env_uuid (`PATCH /databases/{uuid}/envs/bulk` single-element) | INTEGRATE | Phase 12 — `database({ action: 'envs:update', env_uuid })` — `is_preview` omitted (ENV-02) |
| delete env by env_uuid (`DELETE /databases/{uuid}/envs/{env_uuid}`) | INTEGRATE | Phase 12 — `database({ action: 'envs:delete', env_uuid, confirm: true })` (ENV-03, D-13) |
| bulk-update envs (`PATCH /databases/{uuid}/envs/bulk`) | INTEGRATE | Phase 12 — `database({ action: 'envs:bulk-update', confirm: true })` — `is_preview` omitted from bulk items (ENV-04, D-10, D-11) |
| sync local `.env` | OPT-OUT | D-09 — sync is application-only per ENV-05; database sync deferred (CONTEXT.md Deferred Ideas) |

## Flag Compatibility Matrix (ENV-06)

| flag | application | service | database | source |
|---|---|---|---|---|
| `is_preview` | ✅ | ✅ | ❌ omit | OpenAPI: database create/bulk bodies lack `is_preview` (Pitfall 1) |
| `is_literal` | ✅ | ✅ | ✅ | OpenAPI |
| `is_multiline` | ✅ | ✅ | ✅ | OpenAPI |
| `is_shown_once` | ✅ | ✅ | ✅ | OpenAPI |

All flags default `false` on create and on sync-created keys (D-16). Sync does NOT infer flags from `.env` content; caller may set flags explicitly on create/bulk entries.

## Coverage Summary

- Applications: 7 INTEGRATE (list, get, create, update, delete, bulk-update, sync) · 0 OPT-OUT
- Services: 6 INTEGRATE (list, get, create, update, delete, bulk-update) · 1 OPT-OUT (sync — D-09 app-only)
- Databases: 6 INTEGRATE (list, get, create, update, delete, bulk-update — `is_preview` omitted throughout) · 1 OPT-OUT (sync — D-09 app-only)
- Every Phase 12 requirement (ENV-01–06) maps to at least one INTEGRATE row.
- Every OPT-OUT has a one-line reason referencing D-09 (sync app-only) or the OpenAPI flag gap (Pitfall 1).

## Requirement → Capability Trace

| Req | Capability (this phase) |
|-----|-------------------------|
| ENV-01 | `POST /{uuid}/envs` on app + service + database (3 × create env) |
| ENV-02 | `PATCH /{uuid}/envs/bulk` single-element on app + service + database (update by env_uuid → key resolve → bulk one-element) |
| ENV-03 | `DELETE /{uuid}/envs/{env_uuid}` on app + service + database (confirm gate per D-13) |
| ENV-04 | `PATCH /applications/{uuid}/envs/bulk` multi-element (also service + database per D-10) |
| ENV-05 | MCP-side `.env` parse + diff + apply engine on `application` only (D-09) — `GET /applications/{uuid}/envs` + `POST` + `PATCH /bulk` + optional `DELETE /{env_uuid}` |
| ENV-06 | All 4 flags on app + service create/update/bulk; 3 flags (no `is_preview`) on database — round-trip via subsequent `envs:get` |

## Confirm Gate Matrix

| action | confirm required | source |
|---|---|---|
| `envs:list` | no | read-only |
| `envs:get` | no | read-only |
| `envs:create` | no | D-13 — single-key edits ungated |
| `envs:update` | no | D-13 — single-key edits ungated |
| `envs:delete` | YES — `COOLIFY_CONFIRM_REQUIRED` if missing | D-13 |
| `envs:bulk-update` | YES — `COOLIFY_CONFIRM_REQUIRED` if missing | D-11 |
| `envs:sync` with `dry_run: true` | no | D-12 — dry_run does not write |
| `envs:sync` with `dry_run: false` | YES — `COOLIFY_CONFIRM_REQUIRED` if missing | D-12 |
| `envs:sync` with `prune: true` | YES (plus `confirm: true`) | D-07 — prune requires confirm |

## Reveal Policy (D-14 / D-15)

- All `envs:*` responses mask env `value` as `***` by default via `sanitizeFullProjection`.
- `reveal: true` on the call unmasks values for that call only — keys, UUIDs, and flags remain visible always.
- Agent MUST ask the human whether they want masked or revealed values before setting `reveal: true`. Never auto-set.
- If `reveal: true` is passed without prior human preference, surface `ask_human_reveal` recovery hint.
- Sync/bulk responses and logs NEVER include plaintext values; `redactSecrets` is applied to stderr/error paths.
