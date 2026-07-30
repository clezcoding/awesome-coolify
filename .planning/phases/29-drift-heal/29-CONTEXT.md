# Phase 29: Drift & Heal - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning
**Mode:** `--batch --auto` (batch overlay no-op under auto; single-pass auto decisions)

<domain>
## Phase Boundary

Agent can **detect configuration drift** between workspace-local `.coolify/manifest.json` and live Coolify state via a remediation-aware **manifest audit**, **compare environment variables across environments** with promotion suggestions (`env.promote` / `envs:promote`), and receive **concrete fix hints** (which tool/action to call) — not raw diffs alone.

In scope: DRIFT-01, DRIFT-02, DRIFT-03.

Out of scope this phase: Deploy Guard preflight / risk score / rollback (Phase 30), Log Brain / Playbooks / Smart Recipes (Phase 31), auto-execute destructive mutations without confirm (REQUIREMENTS Out of Scope), ML anomaly detection, cross-instance fan-out (CTX-10), new Coolify REST endpoints / stubs for absent APIs, replacing or removing existing `manifest.diff` / `envs:sync`.

</domain>

<decisions>
## Implementation Decisions

### Tool surface packaging
- **D-01:** Extend existing domain tool **`manifest`** with action **`audit`** — do **not** create a new `drift`/`heal` MCP tool and do **not** fold audit into `intelligence`. Manifest cache drift belongs on the manifest surface (Phase 17 D-01); `intelligence` stays scorecard/graph/janitor/cleanup. — **Reversibility:** costly — agent action catalog + habits.
- **D-02:** Env promotion ships as **`application` action `envs:promote`** (docs/requirements may say `env.promote`). Reuse existing envs list/create/update/bulk-update client paths — no parallel env client and no new top-level MCP tool. — **Reversibility:** costly — published action name.
- **D-03:** Keep existing **`manifest.diff`** as the raw non-destructive structural report. **`manifest.audit`** builds on the same live-vs-local comparison but adds severity-tagged findings + structured remediation steps (DRIFT-03). Do not redefine `diff` as audit. — **Reversibility:** costly — two agent-facing contracts.

### Manifest audit (DRIFT-01 / DRIFT-03)
- **D-04:** `manifest.audit` compares local `.coolify/manifest.json` vs live Coolify inventory for the scoped instance (optional `instance` routing, Phase 15/17 parity). Minimum comparison axes: resource **presence by UUID**, **type**, **name**, **domains**, and **project/environment nesting** already stored in the manifest schema — not a full Coolify config dump of every API field. — **Reversibility:** costly — audit semantics agents rely on.
- **D-05:** Audit response includes **findings[]** with severity tags (`critical` | `high` | `info` parity with `diagnose.scan` / Phase 28 scorecard) and **structured remediation hints** naming the follow-up tool/action (e.g. `manifest.sync`, `manifest.upsert`, domain CRUD) — same envelope spirit as `RECOVERY_HINTS` / diagnose hints, not free-text-only. Raw diff summary may be included as supporting detail, never as the sole payload. — **Reversibility:** costly — envelope contract.
- **D-06:** Audit is **read-only / advisory**. It never mutates manifest or live Coolify state. Mutations stay on existing actions (`sync`/`upsert`/CRUD) with their own confirm rules. Soft partials when one live fetch fails (Phase 26/28 spirit) — return other findings with failure flags. — **Reversibility:** one-way for advisory-only contract (published safety).
- **D-07:** Missing local manifest → structured error + recovery hint pointing to `manifest.sync` / `manifest.upsert` (soft-start pattern); missing creds on audit → `COOLIFY_NO_INSTANCE` + hints (Phase 17 D-04). No mid-call auto-sync (Phase 17 D-15).

### Env promote (DRIFT-02)
- **D-08:** `envs:promote` compares env vars between a **source environment** and a **target environment** for the same application (UUIDs/names resolved like existing envs actions). Output: keys only-in-source, only-in-target, value-mismatches (values redacted by default unless existing `reveal` policy applies), plus **promotion suggestions**. — **Reversibility:** costly — comparison contract.
- **D-09:** Default posture is **preview / dry suggestion** (`dry_run: true` default or explicit preview when confirm absent). Applying copies/updates into the target requires **`confirm: true`** (SAF-01 / `envs:sync` / Phase 10 parity). Prefer reusing `envs:bulk-update` / create helpers for the apply path — no silent overwrite storm. — **Reversibility:** one-way for confirm gate.
- **D-10:** Conflict policy on apply: **do not clobber target keys that already differ** unless caller opts in with an explicit conflict policy (mirror `envs:sync` `conflict_policy` spirit — exact enum names → research/planner). Never promote into a different application UUID without explicit target uuid. — **Reversibility:** costly — safety defaults.
- **D-11:** Cross-environment only within one Coolify instance per call — **no cross-instance env promote** (CTX-10 deferred). Optional `instance` routing param like other live application actions.

### Cross-cutting (carry-forward, not re-opened)
- **D-12:** Single-instance scope per call via optional `instance` — no fan-out.
- **D-13:** Structured errors + recovery hints; soft partials for composite reads.
- **D-14:** No stub tools / no fake Coolify endpoints (spike mandate). Env promote uses existing env CRUD APIs only.
- **D-15:** Capability / catalog / README EN+DE updates follow Phase 24–26 parity when actions ship. Exact capability key names → Claude's discretion (e.g. `manifest_audit`, `envs_promote`).
- **D-16:** Do **not** auto-heal (auto-apply audit remediations or promote) without explicit confirm — Out of Scope “Auto-execute destructive cleanup without confirm” spirit applies to heal mutations.

