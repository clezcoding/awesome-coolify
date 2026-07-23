# Phase 17: Local Manifest & Sync - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can persist project/environment/server/resource UUIDs and domains in a workspace-local `.coolify/manifest.json`, keep it fresh against the live Coolify API via `manifest.sync`/`diff`, auto-append `.coolify/` to `.gitignore` on first write, and surface refresh hints when operations hit 404 on stale manifest UUIDs (manifest is cache, not source of truth). Not live UAT harness (Phase 18), not shared committed manifests (example file only), not setup wizard / IDE skills (v3.1).

</domain>

<decisions>
## Implementation Decisions

### Tool surface
- **D-01:** New domain tool `manifest` (not `meta` / not spread across `project`/`application`).
- **D-02:** v1 actions: `get`, `upsert`, `set` (full replace), `remove` (single keys/resources), `sync`, `diff`, `clear` (requires `confirm: true`).
- **D-03:** Optional `instance` routing param only on `sync` and `diff` (need live API creds). Local file actions (`get`/`set`/`upsert`/`remove`/`clear`) never take `instance`.
- **D-04:** Soft-start: local manifest actions work without Coolify credentials. `sync`/`diff` without resolved creds return `COOLIFY_NO_INSTANCE` + recovery hints (same pattern as Phase 15).

### Schema & instance binding
- **D-05:** Nested schema: `project` → `environments[]` → `resources[]`; top-level `servers[]`; domains attached on resources.
- **D-06:** Optional `instance` slug field in the manifest (registry name). Empty/absent → Env override or registry default at sync/diff time. Never store tokens in the manifest.
- **D-07:** Resource entry minimum: `uuid`, `type` (`application` | `service` | `database` | …), `name`, `domains[]`, plus parent project/environment UUIDs via nesting.
- **D-08:** Ship a committed example template (e.g. `.coolify-manifest.example.json` or under `docs/`) — no secrets. Shared live `.coolify/manifest.json` in git remains out of scope.

### Write triggers & gitignore
- **D-09:** Explicit writes are primary (`upsert`/`set`/`remove`/`clear`). Additionally, auto-upsert hooks run on **all** mutations (create/update/delete including domain changes) for `application`, `service`, and `database`.
- **D-10:** First successful manifest write (explicit or auto-hook) appends `.coolify/` to workspace `.gitignore` if not already present (MAN-02).
- **D-11:** Auto-hook failures are best-effort: primary tool action stays success; surface `_meta.manifestWarning` (do not fail deploy/CRUD because of disk/permission issues on the cache file).

### Sync & stale 404 behavior
- **D-12:** `manifest.sync` merges by UUID — remote wins on conflict; new remote entries are added; local orphans are retained by default and listed in the sync report.
- **D-13:** Orphan prune only with `confirm: true` (and/or explicit `prune: true` + confirm — planner picks exact flag names).
- **D-14:** `sync` supports `dry_run: true` (planned diff, no write). Separate `diff` action remains always non-destructive.
- **D-15:** On API 404 for a UUID that came from / looks like the manifest cache: structured error + recovery hint pointing to `manifest.sync` / `manifest.diff` only — **no** auto-sync mid-call and no auto-retry (MAN-04).

### Locked by roadmap / requirements (not re-discussed)
- Path `.coolify/manifest.json` (MAN-01).
- Manifest is cache/index, not source of truth (MAN-04 / PITFALLS).
- No tokens in manifest; tokens stay in `~/.coolify-mcp/instances.json` or env.
- Project-root resolution (walk up for `.git` / `package.json` / `.coolify/`) — research recommendation; implement under Claude discretion unless planner finds a clearer existing helper.

### Claude's Discretion
- Exact Zod schema field names / nesting keys (`version` stamp, `updatedAt` on file root, resource `type` enum completeness).
- Exact example file path/name (prefer repo-root `.coolify-manifest.example.json` unless docs layout fits better).
- Exact prune flag naming (`confirm` vs `prune`+`confirm`).
- How aggressively to detect “UUID came from manifest” for 404 hints (in-memory last-read vs file lookup vs always hint on resource 404 when manifest exists).
- Project-root resolver implementation details (reuse any existing path helpers if present).
- Atomic write pattern for manifest (mirror InstanceManager temp+rename if appropriate).

