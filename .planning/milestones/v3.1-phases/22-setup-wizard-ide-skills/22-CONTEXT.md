# Phase 22: Setup Wizard & IDE Skills - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

<domain>
## Phase Boundary

New-user setup via an MCP `setup` tool: headless-safe `gh` preflight with soft-pause/resume, Coolify wiring (project/environment/server + app/recipes), optional domains/env/deploy+watch steps, and workspace `.coolify/manifest.json` updates. Repo ships Coolify skills under `skills/coolify-*/` installable with the Vercel Skills CLI (`npx skills add`) targeting Cursor, Claude Code, and Codex — documenting recipes, `deployment.watch`, prompts, and safety rules. No OpenAPI coverage map or npm Release publish (Phase 23). No auto-push of unfinished git. No rebuild of the Phase 17 manifest schema.

</domain>

<decisions>
## Implementation Decisions

### Setup Surface
- **D-01:** Implement setup as a new MCP domain tool `setup` (flat schema + actionsCatalog per Phase 19). Primary agent entry — not CLI-first.
- **D-02:** Expected actions include at least preflight / wire (or equivalent greenfield orchestration) / resume. Exact action names under Claude discretion as long as SETUP-01–03 are met.
- **D-03:** A CLI wrapper (`src/cli/setup-wizard.ts`) is optional later and must reuse the same core logic if added — not required for phase success.

### gh Preflight & Pause/Resume
- **D-04:** Verify `gh` presence (`gh --version`) and auth (`gh auth status`) with strict non-interactive / timeout-safe invocation — never block indefinitely on TTY or stdin.
- **D-05:** If `gh` missing or unauthenticated: return a structured soft-pause (`needs_human` or equivalent) with install/`gh auth login` guidance and an unambiguous resume instruction (re-call resume/wire). Agent stops; human completes auth; agent resumes.
- **D-06:** Do not poll-wait inside the tool for the human to finish `gh auth`.

### Wizard Modes & Depth
- **D-07:** Support modes: `greenfield` | `link-existing`. — **Reversibility:** costly — both modes shape the public `setup` action contract and skill docs.
- **D-08:** `link-existing`: resolve/link Coolify project + environment + server (and resources as provided) and update `.coolify/manifest.json` via existing manifest helpers — no forced resource create.
- **D-09:** `greenfield` core (required): `gh` preflight → optional `gh repo create` (no auto-push) → Coolify project/environment/server linkage → app create via recipes (`create-git-app` / `create-app-db` / `create-one-click` as parameterized) → write/update `.coolify/manifest.json`.
- **D-10:** Greenfield maximal path is available but opt-in: domains, env wiring, and deploy+watch are **optional flags**, defaults **off** (`include_domains?`, `set_env?`, `deploy_and_watch?` or equivalent names).
- **D-11:** When `deploy_and_watch` is enabled: fire deploy (via existing application/recipe paths), return `deployment_uuid`, and steer to / call `deployment.watch` with bounded timeout — never forever-block the MCP session. Include timeout/recovery hints (Phase 21).
- **D-12:** Never auto-push unfinished git. At most suggest a `git push` command in the response. — **Reversibility:** one-way — matches REQUIREMENTS out-of-scope; do not add auto-push later without a requirements change.

### IDE Skills (Vercel Skills CLI)
- **D-13:** Ship skills using the Vercel / skills.sh ecosystem (`npx skills` / `vercel-labs/skills`). Primary distribution: `npx skills add clezcoding/awesome-coolify` (with agent filters). Do not treat hand-maintained divergent copies under each IDE path as the source of truth.
- **D-14:** Canonical skill source path: `skills/coolify-*/SKILL.md` (discoverable by `npx skills add` from this repo).
- **D-15:** Ship workflow skills: `coolify-setup`, `coolify-deploy`, `coolify-diagnose`, `coolify-incident` (names aligned with Phase 19 prompt names where practical).
- **D-16:** Skills MUST document recipes, `deployment.watch` (timeout, non-blocking-forever, recovery), MCP prompts, and safety rules (`confirm` gates, `reveal` opt-in) per SKILL-02 / Phase 21 D-16.
- **D-17:** README (EN/DE) documents install: `npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex` (and optionally `--all`).

### Claude's Discretion
- Exact `setup` action names and Zod field names within D-02/D-07/D-10.
- Whether greenfield calls `deployment.watch` in-process vs returns UUID + skill/prompt steer (within D-11 bounded/no-forever-block).
- Symlink vs `--copy` guidance in docs (user deferred).
- Whether a thin CLI wrapper is added in this phase (D-03).
- Exact SKILL.md frontmatter and body wording; optional shared references under `skills/`.
- Internal reuse of `manifest`, `recipe`, `project`, `application`, `deployment.watch` helpers.

