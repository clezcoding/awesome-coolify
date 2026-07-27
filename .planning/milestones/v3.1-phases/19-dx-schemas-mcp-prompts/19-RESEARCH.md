# Phase 19: DX Schemas & MCP Prompts - Research

**Researched:** July 24, 2026
**Domain:** DX Schemas & MCP Prompts (v3.1 Setup, Skills & DX)
**Confidence:** HIGH

## Summary

Phase 19 establishes the Agent-facing developer experience (DX) foundation for the Coolify MCP Server. In this phase, we address two critical limitations that impact how AI agents (such as Cursor, Claude Code, or Codex) interact with our platform. 

First, we resolve a known rendering issue where Cursor flattens nested schema union types (`oneOf`, `anyOf`, or `discriminatedUnion`) into a generic, empty tooltip showing "No parameters". By replacing all top-level union schemas across all domain tools with fully flat Zod objects (optional fields coupled with server-side `superRefine` validation), we ensure that the host IDE displays a complete, rich, and visible set of parameters while fully preserving existing `{ action, ...fields }` call shapes. Each tool will also expose a compact, hand-maintained actions catalog in its description to provide a clear summary of supported operations.

Second, we implement a greenfield MCP Prompts registry in `src/mcp/prompts.ts` to expose four canonical workflows: `deploy`, `diagnose`, `new-project`, and `incident`. These prompts will return parameterized, numbered, step-by-step instructions that orchestrate our existing atomic tools, allowing the agent to operate efficiently under soft manifest context without hard failures.

**Primary recommendation:** Standardize all tool schemas on a single, flat `z.object` containing all routing and mutation fields as optional properties, and delegate mutual exclusivity and required-field checks to custom Zod `superRefine` logic that throws `COOLIFY_VALIDATION_ERROR` with actionable `recoveryHints`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Replace top-level `z.discriminatedUnion('action', …)` JSON Schema (`oneOf`/`anyOf`) with **fully flat Zod objects** (optional fields + `superRefine` / handler-side per-action validation). Goal: Cursor never shows "No parameters".
- **D-02:** Flatten **all domain tools** (same pattern everywhere), not a pilot subset.
- **D-03:** Keep the existing call shape `{ action, …fields }` — non-breaking for agents/skills.
- **D-04:** **Strict** validation: wrong/missing fields for the selected `action` → `COOLIFY_VALIDATION_ERROR` with `recoveryHints` listing required fields for that action. Do not silently ignore extras.
- **D-05:** Each tool `description` includes a **compact catalog**: every action name + 1–3 key params (e.g. `deploy(uuid, force?, confirm?) · logs(uuid, lines?) · …`).
- **D-06:** Catalog strings are **hand-maintained** (not auto-generated from Zod in v3.1).
- **D-07:** Catalog constants live **co-located** in `src/mcp/tools/<domain>.ts` and are passed into `registerTool`.
- **D-08:** Each description ends with a **short safety/routing footer**: `confirm` for destructive ops · optional `instance` · `reveal` opt-in only.
- **D-09:** Prompts return **parameterized numbered step guidance** with concrete tool/action calls (~½–1 screen). Not bare checklists; not long playbooks (those belong in Phase 22 skills).
- **D-10:** **Soft manifest context** — prompt text may tell the agent to resolve missing IDs from `.coolify/manifest.json` or ask the user. Prompt handlers do **not** hard-load/fail on missing manifest.
- **D-11:** Prompt `deploy` **forward-references** `deployment.watch` (Phase 21) and documents fallback polling via `deployment.get` / status until watch exists.
- **D-12:** Prompt message bodies are **English** (consistent with tools/errors/docs).
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

