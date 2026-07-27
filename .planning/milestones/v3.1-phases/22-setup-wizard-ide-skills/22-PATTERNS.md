# Phase 22: Setup Wizard & IDE Skills - Pattern Map

**Mapped:** 2026-07-26
**Files analyzed:** 19
**Analogs found:** 16 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/setup.ts` | controller | request-response + file-I/O | `src/mcp/tools/recipe.ts` | exact |
| `src/mcp/tools/setup.test.ts` | test | batch (mocked orchestration) | `src/mcp/tools/recipe.test.ts` | exact |
| `src/utils/gh-preflight.ts` | utility | request-response (subprocess) | `src/mcp/tools/deployment.ts` (timeout/error only) | partial |
| `src/utils/gh-preflight.test.ts` | test | batch (mocked subprocess) | `src/mcp/tools/deployment.test.ts` | role-match |
| `src/mcp/server.ts` | route | request-response | `src/mcp/server.ts` (`recipe` block) | exact |
| `src/mcp/server.test.ts` | test | batch | `src/mcp/server.test.ts` (existing tool count) | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (`COOLIFY_WATCH_TIMEOUT`) | exact |
| `src/utils/errors.test.ts` | test | batch | `src/utils/errors.test.ts` (watch error codes block) | exact |
| `skills/coolify-setup/SKILL.md` | config | transform (agent playbook) | `src/mcp/prompts.ts` (`new-project`) | role-match |
| `skills/coolify-deploy/SKILL.md` | config | transform | `src/mcp/prompts.ts` (`deploy`) | exact |
| `skills/coolify-diagnose/SKILL.md` | config | transform | `src/mcp/prompts.ts` (`diagnose`) | exact |
| `skills/coolify-incident/SKILL.md` | config | transform | `src/mcp/prompts.ts` (`incident`) | exact |
| `docs/install.html` | component | file-I/O (static) | `docs/install.html` (existing notice/form) | exact |
| `docs/en/setup.md` | config | transform | `docs/en/cloud.md` | exact |
| `docs/shared.css` | config | transform | `docs/shared.css` (`.notice`) | exact |
| `docs/index.html` | component | file-I/O (static) | `docs/index.html` (bento cards) | exact |
| `README.md` | config | transform | `README.md` (Install section) | exact |
| `README.de.md` | config | transform | `README.de.md` (Installation section) | exact |
| `src/skills/skills-manifest.test.ts` | test | batch | `src/utils/errors.test.ts` (catalog string asserts) | partial |

**Deferred (out of phase scope):** `src/cli/setup-wizard.ts` — optional per D-03; if added later, must import core from `setup.ts` handler layer.

---

## Pattern Assignments

### `src/mcp/tools/setup.ts` (controller, request-response + file-I/O)

**Analog:** `src/mcp/tools/recipe.ts` (orchestration) + `src/mcp/tools/manifest.ts` (manifest write) + `src/mcp/tools/project.ts` (linkage create)

**Imports pattern** (recipe.ts lines 1-41):

```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  createFlatActionSchema,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';
```

**Catalog + safety footer** (recipe.ts lines 63-67):

```typescript
export const setupActionsCatalog =
  'Actions: preflight() · wire(mode, ...) · resume(mode?, ...)';

export const setupSafetyFooter =
  'Safety: optional instance · no auto-push · gh soft-pause';
