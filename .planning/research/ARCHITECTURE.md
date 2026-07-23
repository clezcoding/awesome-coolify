# Architecture Research

**Domain:** Multi-Instance MCP Server & Local Git-to-Cloud Manifest Sync
**Researched:** July 24, 2026
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       MCP Server Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ System  │  │ Resource│  │ App/Svc │  │Instance │  (v3.0)  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐        │
│  │Prompts  │  │Recipes  │  │DeployWch│  │  Setup  │  (v3.1)  │
│  │ (New)   │  │ (New)   │  │ (New)   │  │  Wizard │        │
│  └─────────┘  └─────────┘  └─────────┘  └────┬────┘        │
├─────────┬──────────┬────────────┬────────────┼──────────────┤
│         │          │            │            │              │
├─────────▼──────────▼────────────▼────────────▼──────────────┤
│                     Configuration & Core                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 InstanceManager (v3.0)              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                 ManifestManager (v3.0)              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                 OpenAPICoverage Tool (v3.1 New)     │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                       Data & Client Layer                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  ofetch  │  │instances │  │ manifest │  │ OpenAPI  │     │
│  │  Client  │  │  .json   │  │  .json   │  │Specs(New)│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `InstanceManager` | Manages global multi-instance configurations in `~/.coolify-mcp/instances.json`. Resolves active instance credentials dynamically. | File-backed JSON store with Zod validation, credential masking, and dynamic client configuration. |
| `ManifestManager` | Manages workspace-level project metadata in `.coolify/manifest.json`. Automatically links local git repos with remote Coolify resources. | Local workspace file-backed JSON store with auto-updating hooks on resource mutations and `.gitignore` safety guards. |
| `SetupWizard` | CLI-based installer guiding users through workspace preflights and linking repositories directly to Coolify endpoints. | Interactive command utility in `src/cli/setup-wizard.ts` using `prompts` and Node `child_process` for `gh` CLI checks. |
| `McpPrompts` | Registers LLM workflow prompt templates (`deploy`, `diagnose`, `new-project`, `incident`) on the MCP server layer. | Declared via `server.registerPrompt` inside `src/mcp/prompts.ts` using Zod arguments validation. |
| `OpenAPICoverage` | Maps the official Coolify OpenAPI specification against the implemented API client and tool endpoints. | Code parser utility in `src/cli/openapi-coverage.ts` generating `OAPI-COVERAGE.md` dynamic reporting. |
| `RecipesCatalog` | Catalogs Coolify’s 200+ native service templates and provides local fallback structures when the API catalog list is offline. | Local database index in `src/utils/service-recipes.ts` linking to `coolify-examples` Git templates. |
| `CoolifyClient` | URL-agnostic, stateless API client executing requests against self-hosted or cloud endpoints. | `ofetch.create` factory with retry/error mapping layers (existing, fully reusable). |

## Recommended Project Structure

```
src/
├── api/
│   └── client.ts             # Stateless HTTP client methods (extended for service list types)
├── cli/                      # CLI executable scripts folder
│   ├── openapi-coverage.ts   # New: OpenAPI parser & coverage mapping tool
│   └── setup-wizard.ts       # New: Interactive CLI Wizard with git/gh preflight
├── config/
│   └── env.ts                # Configuration parsing and dynamic fallback resolution
├── mcp/
│   ├── server.ts             # MCP server lifecycle; registers tools and prompt managers
│   ├── prompts.ts            # New: Registry for deploy/diagnose/incident prompts
│   └── tools/
│       ├── deployment.ts     # Extended: watch action with polling logs
│       ├── instance.ts       # Instance registry CRUD actions
│       ├── manifest.ts       # Manifest sync and diff actions
│       └── service.ts        # Extended: list-types action for 200+ recipes
└── utils/
    ├── deploy-poll.ts        # Polling utilities (enhanced to support logs streaming)
    ├── openapi-parser.ts     # New: AST parser checking API coverage
    └── service-recipes.ts    # New: Curated database of Coolify service templates & buildpacks
```

