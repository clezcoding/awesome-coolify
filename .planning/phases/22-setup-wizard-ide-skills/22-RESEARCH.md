# Phase 22: Setup Wizard & IDE Skills - Research

**Researched:** 2026-07-26
**Domain:** MCP setup orchestration, GitHub CLI preflight, manifest linkage, Vercel Skills CLI distribution
**Confidence:** HIGH

## Summary

Phase 22 delivers two coupled surfaces: a new MCP `setup` domain tool (primary entry per D-01) and repo-root Agent Skills packs installable via `npx skills add clezcoding/awesome-coolify`. The setup tool must orchestrate existing primitives — `project`, `environment`, `server`, `recipe`, `manifest`, and `deployment.watch` — without reimplementing their business logic. GitHub CLI checks are the only new subprocess boundary; use Node `child_process.execFile` with hard timeouts and never invoke interactive `gh auth login` inside the MCP handler.

Greenfield mode runs: `gh` preflight → optional `gh repo create` (no push) → Coolify project/environment/server linkage → recipe-based app provisioning → `.coolify/manifest.json` write. Link-existing mode skips resource creation and links provided UUIDs into the manifest. Soft-pause on missing/unauthenticated `gh` returns `COOLIFY_SETUP_PAUSED` immediately (SETUP-03); the agent re-calls `setup({ action: "resume", ... })` after the human completes auth — no in-tool polling (D-06).

Skills ship under `skills/coolify-*/SKILL.md` following the Agent Skills open format [VERIFIED: Context7 `/agentskills/agentskills`]. Distribution uses Vercel Skills CLI `npx skills add` with `-a cursor -a claude-code -a codex` [VERIFIED: Context7 `/vercel-labs/skills`]. No per-IDE hand-maintained copies (D-13). Docs/UI extend `docs/install.html`, new `docs/en/setup.md`, and README EN/DE per `22-UI-SPEC.md`.

