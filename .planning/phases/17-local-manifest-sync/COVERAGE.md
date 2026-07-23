# API Coverage — Phase 17 Local Manifest & Sync

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 17 adds a workspace-local `.coolify/manifest.json` cache plus a `manifest`
MCP tool. It reuses the existing Coolify REST client (Phases 1–13) for
`sync`/`diff` only — no new Coolify endpoints. New work is (a) local file I/O
via `ManifestManager`, (b) seven MCP actions (`get`/`upsert`/`set`/`remove`/
`clear`/`sync`/`diff`), (c) stale-404 recovery hints, and (d) best-effort
auto-upsert hooks on application/service/database mutations.

The API-Coverage gate fires on MCP + API wiring terms, so this matrix records
the integrate/opt-out decisions for the Phase 17 surface.

## Capability surface

| capability | decision | reason |
|---|---|---|
| manifest.get local cache read | INTEGRATE | |
| manifest.upsert single resource/key write | INTEGRATE | |
| manifest.set full replace | INTEGRATE | |
| manifest.remove single keys/resources | INTEGRATE | |
| manifest.clear with confirm gate | INTEGRATE | |
| manifest.sync remote-wins UUID merge | INTEGRATE | |
| manifest.diff always non-destructive | INTEGRATE | |
| manifest.sync dry_run planned diff | INTEGRATE | |
| manifest.sync prune orphans (confirm+prune) | INTEGRATE | |
| optional `instance` param on sync/diff only | INTEGRATE | |
| soft-start: local actions without Coolify creds | INTEGRATE | |
| sync/diff without creds → COOLIFY_NO_INSTANCE | INTEGRATE | |
| ManifestManager atomic write + write lock | INTEGRATE | |
| ensureGitignore append `.coolify/` on save | INTEGRATE | |
| resolveProjectRoot walk-up (.git/package.json/.coolify) | INTEGRATE | |
| committed `.coolify-manifest.example.json` (no secrets) | INTEGRATE | |
| 404 stale-manifest recovery hints (manifest.sync/diff) | INTEGRATE | |
| autoUpsert/autoRemove on application mutations | INTEGRATE | |
| autoUpsert/autoRemove on service mutations | INTEGRATE | |
| autoUpsert/autoRemove on database mutations | INTEGRATE | |
| `_meta.manifestWarning` on hook failure (best-effort) | INTEGRATE | |
| tokens/secrets in `.coolify/manifest.json` | OPT-OUT | explicitly rejected — tokens stay in `~/.coolify-mcp/instances.json` or env (D-06 / MAN pitfalls) |
| auto-sync / auto-retry mid-call on 404 | OPT-OUT | explicitly rejected by D-15 — hints only, no mid-call sync |
| shared committed live `.coolify/manifest.json` in git | OPT-OUT | explicitly out of scope — example template only (D-08 / REQUIREMENTS) |
| `instance` param on local get/upsert/set/remove/clear | OPT-OUT | explicitly rejected by D-03 — local file actions never take instance |
| project/application tools absorb manifest actions | OPT-OUT | explicitly rejected by D-01 — dedicated `manifest` domain tool |
| setup wizard / IDE skills for manifest | OPT-OUT | deferred to v3.1 per phase boundary |
| live UAT harness against real Coolify | OPT-OUT | deferred to Phase 18 per ROADMAP |
| auto-hooks on project/environment/server mutations | OPT-OUT | D-09 scopes hooks to application/service/database only |

---

*Authored: 2026-07-22 — Phase 17 verify:pre gate*
