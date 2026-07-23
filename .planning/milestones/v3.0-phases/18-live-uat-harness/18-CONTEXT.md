# Phase 18: Live UAT Harness - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Maintainer can prove all 14 MCP tools work against a live Coolify instance with one CLI harness before v3.0 ships: credential resolution without token leakage, structured pass/fail reporting, v3.0 coverage (multi-instance, cloud profile, manifest), safe preconditions with explicit destructive gates, and CONTRIBUTING docs for local runs. Not custom IDE skills, not setup wizard, not OpenAPI ingestion, not CI with remote secrets.

</domain>

<decisions>
## Implementation Decisions

### Lauf-Modus (invocation)
- **D-01:** Hybrid execution: MCP stdio child for smoke + critical paths; in-process handler calls for mass action matrix.
- **D-02:** Entry point `npm run uat:live` → `node scripts/live-uat.mjs` (may extend/replace patterns from `scripts/live-uat-milestone-optional.mjs`).
- **D-03:** Script is **tracked in git** but **must never ship in the npm package** (publish/`files` exclude). User clarified: “never deployed/pushed” means never published/deployed as package artifact — not “gitignore the script.”
- **D-04:** Stdio-required coverage: `tools/list` + one read call per domain tool + v3.0 paths (`instance`, cloud-info/system, `manifest.get`/`diff`). Remaining action matrix runs in-process.

### Ziel-Isolation
- **D-05:** Runs only against a **dedicated UAT project**. Script refuses if target missing or mismatched.
- **D-06:** UAT project is a **manual prerequisite** (CONTRIBUTING documents create + env). No `--setup` / auto-create in default flow.
- **D-07:** **No auto-cleanup.** Script deletes nothing unless explicit destructive flag path.
- **D-08:** Identity gate = **`UAT_PROJECT_UUID` env only** (exact UUID match or abort). No name-based guessing.

### Schreib- / Destructive-Coverage
- **D-09:** Default run is **read-only** (lists/gets/diff/cloud-info/meta-style calls).
- **D-10:** Two-tier flags: `--write` unlocks create/update/restart/deploy inside UAT project; `--confirm-destructive` required additionally for deletes / emergency bulk / manifest clear/orphan prune.
- **D-11:** Destructive = deletes + emergency bulk (`stop_all` / project-wide stop-redeploy style) + manifest orphan prune. Other mutating calls = `--write` only.
- **D-12:** Missing write/destructive flag → **dry-run preview**: show planned calls, do not execute; report status `planned`.

### Coverage-Matrix
- **D-13:** Default = representatives (1–2 safe reads per domain tool) + fixed v3.0 mandatory matrix. Full action list behind `--full` (mostly in-process).
- **D-14:** v3 mandatory minimum (tag `suite: v3` in report):
  - multi-instance: ≥1 call with explicit `instance` + ≥1 without (env/default)
  - cloud: `instance.cloud-info` (or equivalent cloud-profile path)
  - manifest: `get` + `diff` (or `sync` with `dry_run`)
- **D-15:** Missing live preconditions (no second registry instance, no cloud, etc.) → **skip with reason**; summary exposes `v3_gaps`. Does not alone fail the read suite.
- **D-16:** Coverage matrix is **declarative and committed** (e.g. `scripts/live-uat.matrix.json` or equivalent export). Script loads it; not hardcoded-only; not docs-only.

### Report & CI / Secrets
- **D-17:** JSON report to **stdout**; optional `--out <path>` for artifact. **Never print tokens** (UAT-02).
- **D-18:** Canonical machine report = JSON (pass/fail, duration, error code, recovery-hint presence). **Also emit Markdown report** (additional human artifact).
- **D-19:** **No CI job** for live UAT. **No secrets on GitHub or any remote** — credentials only local (`.cursor/mcp.json`, env, `~/.coolify-mcp/instances.json`).
- **D-20:** Exit codes: `0` = no fails (skips/`planned` OK); `1` = ≥1 fail; `2` = setup abort (missing `UAT_PROJECT_UUID` / credentials). CONTRIBUTING documents mapping.