### Structure Rationale

- **`cli/`:** Segregates commands that run only in the terminal environment (Setup Wizard, OpenAPI Map generator) from the core MCP runtime process. Keeps build sizes slim and avoids loading terminal-interactive libraries inside MCP stdio pipes.
- **`mcp/prompts.ts`:** Consolidated file for protocol prompt templates, keeping `server.ts` slim and maintaining clean abstraction boundaries.
- **`utils/service-recipes.ts`:** Acts as a lightweight static metadata engine. Guarantees immediate responses for service catalog queries without executing slow external HTTP calls.

## Architectural Patterns

### Pattern 1: Dynamic Prompt Contextualization

**What:** Exposing pre-formulated system messages (prompts) through the MCP SDK. These prompts guide LLMs through structured Coolify operations (deployment, debugging) by automatically wrapping workspace facts like git status, branch details, and current workspace manifest files.

**When to use:** Whenever the AI client (e.g., Cursor, Claude Code) needs explicit workflows or multi-step advice to successfully interact with the server.

**Trade-offs:** The client must actively query the server prompts, and prompts can consume model context if templates are too verbose.

**Example:**
```typescript
// src/mcp/prompts.ts
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { ManifestManager } from '../utils/manifest.js';

export function registerCoolifyPrompts(server: McpServer): void {
  server.registerPrompt(
    'diagnose-incident',
    {
      title: 'Diagnose Incident',
      description: 'Collect logs and resource metrics to troubleshoot a failing service or database.',
      argsSchema: z.object({
        resource_uuid: z.string().optional().describe('Failing resource UUID (falls back to manifest context)'),
      }),
    },
    async ({ resource_uuid }) => {
      let uuid = resource_uuid;
      if (!uuid) {
        const manifest = ManifestManager.load();
        uuid = manifest?.resources?.[0]?.uuid;
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Diagnose the resource with UUID "${uuid || 'unknown'}". Gather logs, check system health, and evaluate failure hints.`,
            },
          },
        ],
      };
    }
  );
}
```

### Pattern 2: Progressive Stateless Polling (`watch`)

**What:** Non-blocking tool execution model where a long-running action (`deployment.watch`) monitors an ongoing operation, progressively sleeping and gathering incremented logs rather than choking the single-threaded stdio pipe.

**When to use:** Essential for asynchronous tasks like deployments, preventing the LLM from entering manual wait loops or timing out.

**Trade-offs:** Blocks the calling agent's immediate turn until the watch finishes, but ensures correct completion tracking.

**Example:**
```typescript
// src/utils/deploy-poll.ts
export async function pollDeploymentWithLogs(
  fetcher: () => Promise<Record<string, unknown>>,
  logger: (lines: string[]) => void,
  timeoutMs: number,
  intervalMs = 3000
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  let seenLinesCount = 0;

  while (true) {
    const deployment = await fetcher();
    const rawLogs = String(deployment.logs || '');
    const lines = rawLogs.split('\n').filter(Boolean);
    
    if (lines.length > seenLinesCount) {
      logger(lines.slice(seenLinesCount));
      seenLinesCount = lines.length;
    }

    if (deployment.status === 'finished' || deployment.status === 'failed') {
      return deployment;
    }

    if (Date.now() - startTime >= timeoutMs) {
      return { ...deployment, status: 'timeout' };
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
```

## Data Flow

### Request Flow

```
[User runs CLI Command (init / coverage)]
       │
       ▼
 [cli/setup-wizard.ts] ──────► [gh preflight / git remote check]
       │
       ▼
 [InstanceManager] ──────────► Save URL & Token to ~/.coolify-mcp/instances.json
       │
       ▼
 [ManifestManager] ──────────► Save initial project mapping to .coolify/manifest.json
       │
       ▼
  [IDE Skills] ──────────────► Copy .cursorrules / .claudecoderules files to local workspace
```

```
[Agent runs deployment.watch Tool]
       │
       ▼
  [McpServer Tool Handler]
       │
       ▼
[pollDeploymentWithLogs Loop] ───► Call API periodically (e.g., fetchDeployment)
       │
       ├─────────────────────────► Extract new log lines on each tick
       │
       ▼
 [Return formatted timeline] ───► Output terminal log stream back to the Agent
```

### Key Data Flows

1. **Setup Preflight & Automated Wiring:**
   - Script runs `gh auth status` and `git remote -v` to ensure the project has a valid repository.
   - Prompts for Coolify URL/Token, validating them with a quick ping via the stateless API client.
   - Pushes workspace context up to Coolify (creates/routes server, project, and environment variables).
   - Generates `.coolify/manifest.json` locally and adds `.coolify/` to the `.gitignore` automatically.

2. **OpenAPI Compliance Scans:**
   - Static analysis tool parses the `coolify_openapi.json` spec.
   - Inspects `src/api/client.ts` to build an AST of all covered REST verbs and paths.
   - Evaluates the difference, calculating coverage metrics and outputting compliance targets in `OAPI-COVERAGE.md`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Development | Simple CLI files and standard static assets. Node 22+ is more than sufficient. |
| Production CI | Coverage tools can be wired into Github Actions to block PRs if API test coverage degrades. |
| Enterprise Fleet | Curated service recipes are stored locally in the package, avoiding high-concurrency rate limiting when parsing 200+ Coolify catalog services. |

## Anti-Patterns

### Anti-Pattern 1: Blocking Single-Threaded Stdio Streams with Nested Shells
**What people do:** Spawning interactive commands or infinite shell loops directly within the MCP tool callback.
**Why it's wrong:** Cluttering stdin/stdout blocks standard communication between the server and the LLM, leading to socket hangs and crashed sessions.
**Do this instead:** Package the Setup Wizard as an independent CLI binary that users run separately in their terminal (`npx awesome-coolify-setup`), and run watch loops using controlled, asynchronous JS intervals.

### Anti-Pattern 2: Forking Outdated YAML Template Files
**What people do:** Keeping custom clones of Coolify's Docker Compose stacks locally in the package directory.
**Why it's wrong:** Coolify's templates evolve rapidly. Storing static YAML duplicates leads to broken deployments as base services change upstream.
**Do this instead:** Query Coolify's native `service.list-types` directly or reference the official `coolify-examples` repo as hint-links, rather than maintaining long-term hardcoded compose strings.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub CLI (`gh`) | Subprocess execution via `execSync` | Checked during Setup Preflight; falls back to raw Git commands if `gh` is missing. |
| npm Registry | OIDC/Trusted Publishing Github Action | Configured under `.github/workflows/publish.yml` to trigger automatically on new version releases. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Setup CLI ↔ Core Utils | Direct Imports | Setup Wizard reuses `InstanceManager` and `ManifestManager` APIs directly to avoid duplicate file-writing logic. |
| MCP Server ↔ Prompts | Programmatic Registration | Modular registration function `registerCoolifyPrompts(server)` decouples prompts from server startup wiring. |

## Suggested Build Order

```
┌────────────────────────────────────────────────────────┐
│  Phase 1: Prompts & Richer Tool Descriptions           │
│  - Define deploy, diagnose, incident templates        │
│  - Expand descriptions & fix Cursor parameter display  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 2: Recipes & list-types                         │
│  - Implement service.list-types actions                │
│  - Map 200+ native Coolify service configurations      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 3: Deploy Watch (`deployment.watch`)            │
│  - Implement log-incremental polling in deploy-poll    │
│  - Add action to src/mcp/tools/deployment.ts           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 4: Setup Wizard & CLI Engine                    │
│  - Program gh checks and wizard prompt questions       │
│  - Save local workspace manifest & auto-write gitignore │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  Phase 5: OpenAPI Coverage Mapping                     │
│  - Build script parsing json spec and matching AST     │
│  - Generate reports & integrate into CI checks         │
└────────────────────────────────────────────────────────┘
```

---
*Architecture research for: awesome-coolify v3.1 Setup, Skills & DX*
*Researched: July 24, 2026*