### Folded Todos
- **Lokale Projekt-Manifest-Datei für Coolify-Metadaten** (`.planning/todos/pending/2026-07-16-lokale-projekt-manifest-datei-f-r-coolify-metadaten.md`) — folds into MAN-01..04 / this phase (UUIDs, domains, gitignore, sync).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 17 goal, success criteria, MAN-01..04
- `.planning/REQUIREMENTS.md` — MAN-01, MAN-02, MAN-03, MAN-04; Out of Scope (shared committed manifest)
- `.planning/PROJECT.md` — v3.0 Platform Foundation; local manifest checklist
- `.planning/todos/pending/2026-07-16-lokale-projekt-manifest-datei-f-r-coolify-metadaten.md` — folded todo (original problem statement)

### Architecture & pitfalls research
- `.planning/research/ARCHITECTURE.md` — `ManifestManager` concept, `src/utils/manifest.ts`, auto-update hook sketch
- `.planning/research/PITFALLS.md` — stale cache, project-root resolution, no tokens in manifest, no sync-every-call, destructive sync confirm
- `.planning/research/STACK.md` — Zod + `node:fs` for local manifest

### Prior phase decisions
- `.planning/phases/15-multi-instance-registry-routing/15-CONTEXT.md` — routing precedence, soft-start, `COOLIFY_NO_INSTANCE`, action-based tools
- `.planning/phases/16-coolify-cloud-server-branding/16-CONTEXT.md` — Phase 17 explicitly deferred from 16; structured errors + recovery hints

### Code integration
- `src/utils/instance-registry.ts` — atomic write / permissions patterns to mirror for workspace file (no tokens)
- `src/utils/errors.ts` — structured codes + `RECOVERY_HINTS`; extend for stale-manifest 404 hints
- `src/mcp/tools/instance.ts` — action-schema pattern to mirror for `manifest`
- `src/mcp/tools/application.ts` / `service.ts` / `database.ts` — mutation sites for auto-upsert hooks (D-09)
- `src/mcp/server.ts` — register new `manifest` tool
- `src/utils/project-lookup.ts` — related UUID resolution patterns (not the same as workspace root walk)

### Spike / conventions
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — action-based schema; structured errors; no stub tools
- `.planning/codebase/CONVENTIONS.md` — single-repo, kebab-case utils, co-located tests

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InstanceManager` / `instance-registry.ts` — file-backed JSON + Zod + atomic writes; adapt for workspace `.coolify/manifest.json` (no 0o700 home-dir semantics required; still prefer atomic rename).
- Action discriminatedUnion schemas on `instance` — copy pattern for `manifest` actions.
- `wrapMcpError` / `RECOVERY_HINTS` — add stale-manifest refresh hints on 404.
- Confirm-gate pattern (`confirm: true`) — reuse for `clear` and orphan prune.

### Established Patterns
- Action-based domain tools (15 tools today) — add one more, not granular tools.
- Soft-start: local ops without creds; API ops need resolved instance.
- Optional `instance` param only where live API is needed (D-03).
- Structured envelopes with `_meta` for non-fatal warnings (D-11).

### Integration Points
- New `src/utils/manifest.ts` (or similar) + `src/mcp/tools/manifest.ts` registered in `server.ts`.
- Auto-hooks after successful mutations in `application` / `service` / `database` handlers.
- `.gitignore` append on first write; resolve path from project root, not raw `process.cwd()` alone (PITFALLS).
- Example template committed at repo root or docs; live `.coolify/` stays gitignored.

</code_context>

<specifics>
## Specific Ideas

- German discuss session; decisions above are normative for downstream agents (English).
- User consistently accepted recommended options except D-09 hook breadth: chose **all mutations including update/domain** (not create/delete-only).
- User chose broader action set (`set`/`remove`/`diff`) over minimal get/upsert/sync/clear.
- Typo `1v` interpreted as `1` (resource core fields) — confirmed next turn.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Custom Skills pro IDE für Coolify** — v3.1 / SKILL-*
- **Standard-Setup Tool für neue Coolify-Projekte** — v3.1
- **Integrate official Coolify OpenAPI specs** — docs/API work, not manifest phase

None further — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-Local Manifest & Sync*
*Context gathered: 2026-07-22*
