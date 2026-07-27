# Phase 19: DX Schemas & MCP Prompts - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent-facing DX foundation for v3.1: (1) every Coolify MCP tool exposes a Cursor-visible parameter surface — flat/top-level input schemas with no empty `properties: {}` / `oneOf` UI — plus compact action catalogs in tool descriptions; (2) four parameterized MCP prompts (`deploy`, `diagnose`, `new-project`, `incident`) return short step guidance that orchestrates existing atomic tools. No new Coolify API capabilities, no recipes, no deploy.watch implementation, no setup wizard, no IDE skills packs.

</domain>

<decisions>
## Implementation Decisions

### Schema Flattening
- **D-01:** Replace top-level `z.discriminatedUnion('action', …)` JSON Schema (`oneOf`/`anyOf`) with **fully flat Zod objects** (optional fields + `superRefine` / handler-side per-action validation). Goal: Cursor never shows "No parameters".
- **D-02:** Flatten **all domain tools** (same pattern everywhere), not a pilot subset.
- **D-03:** Keep the existing call shape `{ action, …fields }` — non-breaking for agents/skills.
- **D-04:** **Strict** validation: wrong/missing fields for the selected `action` → `COOLIFY_VALIDATION_ERROR` with `recoveryHints` listing required fields for that action. Do not silently ignore extras.

### Action Catalog in Tool Descriptions
- **D-05:** Each tool `description` includes a **compact catalog**: every action name + 1–3 key params (e.g. `deploy(uuid, force?, confirm?) · logs(uuid, lines?) · …`).
- **D-06:** Catalog strings are **hand-maintained** (not auto-generated from Zod in v3.1).
- **D-07:** Catalog constants live **co-located** in `src/mcp/tools/<domain>.ts` and are passed into `registerTool`.
- **D-08:** Each description ends with a **short safety/routing footer**: `confirm` for destructive ops · optional `instance` · `reveal` opt-in only.

### MCP Prompt Content Depth
- **D-09:** Prompts return **parameterized numbered step guidance** with concrete tool/action calls (~½–1 screen). Not bare checklists; not long playbooks (those belong in Phase 22 skills).
- **D-10:** **Soft manifest context** — prompt text may tell the agent to resolve missing IDs from `.coolify/manifest.json` or ask the user. Prompt handlers do **not** hard-load/fail on missing manifest.
- **D-11:** Prompt `deploy` **forward-references** `deployment.watch` (Phase 21) and documents fallback polling via `deployment.get` / status until watch exists.
- **D-12:** Prompt message bodies are **English** (consistent with tools/errors/docs).

### Prompt Naming & Arguments
- **D-13:** Exact prompt names: `deploy`, `diagnose`, `new-project`, `incident` (per REQUIREMENTS PROMPT-01–04). Reject longer/namespaced variants.
- **D-14:** **All prompt args optional** so clients can open prompts without prefill.
- **D-15:** Minimal arg sets:
  - shared: `instance?`
  - `deploy`: `uuid?`, `force?`
  - `diagnose`: `uuid?`
  - `new-project`: `name?`, `server_uuid?`
  - `incident`: `uuid?`, `project_uuid?`
- **D-16:** Implement in `src/mcp/prompts.ts` via `registerCoolifyPrompts(server)` wired from `server.ts` (ARCHITECTURE pattern).

### Claude's Discretion
- Exact wording of catalog strings and prompt step text (within D-05/D-09 constraints).
- Shared helper design for flat schemas / per-action refine (as long as D-01–D-04 hold).
- Whether `meta`/`docs` (non-action-routed) need the same flattening pass if they already lack `oneOf`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 19 goal, success criteria, deps
- `.planning/REQUIREMENTS.md` — DX-01, DX-02, PROMPT-01–04
- `.planning/PROJECT.md` — v3.1 milestone scope
- `.planning/STATE.md` — current milestone position

### Research (v3.1)
- `.planning/research/PITFALLS.md` — Pitfall 9 (Prompts vs Tools), Pitfall 10 (Cursor `oneOf` rendering)
- `.planning/research/SUMMARY.md` — DX foundation rationale (flat schemas + prompts first)
- `.planning/research/FEATURES.md` — Richer Tool Descriptions & Flat Schemas; MCP Prompts
- `.planning/research/ARCHITECTURE.md` — `src/mcp/prompts.ts` / `registerPrompt` pattern

### Spike findings
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — action-based tools, no stub tools
- `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md` — historical discriminatedUnion pattern (to be replaced at MCP boundary per D-01)

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — Zod schema naming, file layout, commit style
- `.planning/codebase/TESTING.md` — test expectations for schema/tool changes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/mcp/tools/shared-read-params.ts` — `withInstanceRoutingSchema`, `optionalInstanceParam`, `parseWithInstanceRouting` (must keep working with flat schemas)
- Per-domain `*ActionSchema` / `handle*Action` in `src/mcp/tools/*.ts` — refactor target for flattening
- `src/mcp/server.ts` — `registerCoolifyTools`; add prompt registration alongside
- Error helpers (`COOLIFY_VALIDATION_ERROR`, `recoveryHints`) — use for D-04

### Established Patterns
- Action-based tools (one tool per domain, `action` discriminator) — **call shape stays**; only schema representation + descriptions change
- Confirm gates + `reveal` opt-in — reinforce via description footer (D-08)
- No MCP prompts registered yet — greenfield `prompts.ts`

### Integration Points
- `registerTool({ description, inputSchema })` for every domain tool
- New `registerCoolifyPrompts(server)` called from server bootstrap
- Phase 20–22 consumers assume flat callable schemas + prompt names above

</code_context>

<specifics>
## Specific Ideas

- Catalog format example accepted in discussion: `deploy(uuid, force?, confirm?) · logs(uuid, lines?) · …`
- ARCHITECTURE example used `diagnose-incident` — **superseded** by D-13 exact names
- Watch guidance in `deploy` prompt is intentional forward-compat with Phase 21

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify → Phase 22 (SKILL-*)
- Lokale Projekt-Manifest-Datei → already v3.0 / manifest tooling
- Standard-Setup Tool für neue Coolify-Projekte → Phase 22 (SETUP-*)
- Integrate official Coolify OpenAPI specs → Phase 23 (COV-*)

- `deployment.watch` **implementation** → Phase 21 (prompt may only reference it)
- Long playbook / IDE skill packs → Phase 22
- Recipe tools / `service.list-types` → Phase 20

</deferred>

---

*Phase: 19-DX Schemas & MCP Prompts*
*Context gathered: 2026-07-24*