```

**Flat action schema** (recipe.ts lines 109-110, manifest.ts lines 34-70):

```typescript
export const setupActionSchema = createFlatActionSchema(
  ['preflight', 'wire', 'resume'],
  {
    mode: z.enum(['greenfield', 'link-existing']).optional(),
    include_domains: z.boolean().optional(),
    set_env: z.boolean().optional(),
    deploy_and_watch: z.boolean().optional(),
    // ... wire params shared with resume (project_uuid, server_uuid, recipe_type, etc.)
    ...sharedReadParamsFlatShape,
  },
  {
    preflight: [],
    wire: ['mode', /* ... */],
    resume: ['mode', /* same wire fields for stateless resume */],
  },
  { wire: ['mode'] },
);
```

**Handler switch + wrapMcpError** (recipe.ts lines 819-848):

```typescript
export async function handleSetupAction(
  args: unknown,
  env: EnvConfig,
): Promise<SetupActionResult> {
  try {
    const parsed = parseSetupAction(args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'preflight':
        return await handlePreflight(parsed);
      case 'wire':
        return await handleWire(parsed, routingEnv);
      case 'resume':
        return await handleResume(parsed, routingEnv);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown setup action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isSetupErrorResult(
  result: SetupActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
```

**Soft-pause throw (not poll)** — use `CoolifyApiError` with new code; mirror deployment timeout throw style (deployment.ts lines 338-348):

```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_SETUP_PAUSED',
  message: 'GitHub CLI is not authenticated.',
  recoveryHints: RECOVERY_HINTS.COOLIFY_SETUP_PAUSED,
  data: {
    pause_reason: 'gh_unauthenticated',
    resume_action: 'resume',
    resume_params: {},
  },
});
```

**Internal handler reuse (do not re-call MCP)** — call existing exports directly:

```typescript
import { handleRecipeAction } from './recipe.js';
import { handleDeploymentAction } from './deployment.js';
import { ManifestManager } from '../../utils/manifest.js';
import { checkGhAuth } from '../../utils/gh-preflight.js';

// greenfield recipe step:
const recipeResult = await handleRecipeAction(
  { action: 'create-git-app', server_uuid, project_uuid, /* ... */ },
  env,
);

// manifest after API success (manifest.ts lines 465-473):
await ManifestManager.upsert({
  resource: { uuid: application_uuid, type: 'application', name: appName, domains: [] },
  project_uuid,
  project_name,
  environment_uuid,
  environment_name,
});
```

**Optional deploy_and_watch** — delegate to `handleDeploymentAction` with bounded timeout (deployment.ts lines 72-79, 400-401):

```typescript
const watchResult = await handleDeploymentAction(
  {
    action: 'watch',
    deployment_uuid,
    timeout: 300,
    instance: parsed.instance,
  },
  env,
);
```

**Success response shape** — use `buildReadResponse` with `setup_status`, `current_step`, `steps_completed`, `steps_remaining` per `22-UI-SPEC.md` Agent-Visible UX Contract.

---

### `src/utils/gh-preflight.ts` (utility, request-response subprocess)

**Analog:** No existing `execFile` utility in repo. Partial analog: deployment watch timeout discipline (`src/mcp/tools/deployment.ts` lines 302-328). Implementation follows RESEARCH.md Pattern 2 (stdlib only).

**Imports pattern:**

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const GH_TIMEOUT_MS = 5_000;
const GH_ENV = { ...process.env, GH_FORCE_TTY: '0' };
```

**Core pattern** (fixed argv, no shell, no stdin):

```typescript
export type GhPreflightResult =
  | { ok: true }
  | { ok: false; reason: 'gh_missing' | 'gh_unauthenticated'; message: string };

export async function checkGhAuth(): Promise<GhPreflightResult> {
  try {
    await execFileAsync('gh', ['--version'], {
      timeout: GH_TIMEOUT_MS,
      env: GH_ENV,
    });
  } catch {
    return { ok: false, reason: 'gh_missing', message: 'GitHub CLI not found' };
  }
  try {
    await execFileAsync('gh', ['auth', 'status'], {
      timeout: GH_TIMEOUT_MS,
      env: GH_ENV,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'gh_unauthenticated', message: 'GitHub CLI not authenticated' };
  }
}
```

**Optional repo create** — separate export; never `--push`; suggest manual `git push` in response only (D-12).

**Security:** Fixed argv arrays; validate `repo_name` with strict regex before passing to `gh repo create`; never `gh auth login`; never `--show-token`.

---

### `src/mcp/tools/setup.test.ts` (test, batch)

**Analog:** `src/mcp/tools/recipe.test.ts` + `src/mcp/tools/manifest.test.ts`

**Mock setup** (recipe.test.ts lines 1-46, manifest.test.ts lines 43-56):

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../utils/gh-preflight.js', () => ({
  checkGhAuth: vi.fn(),
}));

vi.mock('./recipe.js', () => ({
  handleRecipeAction: vi.fn(),
}));