### Claude's Discretion
- Exact Zod field names for audit findings, promote source/target params, conflict_policy enum.
- Whether audit reuses `diff` internals as a shared helper vs parallel fetch (prefer shared helper to avoid drift between diff and audit).
- Whether promote preview returns suggested `entries[]` ready for `envs:bulk-update`.
- Numeric/ordering of severity when multiple findings share a resource.
- Exact MCP tool description / safety footer wording for new actions.
- Placement of capability flags in `capabilities.ts` / `system.version`.
- Whether `manifest.audit` accepts optional project/environment scope filters.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 29 goal, success criteria 1–3; Phase 30 boundary
- `.planning/REQUIREMENTS.md` — DRIFT-01, DRIFT-02, DRIFT-03; Out of Scope (confirm mandatory, no ML, no fan-out)
- `.planning/PROJECT.md` — v3.3 Agent Intelligence; Drift & Heal = manifest.audit + env.promote + remediation hints
- `.planning/STATE.md` — current position Phase 29

### Prior phase context (patterns to reuse)
- `.planning/phases/28-instance-intelligence/28-CONTEXT.md` — intelligence packaging; findings + recovery hint envelopes; confirm gates; soft partials; no stubs
- `.planning/milestones/v3.0-phases/17-local-manifest-sync/17-CONTEXT.md` — `manifest` tool, sync/diff, cache-not-SoT, no mid-call auto-sync, confirm on destructive
- `.planning/milestones/v2.0-phases/10-application-crud-safety/10-CONTEXT.md` — SAF-01 confirm, structured errors
- `.planning/milestones/v3.2-phases/26-diagnose-logs-incident-dx/26-CONTEXT.md` — soft partials, recovery hints, scan severity buckets
- `.planning/milestones/v3.0-phases/15-multi-instance-registry-routing/15-CONTEXT.md` — `instance` routing, `COOLIFY_NO_INSTANCE`

### Implementation sources
- `src/mcp/tools/manifest.ts` — extend with `audit`; keep `diff`/`sync`
- `src/utils/manifest.ts` · `src/utils/manifest-auto-hook.ts` — ManifestManager + schema
- `src/mcp/tools/application.ts` — `envs:*` actions; add `envs:promote`; reuse bulk-update/create
- `src/utils/errors.ts` — `COOLIFY_CONFIRM_REQUIRED`, `COOLIFY_NO_INSTANCE`, `RECOVERY_HINTS`
- `src/utils/issue-classifier.ts` · `src/utils/diagnose-hints.ts` — severity + hint generation patterns
- `src/utils/redact.ts` — env value redaction on promote preview
- `src/mcp/server.ts` · `src/mcp/capabilities.ts` · `src/mcp/tools/system.ts` — registration + capability parity
- `docs/COVERAGE.md` — env/manifest coverage rows; update if new actions map to REST

### Conventions / spikes / maps
- `.planning/codebase/CONVENTIONS.md` — action Zod schemas, ESM `.js` imports
- `.planning/codebase/TESTING.md` — Vitest co-located `*.test.ts`
- `.planning/codebase/CONCERNS.md` — known repo concerns (read if touching CI/docs)
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools; 4.1.x endpoint truth
- `docs/coolify_openapi.json` — verify env update endpoints before inventing promote apply path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `manifest.diff` / sync live fetch path → shared core for `manifest.audit`
- `ManifestManager` + nested schema → local side of audit
- `application` `envs:list` / `envs:bulk-update` / `envs:sync` (dry_run + confirm + conflict_policy) → promote preview/apply
- `RECOVERY_HINTS` / diagnose hint generators → DRIFT-03 remediation objects
- `createFlatActionSchema` + `optionalInstanceParam` → new actions
- `redact` helpers → promote value display

### Established Patterns
- Action-based domain tools; extend existing tool when capability belongs there (manifest audit on `manifest`, envs promote on `application`)
- Destructive / applying ops: `confirm: true` or structured confirm error
- Soft partial success for multi-source composites
- No tools without working Coolify endpoints
- Optional `instance` routing on live API actions
- Manifest is cache, not source of truth — audit remediates toward refresh/sync, does not treat local as authoritative overwrite of live

### Integration Points
- Add `audit` to `manifestActionsCatalog` + schema + handler in `manifest.ts`
- Add `envs:promote` to application action catalog + schema + handler
- Capability flags + actions catalog + README EN/DE short note
- Co-located `manifest.test.ts` / `application.test.ts` coverage; optional integration for confirm gate on promote apply
- Downstream Phase 30 Deploy Guard may consume audit/promote health signals — keep envelopes agent-stable

</code_context>

<specifics>
## Specific Ideas

Auto mode (`--auto`): recommended defaults chosen to match Phase 17 manifest + Phase 10/28 SAF + diagnose hint precedents. PRODUCT naming: `manifest.audit` and `env.promote` (implemented as `envs:promote`). No user free-text references beyond roadmap/requirements.

</specifics>

<deferred>
## Deferred Ideas

- Deploy preflight risk score / rollback → Phase 30
- Log Brain patterns, ops playbooks, smart recipes → Phase 31
- Service/DB log tails → v3.4 (Coolify 4.2+)
- Cross-instance fan-out queries / cross-instance env promote → CTX-10
- ML/statistical anomaly detection → out of scope
- Full live config deep-diff beyond manifest-stored fields → out of phase (YAGNI)

None — discussion stayed within phase scope for actionable decisions.

</deferred>

---

*Phase: 29-Drift & Heal*
*Context gathered: 2026-07-30*
*Auto: all gray areas resolved in single pass*