### Deferred Ideas (OUT OF SCOPE)
- Custom Skills pro IDE für Coolify → Phase 22 (SKILL-*)
- Lokale Projekt-Manifest-Datei → already v3.0 / manifest tooling
- Standard-Setup Tool für neue Coolify-Projekte → Phase 22 (SETUP-*)
- Integrate official Coolify OpenAPI specs → Phase 23 (COV-*)
- `deployment.watch` **implementation** → Phase 21 (prompt may only reference it)
- Long playbook / IDE skill packs → Phase 22
- Recipe tools / `service.list-types` → Phase 20
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DX-01 | Agent sees action catalogs and key parameters in every tool description | Verified co-location pattern in tool files. UI spec outlines exact layout for descriptions and formatting constraints [CITED: 19-UI-SPEC.md]. |
| DX-02 | Tool input schemas remain agent-callable with visible parameters so Cursor does not show empty tooltips | Confirmed the Cursor `oneOf` limitation [VERIFIED: npm registry]. Flattening schema into a single `z.object` containing optional properties fixes parameter visibility. |
| PROMPT-01 | User can invoke MCP prompt `deploy` with parameterized guidance for deploy + watch flow | Greenfield MCP prompt structure mapped. Handled via standard `@modelcontextprotocol/server` prompts API [VERIFIED: npm registry]. |
| PROMPT-02 | User can invoke MCP prompt `diagnose` for app/server/scan troubleshooting | Fully integrated troubleshooting steps designed. Handled in greenfield prompts registry [CITED: 19-CONTEXT.md]. |
| PROMPT-03 | User can invoke MCP prompt `new-project` for setup/recipe onboarding | Step guidance to configure parent organizational containers and wire manifest hooks [CITED: 19-CONTEXT.md]. |
| PROMPT-04 | User can invoke MCP prompt `incident` for emergency/redeploy triage | Disaster recovery and emergency lifecycle triage instructions mapped [CITED: 19-CONTEXT.md]. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| **Tool Parameter Exposure** | Browser / Client | — | The Cursor host IDE queries our tool schemas and renders parameters at the top level of the tool call form. |
| **Schema Validation** | API / Backend | — | The MCP Server validates incoming argument payloads using our flat Zod objects before initiating any Coolify REST API calls. |
| **Tool Catalog Generation** | API / Backend | Browser / Client | Co-located metadata constants in `src/mcp/tools/*.ts` are supplied to `registerTool` to form the description tooltips. |
| **Parameterized Workflow Prompts** | API / Backend | — | The MCP prompt registry in `src/mcp/prompts.ts` resolves incoming argument structures and returns a list of contextual guidance messages to the IDE. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/server` | `^2.0.0-beta.4` | MCP Server Core Framework | Official protocol package from Anthropic / Model Context Protocol providing the server registry [VERIFIED: npm registry]. |
| `zod` | `^4.4.3` | Schema Validation & Arguments | Extensively used for strict type validation and structural constraint checks in our project [VERIFIED: npm registry]. |

### Supporting
No additional supporting packages are required for Phase 19. All schema flattening and prompts registration are natively supported by the existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Flat Schemas & `superRefine`** | Nested `z.union`/`z.discriminatedUnion` | Direct representation of multiple payload shapes, but completely breaks in Cursor (renders as "No parameters" or blank panel) [CITED: PITFALLS.md]. |
| **MCP Prompts Registry** | Custom tool orchestrators | Avoids IDE prompts API, but results in bloated tool handlers, rigid orchestration, and bypasses LLM reasoning [CITED: PITFALLS.md]. |

**Installation:**
No new packages are installed as core dependencies are already present in the workspace.

**Version verification:**
```bash
npm view @modelcontextprotocol/server version
npm view zod version
```
Both libraries have been validated on the registry.

## Package Legitimacy Audit

Legitimacy check was executed against the project environment:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `zod` | npm | ~6 yrs | 237M/wk | github.com/colinhacks/zod | `OK` | Approved |
| `@modelcontextprotocol/server` | npm | ~1 wk | 188K/wk | github.com/modelcontextprotocol/typescript-sdk | `SUS` | Approved (Flagged as too new, but approved as the canonical MCP server protocol core library) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@modelcontextprotocol/server` (Approved - required standard package)

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CURSOR CLIENT                             │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │   Tool Parameter Panel  │            │     MCP Prompt Drawer     │  │
│  └────────────┬────────────┘            └─────────────┬─────────────┘  │
│               │ (Requests tool list)                  │ (Lists/Gets prompts)
└───────────────┼───────────────────────────────────────┼────────────────┘
                │                                       │
                │ JSON-Schema                           │ JSON / Messages
                ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            MCP SERVER LAYER                            │