### Folded Todos
- **Custom Skills pro IDE für Coolify** — IDE skill packs; resolved via D-13–D-17 (Vercel `npx skills`, Cursor/Claude Code/Codex). Extra IDEs (Windsurf, etc.) deferred.
- **Standard-Setup Tool für neue Coolify-Projekte** — setup wizard + `gh` preflight/pause; resolved via D-01–D-12.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 22 goal, success criteria, deps on Phases 19–21
- `.planning/REQUIREMENTS.md` — SETUP-01–03, SKILL-01–02; out-of-scope: auto-push unfinished git, shared manifest in git
- `.planning/PROJECT.md` — v3.1 Setup, Skills & DX milestone
- `.planning/STATE.md` — current milestone position

### Research (v3.1)
- `.planning/research/FEATURES.md` — GitHub CLI Preflight; Interactive Setup Wizard; reject Global Auto-Push
- `.planning/research/PITFALLS.md` — Interactive `gh` Preflight Blocks Headless Agents; Skills Teaching Incorrect Patterns
- `.planning/research/ARCHITECTURE.md` — SetupWizard sketch (prefer MCP tool per D-01 over CLI-first)
- `.planning/research/STACK.md` — IDE skill pack notes (superseded for distribution by Vercel skills CLI per D-13)
- `.planning/research/SUMMARY.md` — Setup + skills phase rationale

### Prior phase context
- `.planning/milestones/v3.0-phases/17-local-manifest-sync/17-CONTEXT.md` — `.coolify/manifest.json` schema, gitignore, cache-not-SoT (wizard writes; do not rebuild)
- `.planning/phases/19-dx-schemas-mcp-prompts/19-CONTEXT.md` — flat schemas, prompts, soft manifest; long playbooks belong in skills
- `.planning/phases/20-recipes-service-list-types/20-CONTEXT.md` — recipe tool; soft instance routing; wizard owns hard linkage (D-20 there)
- `.planning/phases/21-deploy-watch/21-CONTEXT.md` — `deployment.watch` policy; skills must document watch (D-16 there)

### External — Vercel Skills CLI (user-locked)
- https://github.com/vercel-labs/skills — `npx skills add|init|list`; agent targets include cursor, claude-code, codex
- https://www.skills.sh/docs — ecosystem install model
- https://agentskills.io — Agent Skills open standard (SKILL.md shape) if needed for frontmatter

### Spike findings
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — action-based tools; no stub tools; Coolify 4.1.x

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — file layout, Zod naming, commits
- `.planning/codebase/TESTING.md` — Vitest co-located expectations
- `.planning/codebase/CONCERNS.md` — known constraints if planning touches security/secrets paths

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/mcp/tools/manifest.ts` + `src/utils/manifest.ts` / `manifest-auto-hook.ts` — write/update `.coolify/manifest.json` from setup
- `src/mcp/tools/recipe.ts` — `create-git-app`, `create-app-db`, `create-one-click` for greenfield app provisioning
- `src/mcp/tools/project.ts` / environment / server tools — linkage creates
- `src/mcp/tools/application.ts` — deploy path; `deployment.watch` on `src/mcp/tools/deployment.ts`
- `src/mcp/prompts.ts` — short prompts; skills hold longer playbooks
- `src/mcp/tools/shared-read-params.ts` — instance routing for flat schemas
- Phase 19 flat schema + actionsCatalog + safety footer pattern for new `setup` tool

### Established Patterns
- Action-based MCP tools; structured errors + `recoveryHints`
- Soft-start manifest elsewhere; setup is allowed to require/produce manifest linkage
- `reveal` opt-in; `confirm` for destructive ops only (recipes create without confirm)
- Headless-safe: no interactive `prompts` library inside MCP tool handlers

### Integration Points
- Register `setup` in `src/mcp/server.ts` alongside other domain tools
- Skills tree at repo-root `skills/` for `npx skills add clezcoding/awesome-coolify`
- README.md + README.de.md install + setup sections
- Reuse Phase 21 watch bounded timeout / dual-signal semantics when `deploy_and_watch` runs

</code_context>

<specifics>
## Specific Ideas

- User rejected hand-rolled per-IDE skill copies; locked Vercel Skills CLI (`npx skills`) as distribution.
- User chose full greenfield including optional domains/env/deploy+watch — but defaults **off** so core path stays predictable.
- Soft-pause for `gh` (not poll-loop) is mandatory for agent/headless use.
- Install docs must name Cursor, Claude Code, and Codex agent flags explicitly.

</specifics>

<deferred>
## Deferred Ideas

- Windsurf / additional IDE targets beyond Cursor, Claude Code, Codex
- Thin CLI `setup-wizard` wrapper (optional; D-03)
- Separate published skills-only repo
- OpenAPI coverage tooling — Phase 23
- Live npm Release publish — Phase 23
- Auto-push unfinished git — permanently out of scope unless REQUIREMENTS change

### Reviewed Todos (not folded)
- **Lokale Projekt-Manifest-Datei für Coolify-Metadaten** — already delivered in Phase 17; wizard only consumes/updates
- **Integrate official Coolify OpenAPI specs** — belongs in Phase 23

</deferred>

---

*Phase: 22-Setup Wizard & IDE Skills*
*Context gathered: 2026-07-26*