**Primary recommendation:** Add `src/mcp/tools/setup.ts` + `src/utils/gh-preflight.ts`; orchestrate by calling existing handler functions internally; ship four skills at repo root; document install with canonical `npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `gh` presence/auth check | API / Backend (MCP tool) | — | Subprocess on MCP host; must not block on TTY |
| Soft-pause / resume signaling | API / Backend (MCP tool) | Agent (re-call) | MCP returns structured pause; human acts outside tool |
| Coolify project/env/server linkage | API / Backend (MCP + Coolify REST) | — | Creates or resolves remote resources via existing API client |
| App provisioning (recipes) | API / Backend (MCP `recipe`) | — | `create-git-app` / `create-app-db` / `create-one-click` already exist |
| Manifest write | Database / Storage (workspace file) | API / Backend | `.coolify/manifest.json` via `ManifestManager` |
| Deploy + watch (optional) | API / Backend (MCP `deployment`) | — | Bounded `deployment.watch`; never infinite block |
| Skills install | CDN / Static (repo + npx) | Browser (docs) | User runs `npx skills add` locally; docs show command |
| Setup guide / install UI | CDN / Static (`docs/`) | — | Static HTML/CSS; no SPA wizard |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Setup Surface
- **D-01:** Implement setup as a new MCP domain tool `setup` (flat schema + actionsCatalog per Phase 19). Primary agent entry — not CLI-first.
- **D-02:** Expected actions include at least preflight / wire (or equivalent greenfield orchestration) / resume. Exact action names under Claude discretion as long as SETUP-01–03 are met.
- **D-03:** A CLI wrapper (`src/cli/setup-wizard.ts`) is optional later and must reuse the same core logic if added — not required for phase success.

#### gh Preflight & Pause/Resume
- **D-04:** Verify `gh` presence (`gh --version`) and auth (`gh auth status`) with strict non-interactive / timeout-safe invocation — never block indefinitely on TTY or stdin.
- **D-05:** If `gh` missing or unauthenticated: return a structured soft-pause (`needs_human` or equivalent) with install/`gh auth login` guidance and an unambiguous resume instruction (re-call resume/wire). Agent stops; human completes auth; agent resumes.
- **D-06:** Do not poll-wait inside the tool for the human to finish `gh auth`.

#### Wizard Modes & Depth
- **D-07:** Support modes: `greenfield` | `link-existing`. — **Reversibility:** costly — both modes shape the public `setup` action contract and skill docs.
- **D-08:** `link-existing`: resolve/link Coolify project + environment + server (and resources as provided) and update `.coolify/manifest.json` via existing manifest helpers — no forced resource create.
- **D-09:** `greenfield` core (required): `gh` preflight → optional `gh repo create` (no auto-push) → Coolify project/environment/server linkage → app create via recipes (`create-git-app` / `create-app-db` / `create-one-click` as parameterized) → write/update `.coolify/manifest.json`.
- **D-10:** Greenfield maximal path is available but opt-in: domains, env wiring, and deploy+watch are **optional flags**, defaults **off** (`include_domains?`, `set_env?`, `deploy_and_watch?` or equivalent names).
- **D-11:** When `deploy_and_watch` is enabled: fire deploy (via existing application/recipe paths), return `deployment_uuid`, and steer to / call `deployment.watch` with bounded timeout — never forever-block the MCP session. Include timeout/recovery hints (Phase 21).
- **D-12:** Never auto-push unfinished git. At most suggest a `git push` command in the response. — **Reversibility:** one-way — matches REQUIREMENTS out-of-scope; do not add auto-push later without a requirements change.

#### IDE Skills (Vercel Skills CLI)
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

### Deferred Ideas (OUT OF SCOPE)
- Windsurf / additional IDE targets beyond Cursor, Claude Code, Codex
- Thin CLI `setup-wizard` wrapper (optional; D-03)
- Separate published skills-only repo
- OpenAPI coverage tooling — Phase 23
- Live npm Release publish — Phase 23
- Auto-push unfinished git — permanently out of scope unless REQUIREMENTS change
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Setup flow verifies `gh` presence and auth; if missing, provides install/login guidance (headless-safe, no indefinite TTY block) | `src/utils/gh-preflight.ts` with `execFile` + timeout; `COOLIFY_SETUP_PAUSED` envelope; gh env token precedence [CITED: cli.github.com/manual/gh_help_environment] |
| SETUP-02 | Setup wizard wires Coolify project/environment/server linkage and updates workspace manifest | Reuse `ManifestManager`, `project.create`, `environment.create`, `server.get`; link-existing via manifest `set`/`upsert` |
| SETUP-03 | Setup supports non-interactive / ask-human pause path so agents can resume after user completes `gh auth` | `preflight` + `resume` actions; no poll loop; `recoveryHints` + `_formattedText` banners per UI-SPEC |
| SKILL-01 | Repo ships Coolify skill pack for Cursor, Claude Code, and Codex with consistent workflows | `skills/coolify-*/SKILL.md` + `npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex` [VERIFIED: Context7 `/vercel-labs/skills`] |
| SKILL-02 | Skills document recipes, deploy watch, prompts, and safety rules (confirm gates, reveal opt-in) | Four skills aligned to MCP prompts + recipe/watch/safety sections; cross-ref Phase 21 watch semantics |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `child_process.execFile` | Node ≥24 (project engines) | `gh --version`, `gh auth status`, optional `gh repo create` | Zero new deps; STACK.md rejects `execa` for lightweight gh checks [CITED: `.planning/research/STACK.md`] |
| Existing `zod` + `createFlatActionSchema` | ^4.4.3 | `setup` action schema | Phase 19 flat-schema DX pattern already in all domain tools |
| `ManifestManager` (`src/utils/manifest.ts`) | in-repo | Atomic manifest writes | Phase 17; write lock + tmp-rename already implemented |
| Existing recipe/project/deployment handlers | in-repo | Orchestration targets | D-03/D-20: wizard owns hard linkage; recipes stay soft elsewhere |
| Vercel Skills CLI (`npx skills`) | 1.5.20 (registry, 2026-07-22) | User-facing skill install | User-locked D-13; not an MCP runtime dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Agent Skills format (`SKILL.md`) | agentskills.io spec | Skill frontmatter + body | Every `skills/coolify-*/SKILL.md` |
| `docs/shared.css` | in-repo | Install + setup docs styling | Extend per `22-UI-SPEC.md` |
| Vitest | ^4.1.10 | Co-located unit tests | `setup.test.ts`, `gh-preflight.test.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MCP `setup` tool | CLI-first `@clack/prompts` wizard | CONTEXT D-01 locks MCP; CLI optional later (D-03) |
| Per-IDE skill copies | Vercel `npx skills add` | User rejected divergent copies (D-13) |
| In-tool gh auth polling | Soft-pause + `resume` | Polling blocks headless agents (Pitfall 7) |
| New setup state file | Stateless resume params + manifest partial | Fewer files; agent passes same wire params on resume |