vi.mock('../../utils/manifest.js', () => ({
  ManifestManager: { upsert: vi.fn(), save: vi.fn() },
}));
```

**Workspace root for manifest** (manifest.test.ts lines 43-56):

```typescript
beforeEach(() => {
  testWorkspaceRoot = mkdtempSync(join(tmpdir(), 'coolify-mcp-setup-tool-'));
  process.env.COOLIFY_MCP_TEST_WORKSPACE = testWorkspaceRoot;
  vi.clearAllMocks();
});
```

**Test cases to cover:** gh missing → `COOLIFY_SETUP_PAUSED`; gh unauth → pause; resume re-runs preflight; wire greenfield updates manifest; link-existing skips recipe create; deploy_and_watch returns UUID on timeout.

---

### `src/utils/gh-preflight.test.ts` (test, batch)

**Analog:** `src/mcp/tools/deployment.test.ts` (mock external boundary)

**Mock child_process:**

```typescript
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// promisify(execFile) in module under test — mock execFile to resolve/reject per test
```

**Assert:** timeout option passed; `GH_FORCE_TTY: '0'` in env; no interactive commands invoked.

---

### `src/mcp/server.ts` (route registration)

**Analog:** `recipe` registration block (server.ts lines 716-748)

**Import block** (add alongside recipe import, lines 119-125):

```typescript
import {
  handleSetupAction,
  isSetupErrorResult,
  setupActionSchema,
  setupActionsCatalog,
  setupSafetyFooter,
} from './tools/setup.js';
```

**Registration** (mirror recipe.ts lines 716-748):

```typescript
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
    if (isSetupErrorResult(result)) {
      return {
        ...result,
        structuredContent: {
          ok: false,
          error: result.structuredContent.error,
        },
      };
    }
    return {
      content: [{ type: 'text', text: result._formattedText }],
      structuredContent: {
        ok: true,
        data: result.data,
        _meta: result._meta,
      },
    };
  },
);
```

---

### `src/mcp/server.test.ts` (test)

**Analog:** existing tool registration test (server.test.ts lines 54-81, 250-268)

**Updates required:**
- `registerTool(` count: `17` → `18`
- Add `expect(source).toContain("registerTool(\n    'setup'")`
- Add `'setup'` to `expectedTools` array (line 261)
- Add `setupActionSchema` to routed schema list if applicable

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `COOLIFY_WATCH_TIMEOUT` addition pattern (errors.ts lines 26-27, 135-138)

**Add to union** (lines 4-28):

```typescript
| 'COOLIFY_SETUP_PAUSED'
```

**Add RECOVERY_HINTS** (mirror COOLIFY_WATCH_TIMEOUT style, lines 135-138):

```typescript
COOLIFY_SETUP_PAUSED: [
  'Install GitHub CLI: https://cli.github.com/ (or brew install gh)',
  'Run: gh auth login (or set GH_TOKEN / GITHUB_TOKEN for headless)',
  'Re-call: setup({ action: "resume", ... }) after auth succeeds — pass same wire params',
],
```

**Error return path:** `wrapMcpError` already handles `CoolifyApiError` with custom `recoveryHints` and `data` (errors.ts lines 468-481).

---

### `src/utils/errors.test.ts` (test)

**Analog:** `deployment watch error codes` describe block (errors.test.ts lines 384-421)

```typescript
describe('setup pause error codes', () => {
  it('RECOVERY_HINTS defines COOLIFY_SETUP_PAUSED with resume hint', () => {
    const hints = RECOVERY_HINTS.COOLIFY_SETUP_PAUSED;
    expect(hints.length).toBeGreaterThanOrEqual(1);
    expect(hints.join(' ')).toMatch(/setup.*resume/i);
  });

  it('CoolifyErrorCode union includes COOLIFY_SETUP_PAUSED', () => {
    const code: CoolifyErrorCode = 'COOLIFY_SETUP_PAUSED';
    expect(RECOVERY_HINTS[code].length).toBeGreaterThanOrEqual(1);
  });
});
```

---

### `skills/coolify-setup/SKILL.md` (config, agent playbook)

**Analog:** `src/mcp/prompts.ts` `new-project` prompt (lines 106-151) — but primary entry is `setup` tool per D-01

**Frontmatter** (Agent Skills spec; `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` lines 1-4):

```markdown
---
name: coolify-setup
description: Run MCP setup preflight and wire Coolify project/environment/server linkage. Use when onboarding a new workspace or linking an existing Coolify project.
---
```

**Body must include:**
- `setup({ action: "preflight" })` then `setup({ action: "wire", mode: "greenfield" | "link-existing", ... })`
- Soft-pause: on `COOLIFY_SETUP_PAUSED`, stop and instruct human `gh auth login`; resume with `setup({ action: "resume", ... })` passing same wire params
- Modes: greenfield vs link-existing (D-07/D-08)
- Optional flags default off: `include_domains`, `set_env`, `deploy_and_watch`
- Never auto-push git (D-12)
- Action names verbatim from `setupActionsCatalog`

---

### `skills/coolify-deploy/SKILL.md` (config, agent playbook)

**Analog:** `src/mcp/prompts.ts` `deploy` prompt (lines 18-62) — **exact workflow source**

**Core workflow to copy** (prompts.ts lines 46-58):

```markdown
1. Resolve application UUID from args, `.coolify/manifest.json`, or ask user.

2. Trigger deployment (no wait):
   application({ action: "deploy", uuid: "<uuid>", wait: false })

3. Monitor with bounded watch:
   deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })

4. On COOLIFY_WATCH_TIMEOUT: re-call deployment.watch with same deployment_uuid.
   On failed/cancelled: surface error — do not treat as success.

Note: application.deploy wait:true is legacy; prefer deployment.watch.
```

---

### `skills/coolify-diagnose/SKILL.md` (config, agent playbook)

**Analog:** `src/mcp/prompts.ts` `diagnose` prompt (lines 65-103)

**Copy action catalog from** `diagnoseActionsCatalog` in `src/mcp/tools/diagnose.ts` line 70-71:

```
Actions: app(query?, uuid?, name?, domain?, limit?) · server(...) · scan(...)
```

Document `reveal` opt-in and `confirm` for destructive ops per SKILL-02.

---

### `skills/coolify-incident/SKILL.md` (config, agent playbook)

**Analog:** `src/mcp/prompts.ts` `incident` prompt (lines 154-196)

**Include:** diagnose → logs → restart → emergency paths; `confirm` gates on destructive emergency actions.

---

### `docs/install.html` (component, static)

**Analog:** existing `docs/install.html` notice + output section (lines 27-35, 82-96)

**Add skills install block** after security notice, using `.skills-command` wrapper per `22-UI-SPEC.md`:

```html
<div class="notice">
  <strong>IDE skills:</strong> Install workflow playbooks for Cursor, Claude Code, and Codex:
</div>
<section class="skills-command glass-elevated">
  <pre><code id="skills-install-cmd">npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex</code></pre>
  <button type="button" class="btn" id="copy-skills-btn">Copy</button>
</section>
```

Reuse existing `#copy-btn` JS pattern from install.html footer script.

Update hero lead tool count: `16 tools` → `18 tools` when setup ships (setup is 18th registerTool per 22-01; live server.ts has 17 today).

---

### `docs/en/setup.md` (config, markdown docs)

**Analog:** `docs/en/cloud.md` (structure: overview → setup paths → code blocks → limits)

**Structure:**
1. Overview — MCP `setup` tool is primary entry (not CLI wizard)
2. Prerequisites — `gh`, `COOLIFY_URL`/`COOLIFY_TOKEN`
3. Modes table — greenfield vs link-existing
4. Step list with `.setup-steps` / `.setup-step--active` classes (rendered when wrapped in HTML shell)
5. Soft-pause section with `.notice--pause` styling reference
6. Skills install cross-link to install.html
7. Optional flags section with `.notice--warning`

**Code block style** (cloud.md lines 17-19):

```js
setup({ action: "preflight" })
setup({ action: "wire", mode: "greenfield", server_uuid: "<uuid>", recipe_type: "create-git-app", /* ... */ })
```

---

### `docs/shared.css` (config, styles)

**Analog:** existing `.notice` (shared.css lines 383-395)

**Add per UI-SPEC** (extend, do not replace):

```css
.notice--pause {
  border-color: rgba(252, 211, 77, 0.35);
  background: rgba(252, 211, 77, 0.08);
}

.notice--warning {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.08);
}

.setup-steps { /* ordered list with left border */ }
.setup-step--active { border-left: 3px solid var(--accent); }
.setup-step--done { opacity: 0.7; }
.skills-command { /* pre + copy button row */ }
```

---

### `docs/index.html` (component, static)

**Analog:** bento cards (index.html lines 34-51)

Add card or nav link: "Setup guide" → `en/setup.md`; "IDE skills" → `install.html#skills` (anchor on skills block).

---

### `README.md` / `README.de.md` (config, docs)

**Analog:** existing Install section structure (README.md lines 175-235)

**Add subsection** after MCP install walkthrough:

```markdown
### IDE workflow skills

Install Coolify workflow skills for Cursor, Claude Code, and Codex:

\`\`\`bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
\`\`\`

See [Setup guide](docs/en/setup.md) for the MCP `setup` tool (gh preflight, project linkage, greenfield provisioning).
```

