<!-- gsd-project-start source:PROJECT.md -->

## Project

**Coolify MCP Server**

Ein Open-Source MCP-Server für self-hosted Coolify-Instanzen (API 4.1.x), der Coolify CLI, user-coolify MCP und coolify-backup-mcp langfristig vollständig ersetzt. Zielgruppe ist die Community — jeder mit eigener Coolify-Installation. v1 liefert Ops-fähige Tools (Deploy, Logs, Diagnose, Multi-Instance); Create/Delete und volle Feature-Parität folgen in v2.

**Core Value:** Ein AI-Agent (Cursor, Claude, etc.) kann über einen einzigen, gut dokumentierten MCP-Server mehrere self-hosted Coolify-Instanzen verwalten — deployen, Logs lesen und Probleme diagnostizieren — ohne Workarounds oder drei parallele MCP-Implementierungen.

### Constraints

- **API**: Coolify REST API 4.1.x — keine Abhängigkeit von Cloud-only Features
- **Tech**: TypeScript + `@modelcontextprotocol/sdk`
- **Security**: API-Tokens in Config-Datei, nie in Tool-Responses; Credentials maskieren
- **v1 Scope**: Ops-only — Agent kann deployen, logs lesen, diagnose ohne Create/Delete
- **Distribution**: npm (`npx coolify-mcp`) + dediziertes GitHub-Repo mit ausführlicher README
- **Documentation**: v2-Features müssen in REQUIREMENTS.md und ROADMAP.md vollständig und detailliert vermerkt sein

<!-- gsd-project-end -->

<!-- gsd-stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@modelcontextprotocol/server` | v2.x | MCP Server Protocol Implementation | The 2026 v2 standard for MCP. Provides the high-level `McpServer` class and `serveStdio` runner. Much better DX than the legacy v1 `@modelcontextprotocol/sdk`. |
| `zod` | v3.x / v4.x | Schema Validation | Native integration with `McpServer.registerTool`. Enforces strict type safety for agent tool inputs and automatically converts to JSON Schema for the client. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ofetch` | v1.x | REST API Client | Wraps Coolify 4.1.x API. Provides auto-JSON parsing, error normalization, and easy retry logic without the heavy bundle size of Axios. |
| Node.js native `fs/promises` & `os` | Node 20+ | Multi-instance config | Managing `~/.coolify-mcp/instances.json`. Standard, zero-dependency, secure. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsup` | TypeScript Bundler | Zero-config build tool. Compiles the MCP server into a single minified `dist/index.js`. Fast execution is critical for `stdio` MCP server boot times. |
| `typescript` | Static Typing | Essential for managing the large REST payload types from Coolify. |

## Installation

# Core & Supporting

# Dev dependencies

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@modelcontextprotocol/server` | `@modelcontextprotocol/sdk` (v1) | When interacting with legacy MCP clients that do not yet support the 2026-07-28 protocol spec. |
| `ofetch` | `axios` | If the REST API wrapper requires complex request/response interceptors or legacy XMLHttpRequest fallbacks (not needed for Coolify). |
| `ofetch` | Native `fetch` | If absolute zero-dependency is required. `ofetch` is preferred here for auto-retries and better error handling. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Express / Hono | This is a CLI-distributed MCP server (`stdio` transport). An HTTP transport layer is unnecessary overhead for a local IDE/Agent plugin. | `@modelcontextprotocol/server/stdio` |
| Legacy low-level `Server` class | Requires manual capability negotiation, request routing, and JSON schema conversion. Error prone. | High-level `McpServer` class |

## Stack Patterns by Variant

- Use `tsup` with `format: ["cjs"]` and `minify: true`.
- Because fast startup is required when Claude/Cursor spawns the `stdio` subprocess.
- Use `zod` with `.default(false)` or `.describe("...")` explicitly asking the agent to pass confirmation.
- Because `McpServer` will reflect this requirement perfectly to the LLM context.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@modelcontextprotocol/server` v2.x | `zod` v3.x or v4.x | Ensure `zod` types align with the specific MCP server input schemas. |
| Node.js | v20.x+ | Required for native fetch (used under the hood by `ofetch`) and recent MCP SDK improvements. |

## Sources

- /modelcontextprotocol/typescript-sdk — Context7 library (v2 beta, 2026-07-28 spec).
- Official docs URL (https://ts.sdk.modelcontextprotocol.io/v2/) — Verified new `McpServer` and `serveStdio` syntax.
- https://www.ayautomate.com/blog/mcp-server-development-guide — Verified 2026 industry defaults for MCP stdio distributions.

<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- gsd-architecture-end -->

<!-- gsd-skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| cavecrew | > Decision guide for delegating to caveman-style subagents. Tells the main thread WHEN to spawn `cavecrew-investigator` (locate code), `cavecrew-builder` (1-2 file edit), or `cavecrew-reviewer` (diff review) instead of doing the work inline or using vanilla `Explore`. Subagent output is caveman-compressed so the tool-result injected back into main context is ~60% smaller — main context lasts longer across long sessions. Trigger: "delegate to subagent", "use cavecrew", "spawn investigator/builder/reviewer", "save context", "compressed agent output". | `.agents/skills/cavecrew/SKILL.md` |
| caveman | > Ultra-compressed communication mode. Cuts output tokens 65% (measured) by speaking like caveman while keeping full technical accuracy. Supports intensity levels: lite, full (default), ultra, wenyan-lite, wenyan-full, wenyan-ultra. Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested. | `.agents/skills/caveman/SKILL.md` |
| caveman-commit | > Ultra-compressed commit message generator. Cuts noise from commit messages while preserving intent and reasoning. Conventional Commits format. Subject ≤50 chars, body only when "why" isn't obvious. Use when user says "write a commit", "commit message", "generate commit", "/commit", or invokes /caveman-commit. Auto-triggers when staging changes. | `.agents/skills/caveman-commit/SKILL.md` |
| caveman-compress | > Compress natural language memory files (CLAUDE.md, todos, preferences) into caveman format to save input tokens. Preserves all technical substance, code, URLs, and structure. Compressed version overwrites the original file. Human-readable backup saved as FILE.original.md. Trigger: /caveman-compress FILEPATH or "compress memory file" | `.agents/skills/caveman-compress/SKILL.md` |
| caveman-help | > Quick-reference card for all caveman modes, skills, and commands. One-shot display, not a persistent mode. Trigger: /caveman-help, "caveman help", "what caveman commands", "how do I use caveman". | `.agents/skills/caveman-help/SKILL.md` |
| caveman-review | > Ultra-compressed code review comments. Cuts noise from PR feedback while preserving the actionable signal. Each comment is one line: location, problem, fix. Use when user says "review this PR", "code review", "review the diff", "/review", or invokes /caveman-review. Auto-triggers when reviewing pull requests. | `.agents/skills/caveman-review/SKILL.md` |
| caveman-stats | > Show real token usage and estimated savings for the current session. Reads directly from the Claude Code session log — no AI estimation. Triggers on /caveman-stats. Output is injected by the mode-tracker hook; the model itself does not compute the numbers. | `.agents/skills/caveman-stats/SKILL.md` |
<!-- gsd-skills-end -->

<!-- gsd-workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->

<!-- gsd-profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