**Installation (phase code):** No new `package.json` dependencies.

**Installation (user skills):**
```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

**Version verification:**
```bash
npm view skills version          # 1.5.20 (consumer CLI, not bundled)
node --version                   # >=24 per package.json engines
gh --version                     # 2.91.0 verified on research host
```

## Package Legitimacy Audit

> Phase implementation adds **no** new npm dependencies. Consumer-facing `npx skills` documented for users only.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `skills` (CLI) | npm | ~4 days (published 2026-07-22) | ~10.7M/wk | github.com/vercel-labs/skills | SUS (too-new) | Document as `npx skills@latest` consumer install; not added to `package.json`. Official docs via vercel-labs/skills [VERIFIED: Context7] |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `skills` — user-facing `npx` only; planner may add `checkpoint:human-verify` if pinning a version in docs

*No runtime install of `skills` package into awesome-coolify-mcp.*

## Architecture Patterns

### System Architecture Diagram

```
Agent (Cursor / Claude Code / Codex)
    │
    ├─► MCP setup tool ─────────────────────────────────────────────┐
    │       │                                                        │
    │       ├─► gh-preflight (execFile, timeout)                    │
    │       │       ├─ missing/unauth ──► COOLIFY_SETUP_PAUSED ──────┼──► Human: install gh / gh auth login
    │       │       └─ ok ──────────────────────────────────────────┤         Agent: setup(resume)
    │       │                                                        │
    │       ├─► mode: link-existing                                  │
    │       │       ├─► resolve project/env/server UUIDs              │
    │       │       └─► ManifestManager.save / upsert                 │
    │       │                                                        │
    │       └─► mode: greenfield                                     │
    │               ├─► optional gh repo create (no --push)           │
    │               ├─► project.create / environment.create           │
    │               ├─► server.get (validate linkage)                 │
    │               ├─► recipe.create-* (internal handler)            │
    │               ├─► ManifestManager (write manifest)                │
    │               └─► [if deploy_and_watch] application.deploy      │
    │                       └─► deployment.watch (bounded timeout)    │
    │                                                                │
    └─► npx skills add clezcoding/awesome-coolify ──► skills/coolify-*/SKILL.md
            └─► IDE agent loads workflow playbooks (setup/deploy/diagnose/incident)
```

### Recommended Project Structure

```
src/
├── mcp/
│   ├── server.ts              # register setup tool
│   ├── tools/
│   │   ├── setup.ts           # NEW: schema + handleSetupAction
│   │   └── setup.test.ts      # NEW: preflight, pause, wire mocks
│   └── prompts.ts             # existing; skills reference same workflows
├── utils/
│   ├── gh-preflight.ts        # NEW: execFile wrappers, typed results
│   └── gh-preflight.test.ts   # NEW: mock child_process
skills/
├── coolify-setup/SKILL.md
├── coolify-deploy/SKILL.md
├── coolify-diagnose/SKILL.md
└── coolify-incident/SKILL.md
docs/
├── install.html               # extend: skills install block
├── en/setup.md                # NEW: MCP setup flow docs
└── shared.css                 # .notice--pause, .setup-steps, etc.
README.md / README.de.md       # skills install + setup pointer
```

### Pattern 1: Flat Action Schema + actionsCatalog

**What:** New `setup` tool follows Phase 19 `createFlatActionSchema` + `composeToolDescription` registration in `server.ts`.

**When to use:** All new MCP domain tools.

**Example:**
```typescript
// Pattern from src/mcp/tools/recipe.ts + src/mcp/server.ts
export const setupActionsCatalog =
  'Actions: preflight() · wire(mode, recipe_type?, ...) · resume(mode?, ...)';