Mirror structure in `README.de.md` Installation section.

---

### `src/skills/skills-manifest.test.ts` (test, optional)

**Analog:** `src/utils/errors.test.ts` catalog string asserts (lines 384-421) + frontmatter from spike skill

**Pattern:**

```typescript
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS = ['coolify-setup', 'coolify-deploy', 'coolify-diagnose', 'coolify-incident'];

it('each skill has valid frontmatter name matching directory', () => {
  for (const dir of SKILLS) {
    const content = readFileSync(join('skills', dir, 'SKILL.md'), 'utf8');
    expect(content).toMatch(/^---\nname: /);
    expect(content).toContain('deployment.watch');
    expect(content).toContain('confirm');
  }
});
```

---

## Shared Patterns

### Flat action schema + actionsCatalog + safety footer

**Source:** `src/mcp/tools/recipe.ts` lines 63-67, 109-110
**Apply to:** `setup.ts`, `setupActionsCatalog` in skills, `server.test.ts` description asserts

```typescript
export const setupActionsCatalog =
  'Actions: preflight() · wire(mode, ...) · resume(mode?, ...)';

export const setupSafetyFooter =
  'Safety: optional instance · no auto-push · gh soft-pause';
```

### Instance routing

**Source:** `src/mcp/tools/shared-read-params.ts` — `withInstanceRoutingSchema`, `resolveRoutingEnv`
**Apply to:** `setup.ts` schema + handler (same as recipe/manifest)

### Error envelope + recoveryHints

**Source:** `src/utils/errors.ts` lines 468-481
**Apply to:** All setup actions via `wrapMcpError`; soft-pause via `CoolifyApiError` + `COOLIFY_SETUP_PAUSED`

```typescript
export function wrapMcpError(error: unknown): McpErrorResult {
  const raw = toStructuredError(error);
  const envelope: CoolifyErrorEnvelope = {
    ...raw,
    message: redactSecrets(raw.message),
    recoveryHints: raw.recoveryHints.map((hint) => redactSecrets(hint)),
    ...(raw.data ? { data: redactEnvelopeData(raw.data) } : {}),
  };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
    structuredContent: { ok: false, error: envelope },
  };
}
```

### Manifest atomic writes

**Source:** `src/utils/manifest.ts` lines 168-183
**Apply to:** `setup.ts` wire/link-existing completion

```typescript
static async upsert(input: {
  resource: ManifestResource;
  project_uuid?: string;
  project_name?: string;
  environment_uuid?: string;
  environment_name?: string;
}): Promise<void> {
  return ManifestManager.withWriteLock(async () => {
    const resource = manifestResourceSchema.parse(input.resource);
    // ...
  });
}
```

### Bounded deployment watch

**Source:** `src/mcp/tools/deployment.ts` lines 72-79, 333-348
**Apply to:** `setup.ts` when `deploy_and_watch: true`

- Default `timeout: 300` (max 1800)
- On timeout: `COOLIFY_WATCH_TIMEOUT` + `deployment_uuid` in response data
- Never infinite poll

### Headless subprocess safety

**Source:** RESEARCH.md Pattern 2 + deployment timeout discipline
**Apply to:** `gh-preflight.ts` only new subprocess boundary

- `execFile` with fixed argv (no shell)
- `timeout: 5000` ms
- `GH_FORCE_TTY: '0'`
- Never `gh auth login`; never poll for human

### Skill ↔ prompt alignment

**Source:** `src/mcp/prompts.ts`
**Apply to:** All four `skills/coolify-*/SKILL.md` files

| Skill | Prompt analog |
|-------|---------------|
| coolify-setup | `new-project` + new `setup` actions |
| coolify-deploy | `deploy` |
| coolify-diagnose | `diagnose` |
| coolify-incident | `incident` |

Skills hold long playbooks; prompts stay short per Phase 19.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/utils/gh-preflight.ts` | utility | subprocess | No existing `child_process.execFile` utility in repo; only integration test spawns MCP child. Use RESEARCH.md Pattern 2 + deployment timeout error discipline as partial guide. |
| `src/skills/skills-manifest.test.ts` | test | batch | Optional new test type; no prior skills directory at repo root. Use errors.test.ts string-assert style as partial analog. |

---

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/mcp/server.ts`, `src/mcp/prompts.ts`, `src/utils/errors.ts`, `docs/`, `README*.md`, `.cursor/skills/`
**Files scanned:** ~45
**Pattern extraction date:** 2026-07-26