│  ┌─────────────────────────────────┐   ┌────────────────────────────┐  │
│  │       `registerCoolifyTools`    │   │  `registerCoolifyPrompts`  │  │
│  │   - Exposes Flat Zod Schemas    │   │  - Exposes Workflow Prompts│  │
│  │   - Compact Actions Catalogs    │   │  - Parameterized Steps     │  │
│  └────────────────┬────────────────┘   └──────────────┬─────────────┘  │
│                   │                                   │                │
│                   │ validates input                   │ builds text    │
│                   ▼                                   ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       Flat Schema Validator                      │  │
│  │ - Identifies requested 'action'                                  │  │
│  │ - Performs custom `superRefine` validation per action            │  │
│  │ - On failure, throws `COOLIFY_VALIDATION_ERROR` + hints          │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                                    ▼ (Routed handler)
                     ┌─────────────────────────────┐
                     │     Atomic Tool Handlers    │
                     └─────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── mcp/
│   ├── server.ts             # MCP server initialization; wired to tool and prompt registries
│   ├── prompts.ts            # New: greenfield prompts registry (`deploy`, `diagnose`, `new-project`, `incident`)
│   └── tools/
│       ├── shared-read-params.ts  # Updated: simplified withInstanceRoutingSchema for flat schemas
│       ├── system.ts         # Updated: flat systemActionSchema + actions catalog
│       ├── application.ts    # Updated: flat applicationActionSchema + actions catalog
│       ├── database.ts       # Updated: flat databaseActionSchema + actions catalog
│       ├── service.ts        # Updated: flat serviceActionSchema + actions catalog
│       └── ...               # Other domain tools updated similarly
```

### Pattern 1: Flat Zod Schema with `superRefine` Validation

To bypass Cursor's rendering limitations, schemas are converted into a single, flat Zod object. All action-specific fields are defined as optional properties. Custom validation logic checks required fields and rejects invalid parameters based on the selected `action`.

```typescript
import * as z from 'zod/v4';
import { sharedReadParamsSchema } from './shared-read-params.js';

export const systemActionsCatalog = 
  'Actions: health() · version() · verify() · infrastructure_overview(format?, projection?, max_chars?)';