export const setupActionSchema = createFlatActionSchema(
  ['preflight', 'wire', 'resume'],
  { mode: z.enum(['greenfield', 'link-existing']).optional(), /* ... */ },
  { preflight: [], wire: ['mode', /* ... */], resume: [] },
  { wire: ['mode'] },
);
```

### Pattern 2: Headless gh Preflight Helper

**What:** Isolated subprocess utility with timeout, no stdin, no interactive commands.

**When to use:** SETUP-01/03; greenfield only (link-existing may skip gh if no repo step).

**Example:**
```typescript
// Source: Node.js child_process docs + gh environment manual
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const GH_TIMEOUT_MS = 5_000;

export async function checkGhAuth(): Promise<
  | { ok: true }
  | { ok: false; reason: 'gh_missing' | 'gh_unauthenticated'; message: string }
> {
  try {
    await execFileAsync('gh', ['--version'], {
      timeout: GH_TIMEOUT_MS,
      env: { ...process.env, GH_FORCE_TTY: '0' },
    });
  } catch {
    return { ok: false, reason: 'gh_missing', message: 'GitHub CLI not found' };
  }
  try {
    await execFileAsync('gh', ['auth', 'status'], {
      timeout: GH_TIMEOUT_MS,
      env: { ...process.env, GH_FORCE_TTY: '0' },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'gh_unauthenticated', message: 'GitHub CLI not authenticated' };
  }
}
```

Note: `GH_TOKEN` / `GITHUB_TOKEN` enable headless auth without `gh auth login` [CITED: cli.github.com/manual/gh_help_environment].

### Pattern 3: Internal Handler Reuse (Don't Re-call MCP)

**What:** `setup` orchestration imports and calls `handleRecipeAction`, `handleManifestAction` logic, or shared `ManifestManager` directly — same pattern as recipe using API client + manifest utils.

**When to use:** All provisioning steps inside `wire`.

**Anti-pattern:** Spawning a second MCP stdio session or duplicating recipe HTTP bodies.

### Pattern 4: Soft-Pause Error Envelope

**What:** Return `wrapMcpError(CoolifyApiError)` with new code `COOLIFY_SETUP_PAUSED` per UI-SPEC; `ok: false` at server boundary.

**When to use:** gh missing/unauthenticated; optionally other human-required gates.

**Example response fields:**
```json
{
  "ok": false,
  "error": {
    "code": "COOLIFY_SETUP_PAUSED",
    "message": "GitHub CLI is not authenticated.",
    "recoveryHints": [
      "Run: gh auth login",
      "Re-call: setup({ action: \"resume\" }) after auth succeeds"
    ],
    "data": {
      "pause_reason": "gh_unauthenticated",
      "resume_action": "resume"
    }
  }
}
```

### Pattern 5: Agent Skills Repo Layout

**What:** One directory per skill; `SKILL.md` with YAML frontmatter; name matches directory [VERIFIED: Context7 `/agentskills/agentskills`].

**When to use:** SKILL-01/02 delivery.

**Example:**
```markdown
---
name: coolify-setup
description: Run MCP setup preflight and wire Coolify project/environment/server linkage via setup tool. Use when onboarding a new workspace or linking an existing Coolify project.
---

# Coolify Setup
...
```

### Anti-Patterns to Avoid

- **Interactive gh inside MCP:** Never `gh auth login` or poll until auth succeeds (D-05/D-06, Pitfall 7).
- **Auto-push:** Never `git push` or `gh repo create --push` without explicit human step (D-12).
- **Hand-rolled per-IDE skills:** No `.cursor/skills/` copies as source of truth (D-13).
- **Forever watch in setup:** Cap `deployment.watch` timeout; surface `COOLIFY_WATCH_TIMEOUT` recovery (D-11, Phase 21).
- **Manifest as SoT:** Write manifest after API success; optional `manifest.sync` hint for drift (Phase 17, Pitfall 4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest atomic writes | Custom JSON write | `ManifestManager.save` / `upsert` | Write lock + tmp-rename already in `src/utils/manifest.ts` |
| Git app / app+db / one-click create | Duplicate API orchestration | `handleRecipeAction` or shared recipe internals | Phase 20 recipes tested and manifest-hint aware |
| Deploy polling | New poll loop | `pollDeploymentWithBackoff` via `deployment.watch` | Phase 21 backoff + 429 Retry-After |
| Flat MCP schema | Top-level oneOf unions | `createFlatActionSchema` | Cursor DX; Phase 19 standard |
| Skill install plumbing | Custom copy scripts | `npx skills add clezcoding/awesome-coolify` | User-locked distribution (D-13) |
| gh subprocess wrapper | `execa` dependency | `child_process.execFile` + `promisify` | STACK.md + ponytail: no new dep for 4 lines |

**Key insight:** Setup is an orchestration layer over proven domain tools — the risk is TTY blocking and skill/doc drift, not missing Coolify API coverage.

## Common Pitfalls

### Pitfall 1: Interactive gh Blocks Headless Agents

**What goes wrong:** `gh auth status` or `gh repo create` waits for TTY; MCP session hangs.

**Why it happens:** Default gh behavior when no token and no `--non-interactive` context.

**How to avoid:** `execFile` with timeout; `GH_FORCE_TTY=0`; never call `gh auth login`; document `GH_TOKEN` for CI/headless; return `COOLIFY_SETUP_PAUSED` immediately.

**Warning signs:** Integration test without mocked `child_process` hangs; agent session stuck at preflight.

### Pitfall 2: Skills Teach Wrong Tool Patterns

**What goes wrong:** Skills reference `application.deploy wait:true` as primary, omit `confirm`/`reveal`, or wrong action names.

**Why it happens:** Manual SKILL.md drift from Zod schemas.

**How to avoid:** Copy action names verbatim from `*ActionsCatalog` strings; align with `src/mcp/prompts.ts`; document watch timeout recovery from Phase 21; optional test grep for catalog action strings.

**Warning signs:** SKILL-02 audit fails; agents call nonexistent actions.

### Pitfall 3: Resume Without Params (Stateless MCP)

**What goes wrong:** `resume` cannot continue greenfield because prior wire params were lost.

**Why it happens:** MCP has no server-side session store.

**How to avoid:** `resume` accepts same wire params as `wire` (or subset); document agent must pass `mode`, UUIDs, `recipe_type` again; optionally persist non-secret progress in response `data.steps_completed` for agent memory.

**Warning signs:** Resume only re-runs preflight and exits.

### Pitfall 4: Link-Existing Forces Creates

**What goes wrong:** Wizard calls `project.create` when user only wanted manifest linkage.

**Why it happens:** Reusing greenfield path without mode branch.

**How to avoid:** `link-existing` branch: validate UUIDs via `project.get` / `server.get`, then `ManifestManager` or `manifest.set` — no recipe calls unless resources provided (D-08).

### Pitfall 5: deploy_and_watch Blocks MCP Host

**What goes wrong:** Default 300s+ watch inside `wire` exceeds client timeout.

**Why it happens:** In-process watch without cap or without documenting re-watch.

**How to avoid:** Use `deployment.watch` with explicit `timeout` (default 300); on `COOLIFY_WATCH_TIMEOUT` return `deployment_uuid` + recovery hints per UI-SPEC; consider returning UUID and delegating watch to agent (D-11 discretion).

## Code Examples

### Register setup Tool (server.ts pattern)

```typescript
// Source: src/mcp/server.ts manifest/recipe registration
server.registerTool(
  'setup',
  {
    description: composeToolDescription(
      'Workspace setup: gh preflight, Coolify linkage, optional greenfield provisioning.',
      setupActionsCatalog,
      setupSafetyFooter,
    ),
    inputSchema: withInstanceRoutingSchema(setupActionSchema),
    outputSchema: toolOutputSchema,
    annotations: { openWorldHint: true },
  },
  async (args) => {
    const result = await handleSetupAction(args, env);
    // same ok/error structuredContent mapping as manifest tool
  },
);
```

### Manifest Write After Recipe

```typescript
// Source: src/utils/manifest.ts ManifestManager.upsert
await ManifestManager.upsert({
  resource: { uuid: application_uuid, type: 'application', name: appName, domains: [] },
  project_uuid,
  project_name,
  environment_uuid,
  environment_name,
});
```

### Optional gh repo create (no push)

```typescript
// Source: gh repo create manual [ASSUMED: --push defaults false when omitted — verify in plan checkpoint]
await execFileAsync(
  'gh',
  ['repo', 'create', repoName, '--private', '--source', '.', '--remote', 'origin'],
  { timeout: 30_000, cwd: projectRoot, env: { ...process.env, GH_FORCE_TTY: '0' } },
);
// Response suggests: git push -u origin main (manual — D-12)
```

### Skills Install (docs/README)

```bash
# Source: vercel-labs/skills CLI docs [VERIFIED: Context7]
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
# Optional: npx skills add clezcoding/awesome-coolify --all
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CLI-first setup wizard (`@clack/prompts`) | MCP `setup` tool primary | Phase 22 CONTEXT D-01 | Agents invoke setup without terminal UI |
| Per-IDE skill copies (`.cursor/skills/`, etc.) | Repo-root `skills/` + `npx skills add` | Phase 22 D-13 | Single source of truth |
| `application.deploy wait:true` as primary monitor | `deployment.watch` with bounded timeout | Phase 21 | Skills must teach watch pattern |
| Soft manifest hints only (D-20) | Setup may require/produce manifest linkage | Phase 22 | Wizard writes manifest explicitly |

**Deprecated/outdated:**
- STACK.md per-IDE copy guidance — superseded by Vercel Skills CLI for Phase 22 (noted in CONTEXT canonical refs).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gh repo create` without `--push` does not push commits | Code Examples | Could violate D-12; planner should verify gh flag in checkpoint |
| A2 | `npx skills add owner/repo` discovers `skills/coolify-*/` at repo root | Standard Stack | May need `--full-depth` if layout not found |
| A3 | `resume` can rely on agent re-supplying wire params (no server session file) | Pitfall 3 | Poor UX if agents omit params; document required fields |
| A4 | Link-existing mode skips gh preflight when `skip_gh?: true` or mode does not need repo | Architecture | Over-strict gh gate blocks valid link-existing flows |

## Open Questions

1. **Exact `gh repo create` flags for no-push**
   - What we know: D-12 forbids auto-push; gh supports `--source` and push control.
   - What's unclear: Default push behavior for `gh repo create --source .` in gh 2.91.
   - Recommendation: Planner adds `checkpoint:human-verify` or unit test with mocked gh argv asserting no `--push`.

2. **In-process watch vs UUID handoff for `deploy_and_watch`**
   - What we know: D-11 allows either within bounded timeout.
   - What's unclear: MCP host default tool timeout budget.
   - Recommendation: Default in-process watch `timeout: 300`; on timeout return UUID + hints; skills document re-watch.

3. **Symlink vs `--copy` for skills install**
   - What we know: User deferred; Vercel CLI defaults to symlink with `--copy` opt-in.
   - Recommendation: Document default symlink; mention `--copy` for Windows/constrained FS in setup.md footnote only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | MCP server + tests | ✓ | v24.18.0 | — |
| `gh` CLI | SETUP-01 greenfield preflight | ✓ | 2.91.0 | Soft-pause + install guidance |
| `npx` | Skills install docs | ✓ | 11.16.0 | Document global `skills` install |
| Coolify API (COOLIFY_URL/TOKEN) | wire/linkage | ✓ (dev) | 4.1.x target | Existing instance tool / env |
| Git | optional repo create | ✓ | 2.50.1 | Required only for greenfield repo step |

**Missing dependencies with no fallback:**
- None on research host for implementation.

**Missing dependencies with fallback:**
- `gh` on end-user machine → `COOLIFY_SETUP_PAUSED` + manual install (SETUP-03).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- src/mcp/tools/setup.test.ts src/utils/gh-preflight.test.ts -x` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | gh missing → pause + hints | unit | `pnpm test -- src/utils/gh-preflight.test.ts -x` | ❌ Wave 0 |
| SETUP-01 | gh unauthenticated → pause | unit | `pnpm test -- src/utils/gh-preflight.test.ts -x` | ❌ Wave 0 |
| SETUP-02 | wire updates manifest | unit | `pnpm test -- src/mcp/tools/setup.test.ts -x` | ❌ Wave 0 |
| SETUP-03 | resume after pause re-runs preflight | unit | `pnpm test -- src/mcp/tools/setup.test.ts -x` | ❌ Wave 0 |
| SETUP-02 | link-existing no recipe create | unit | `pnpm test -- src/mcp/tools/setup.test.ts -x` | ❌ Wave 0 |
| SKILL-01 | skills dirs exist + valid frontmatter | unit | `pnpm test -- src/skills/skills-manifest.test.ts -x` | ❌ Wave 0 (optional) |
| SKILL-02 | skills mention watch/recipes/safety | unit | grep/snapshot test | ❌ Wave 0 (optional) |

### Sampling Rate

- **Per task commit:** `pnpm test -- src/mcp/tools/setup.test.ts src/utils/gh-preflight.test.ts -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/utils/gh-preflight.ts` + `src/utils/gh-preflight.test.ts` — mock `child_process.execFile`
- [ ] `src/mcp/tools/setup.ts` + `src/mcp/tools/setup.test.ts` — mock recipe/manifest/project/gh
- [ ] `COOLIFY_SETUP_PAUSED` in `CoolifyErrorCode` + `RECOVERY_HINTS` in `src/utils/errors.ts`
- [ ] `server.ts` registration + tools/list count test update
- [ ] `skills/coolify-*/SKILL.md` (4 files) + optional frontmatter schema test
- [ ] `docs/en/setup.md`, `docs/install.html` skills block, README EN/DE sections

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | gh preflight only; no gh token storage in MCP |
| V3 Session Management | no | Stateless setup actions |
| V4 Access Control | yes | Coolify token via existing instance routing |
| V5 Input Validation | yes | Zod flat schema + `createFlatActionSchema` |
| V6 Cryptography | no | No new crypto; mask via existing `redactSecrets` |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| gh subprocess command injection | Tampering | Fixed argv arrays; no shell; validate `repo_name` with strict regex |
| Leaking `gh` token in `_formattedText` | Information Disclosure | Never pass `--show-token`; use existing `redactSecrets` on outputs |
| Manifest path traversal | Tampering | `ManifestManager` uses `resolveProjectRoot()` only |
| Skill install typosquat | Spoofing | Pin docs to `clezcoding/awesome-coolify` only |
| Unauthorized Coolify creates | Elevation | Existing COOLIFY_TOKEN scope; no bypass of `confirm` on destructive ops |

## Project Constraints (from .cursor/rules/)

| Rule | Directive | Phase impact |
|------|-----------|--------------|
| ponytail | Reuse helpers; no new deps unless necessary; minimal diff | Use `ManifestManager`, recipe handlers, stdlib `execFile` |
| honey | Terse implementation; no speculative abstractions | Single `setup.ts` + small `gh-preflight.ts` |
| graphify | Run `graphify update .` after code file edits | Executor post-implementation |
| gsd-ship-labels | Run `./scripts/gsd-ship-post.sh` after ship PR | Phase ship workflow |
| context7 / wigolo | Use for external library docs | Skills CLI + gh docs sourced accordingly |
| spike-findings | No stub tools; action-based; Coolify 4.1.x | Setup must not add tools without API backing |
| caveman | Terse agent comms | N/A to code |

## Sources

### Primary (HIGH confidence)

- Context7 `/vercel-labs/skills` — `npx skills add` flags, repo layout, agent targets
- Context7 `/agentskills/agentskills` — SKILL.md frontmatter, directory structure
- `22-CONTEXT.md`, `22-UI-SPEC.md` — locked decisions and agent-visible UX contract
- `src/mcp/tools/recipe.ts`, `manifest.ts`, `deployment.ts` — reuse targets verified in codebase

### Secondary (MEDIUM confidence)

- [cli.github.com/manual/gh_help_environment](https://cli.github.com/manual/gh_help_environment) — `GH_TOKEN` / `GITHUB_TOKEN` headless auth
- [cli.github.com/manual/gh_auth_status](https://cli.github.com/manual/gh_auth_status) — auth status command options
- `.planning/research/PITFALLS.md` — Pitfall 7 (gh headless), Pitfall 14 (skills patterns)

### Tertiary (LOW confidence)

- `gh repo create` default push behavior — marked [ASSUMED] in Assumptions Log; verify at implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — codebase patterns + Context7 skills docs verified
- Architecture: HIGH — orchestration over existing tools; CONTEXT locks MCP-first
- Pitfalls: HIGH — PITFALLS.md + Phase 21 watch behavior already shipped

**Research date:** 2026-07-26
**Valid until:** 2026-08-26 (skills CLI may move fast — re-check `npm view skills version` if install fails)