### Docs (phase intent)
- **D-21:** CONTRIBUTING.md documents: how to run `npm run uat:live`, preconditions (`UAT_PROJECT_UUID`, dedicated project), flags (`--write`, `--confirm-destructive`, `--full`, `--out`), interpreting JSON/Markdown + exit codes + `v3_gaps`, and that the harness is maintainer-local (not CI, not in npm tarball).

### Claude's Discretion
- Exact filename for matrix (`live-uat.matrix.json` vs `.mjs` export) and Markdown `--out` pairing defaults.
- Precise mapping of which existing tool actions count as the “one read per domain tool” for stdio smoke.
- How aggressively to fold/retire `scripts/live-uat-milestone-optional.mjs` into the new harness (prefer reuse of stdio client + mcp.json resolver).
- Human stderr summary alongside Markdown (optional nicety; JSON+MD are locked).

### Reviewed Todos
Todos were reviewed for Phase 18; none folded into UAT scope (see Deferred). Phase intent confirmed as: (1) test script, (2) remaining UAT gates, (3) relevant UAT docs — not Skills/Setup/OpenAPI delivery.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 18 goal, success criteria, depends on Phase 17
- `.planning/REQUIREMENTS.md` — UAT-01 … UAT-06
- `.planning/PROJECT.md` — v3.0 live UAT checklist / core value

### Prior phase decisions (do not re-litigate)
- `.planning/phases/15-multi-instance-registry-routing/15-CONTEXT.md` — credential resolution order, redact, confirm gates
- `.planning/phases/16-coolify-cloud-server-branding/16-CONTEXT.md` — cloud surface, `cloud-info`, docs pattern
- `.planning/phases/17-local-manifest-sync/17-CONTEXT.md` — manifest actions, dry_run/diff, confirm prune/clear

### Code & docs to extend
- `scripts/live-uat-milestone-optional.mjs` — existing stdio client + `.cursor/mcp.json` env resolver (no token print)
- `.planning/codebase/TESTING.md` — test layout; notes live/manual stdio patterns
- `CONTRIBUTING.md` — destination for UAT-06 runbook
- `package.json` — `files` already excludes `scripts/` from npm (`["dist",".env.example","LICENSE"]`); keep harness out of publish

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/live-uat-milestone-optional.mjs` — `McpStdioClient`, `resolveMcpEnv()` from project/user `.cursor/mcp.json`, preferred server names; never prints tokens
- `src/utils/redact.ts` / structured envelopes — report must never leak tokens; reuse redaction mindset
- Instance registry + Phase 15 resolution — for multi-instance v3 matrix rows
- Manifest tool (Phase 17) — get/diff/sync dry_run for v3 matrix; clear/prune behind destructive flag

### Established Patterns
- Vitest unit/integration with fixtures = CI; live stdio = maintainer-only (historical Manual-Only tables)
- Confirm-gate pattern (`confirm: true` on tools) — harness CLI flags are the *outer* gate; still respect tool-level confirms where required
- Conventional commits / changesets — docs + script land as `feat`/`docs`/`test` as planner chooses; harness not in npm tarball

### Integration Points
- `package.json` scripts: add `uat:live`
- `scripts/live-uat.mjs` (+ declarative matrix file)
- `CONTRIBUTING.md` UAT section
- Optional: retire or thin-wrap `live-uat-milestone-optional.mjs`

</code_context>

<specifics>
## Specific Ideas

- User: harness must **never be deployed or published** (npm); tracked in repo is OK.
- User: **Keine Secrets auf Github oder sonst wo** — absolute ban on remote secret storage for this harness.
- Phase framing from user: (1) test script, (2) remaining UAT gates, (3) write relevant docs.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Custom Skills pro IDE für Coolify** — v3.1 / docs-skills; not UAT harness
- **Lokale Projekt-Manifest-Datei** — already delivered in Phase 17
- **Standard-Setup Tool für neue Coolify-Projekte** — SETUP / v3.1
- **Integrate official Coolify OpenAPI specs** — API/docs work; not live UAT

None of the above expand Phase 18 deliverables beyond UAT-01..06.

</deferred>

---

*Phase: 18-Live UAT Harness*
*Context gathered: 2026-07-23*