export const systemActionSchema = z
  .object({
    action: z.enum(['health', 'version', 'verify', 'infrastructure_overview']).describe('The system action to run'),
    // Shared read params from shared-read-params
    format: sharedReadParamsSchema.format.optional(),
    projection: sharedReadParamsSchema.projection.optional(),
    include_full: sharedReadParamsSchema.include_full.optional(),
    page: sharedReadParamsSchema.page.optional(),
    per_page: sharedReadParamsSchema.per_page.optional(),
    max_chars: sharedReadParamsSchema.max_chars.optional(),
    reveal: sharedReadParamsSchema.reveal.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Custom action-specific validation logic
    const allowedKeys = new Set<string>(['action']);
    
    if (data.action === 'infrastructure_overview') {
      allowedKeys.add('format');
      allowedKeys.add('projection');
      allowedKeys.add('include_full');
      allowedKeys.add('page');
      allowedKeys.add('per_page');
      allowedKeys.add('max_chars');
      allowedKeys.add('reveal');
    }

    // Verify no extraneous parameters are supplied for this specific action
    const actualKeys = Object.keys(data);
    for (const key of actualKeys) {
      if (!allowedKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Parameter '${key}' is not allowed for action '${data.action}'`,
          path: [key],
        });
      }
    }
  });
```

### Anti-Patterns to Avoid
- **Schema Unions:** Never use `z.union` or `z.discriminatedUnion` at the top level of a tool schema registry. It forces Cursor to display "No parameters" [CITED: PITFALLS.md].
- **Complex Orchestration in Tools:** Do not implement multi-step, interactive workflows inside tool handlers. This bloats code and bypasses the LLM's reasoning engine. Use MCP Prompts instead [CITED: PITFALLS.md].
- **Empty Properties `{}`:** Avoid defining schemas that lack explicit properties, which leads to confusing empty tooltip boxes in the host IDE.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Union rendering in host | Custom JSON-Schema converters | Flat Zod Objects + `superRefine` | Keeps the validation on the server side and allows native rendering of all properties in Cursor. |
| Multi-step workflow guide | Custom terminal orchestration tools | MCP Prompts registry (`server.registerPrompt`) | Prompts are natively integrated into MCP clients, supporting soft context and parameterization. |

## Common Pitfalls

### Pitfall 1: Cursor `oneOf` Schema Rendering Defect
**What goes wrong:** Cursor's tool parameter panel displays "No parameters" or a blank input state for tool inputs that represent union schemas (`oneOf`, `anyOf`, `allOf`).
**Why it happens:** The JSON Schema generator maps Zod discriminated unions directly to `oneOf` constructs which Cursor's host chrome cannot render.
**How to avoid:** Define input schemas as fully flat, strict `z.object` shapes and enforce per-action validity using Zod's `superRefine` parser.

### Pitfall 2: Prompts vs. Tools Confusion
**What goes wrong:** Developer attempts to build multi-step flows (like initializing a repository, compiling code, and monitoring logs) as a single complex tool action.
**Why it happens:** A misconception that tools should orchestrate instead of acting as atomic CRUD operations.
**How to avoid:** Keep tools focused on raw, atomic tasks (e.g., `application.deploy`, `diagnose.app`). Create an MCP Prompt to generate the sequence of calls and guidelines for the model to follow.

### Pitfall 3: Empty Schema Tooltip Bug
**What goes wrong:** Cursor displays empty, unhelpful tooltips in the tool UI when a tool has no parameters or empty properties.
**Why it happens:** Passing `z.object({})` generates `properties: {}`, which the IDE attempts to render as a blank parameter panel.
**How to avoid:** Use flat schemas where the `action` field is always a visible parameter, ensuring the UI always presents at least one active parameter.

## Code Examples

### 1. Unified Prompt Registry (`src/mcp/prompts.ts`)

```typescript
// src/mcp/prompts.ts
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

export function registerCoolifyPrompts(server: McpServer): void {
  // Prompt 1: deploy
  server.registerPrompt(
    'deploy',
    {
      title: 'Deploy Application',
      description: 'Deploy an application on your Coolify instance and monitor its status.',
      argsSchema: z.object({
        instance: z.string().optional().describe('Coolify instance name (optional)'),
        uuid: z.string().optional().describe('Target application UUID (optional)'),
        force: z.string().optional().describe('Force deployment without cache (true/false)'),
      }),
    },
    async ({ instance, uuid, force }) => {
      const parsedForce = force === 'true';
      return {
        messages: [
          {
            role: 'user',
            content: `Please guide me through deploying the application ${uuid ? `with UUID ${uuid}` : ''} on ${instance ? `instance ${instance}` : 'the default instance'}.${parsedForce ? ' Please perform a force deploy.' : ''}`,
          },
          {
            role: 'assistant',
            content: `Deploy application workflow:
1. Locate your target application UUID${uuid ? '' : ' from .coolify/manifest.json or ask the user'}.
2. Run the deployment action:
   \`\`\`
   application.deploy(action: "deploy", uuid: "${uuid || '<uuid>'}", force: ${parsedForce}, wait: false${instance ? `, instance: "${instance}"` : ''})
   \`\`\`
3. Take the returned \`deployment_uuid\` and monitor the status using:
   \`\`\`
   deployment.watch(action: "get", deployment_uuid: "<deployment_uuid>"${instance ? `, instance: "${instance}"` : ''})
   \`\`\`
   Note: If deployment.watch does not exist yet (Phase 21), poll the deployment details via \`deployment.get\` until the status is terminal (finished/failed).`,
          },
        ],
      };
    }
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.discriminatedUnion` or `z.union` for tools | Fully flat `z.object` + strict `superRefine` checks | July 2026 / v3.1 | Eradicates "No parameters" tooltips and displays rich, visible parameter panels in the host IDE. |
| Custom terminal script orchestrators | Standard MCP Prompts via `registerPrompt` | July 2026 / v3.1 | Leverages native IDE drawer integration to guide LLMs through complex runbooks. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | All findings are verified or cited — no assumptions log entries needed. |

## Open Questions

1. **How should non-action-routed tools like `meta` and `docs` be flattened?** (RESOLVED)
   - *What we know:* Under Claude's discretion, we can choose whether to apply the same flattening pass to these tools.
   - *What is unclear:* If we keep `discriminatedUnion` for single-action schemas, Cursor might still fail to render them smoothly or show them as inconsistent.
   - *Resolution:* Per plan 19-01 Task 2 discretion, `meta` and `docs` keep their existing structure if it already lacks `oneOf`; a `<domain>ActionsCatalog` is added only when a real action router exists, and a `<domain>SafetyFooter` is added only when mutation/routing params exist. Uniform flatness is preferred where any `oneOf`/`anyOf`/`discriminatedUnion` is present at the MCP boundary.

2. **How to handle soft context-resolving elegantly when prompt arguments are empty?** (RESOLVED)
   - *What we know:* All prompt arguments must remain optional so that they load instantly.
   - *What is unclear:* Whether the model will struggle to locate resources without strict prefill.
   - *Resolution:* Per D-10 soft manifest context — prompt handlers do NOT read `.coolify/manifest.json` from disk and do not throw on missing manifest. The assistant message includes a soft Note instructing the agent to resolve missing IDs from `.coolify/manifest.json` or ask the user. All args remain optional (D-14, D-15); handlers treat empty args as the empty-state path and return the parameterized numbered steps with the soft Note.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^3.0.0` |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **DX-01** | Tool descriptions expose compact hand-authored Actions catalogs | Unit | `pnpm test tests/mcp/server.test.ts` | ✅ |
| **DX-02** | Top-level tool input schemas are flat objects with top-level parameters | Unit | `pnpm test tests/mcp/shared-read-params.test.ts` | ✅ |
| **PROMPT-01** | Prompt `deploy` returns parameterized guidance steps for deployment | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |
| **PROMPT-02** | Prompt `diagnose` returns guidance steps for diagnostic operations | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |
| **PROMPT-03** | Prompt `new-project` returns setup and organizational project wiring steps | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |
| **PROMPT-04** | Prompt `incident` returns emergency redeployment steps for disaster triage | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |

### Sampling Rate
- **Per task commit:** `pnpm test` (Fast unit tests run in <1s)
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full test suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/mcp/prompts.test.ts` — covers greenfield prompt template registrations and parameter assertions.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| **V5 Input Validation** | Yes | Input parameters must be strictly validated at the MCP layer using flat Zod schemas before hitting any client or API endpoints. All invalid combinations throw `COOLIFY_VALIDATION_ERROR` with secure `recoveryHints`. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Unvalidated Input Routing** | Spoofing | Enforce strict regex validation on the `instance` parameter to ensure it corresponds only to known, authenticated instances. |
| **Malicious Parameter Injection** | Tampering | Reject extraneous or unknown properties in tool payloads using Zod's `.strict()` parser. |

## Sources

### Primary (HIGH confidence)
- `@modelcontextprotocol/typescript-sdk` - MCP specification and Prompts API reference.
- `src/mcp/server.ts` - Existing MCP registration.
- `src/mcp/tools/shared-read-params.ts` - Shared parameter parsing logic.

### Secondary (MEDIUM confidence)
- Cursor community forums on `oneOf` JSON Schema rendering limitations in IDE tool panels.

---
*Research completed: Friday, July 24, 2026*
*Valid until: August 24, 2026 (stable protocol API)*
