# Stack Research

**Domain:** Coolify MCP Server & Client (Platform Foundation)
**Researched:** Tuesday Jul 21, 2026
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | >=22.14.0 | Runtime | Standard runtime for TypeScript MCP servers; features native ES Modules support, fast filesystem APIs (`node:fs`), and native fetch/http capabilities. |
| TypeScript | ^5.3.3 | Language | Strongly typed language compiling to JavaScript, enabling type-safe development, IDE auto-completion, and static analysis. |
| @modelcontextprotocol/server | ^2.0.0-beta.4 | Core Framework | Standard library from Anthropic for building Model Context Protocol servers in TypeScript/Node.js, handling stdio communications and client-server Handlers. |
| Zod | ^4.4.3 | Schema Validation | Declarative validation library for runtime verification of environment variables, multi-instance configuration, and local manifest structures. |
| ofetch | ^1.5.1 | HTTP Client | Intelligent, lightweight, and robust fetch wrapper by UnJS, providing automatic JSON parsing, built-in retries, and clean error hooks. |
| yaml | ^2.9.0 | Yaml Parser | Parser for handling multi-line compose configurations and service blueprints cleanly without relying on regex. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | Built-in | File System Operations | For reading, writing, and checking existence of global `~/.coolify-mcp/instances.json` and local `.coolify/manifest.json`. |
| node:path | Built-in | Path Resolution | Crucial for cross-platform file paths, combining directory separators dynamically and resolving home directory paths. |
| node:os | Built-in | OS Utils | For locating the user's home directory (`os.homedir()`) to write global configurations reliably. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsup | Fast bundler | Zero-config TypeScript bundler powered by esbuild. Used to bundle the server into a single high-performance `dist/index.js` file. |
| vitest | Testing framework | A blazing fast unit and integration testing framework fully compatible with ESM and Vite out of the box. Used for running our 800+ test suites. |
| publint | Package linting | Lints npm packages to ensure ESM/CJS exports are valid and compatible. |
| husky | Git Hooks | Git hooks manager used to ensure commits and PRs adhere to standard commits syntax. |

## Installation

```bash
# Core
npm install @modelcontextprotocol/server@2.0.0-beta.4 ofetch@1.5.1 zod@4.4.3 yaml@2.9.0

# Supporting (all are Node.js built-ins)
# No additional npm packages needed for configuration or filesystem!

# Dev dependencies
npm install -D typescript@5.3.3 tsup@8.5.1 vitest@4.1.10 publint@0.3.0 husky@9.1.7
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Native `node:fs` + `Zod` | `conf` or `configstore` | Use only if you require advanced capabilities like automatic file watching, locking, or encrypted storage. For a lightweight, standard MCP server, native `fs` combined with Zod offers zero-dependency, type-safe config management. |
| Custom `parseDotEnv` | `dotenv` | Use only if you need multi-line env files or complex expansion. For this MCP server, the custom parser in `src/config/env.ts` is essential to prevent overriding host-provided environments. |
| JSON File (`instances.json`) | SQLite / Local DB | Use only if managing thousands of instances with complex relational queries. A simple JSON file is portable, text-editable, and easily inspectable by users. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `conf` / `configstore` | Adds bloated nested dependencies, can cause build issues with bundlers like `tsup`, and lacks seamless integration with Zod schemas. | Native `node:fs` with Zod-validated JSON payloads. |
| `dotenv` | Blindly overrides existing process environment variables, which breaks MCP host configurations where the host-injected environment must take precedence. | Custom dotenv parser `parseDotEnv` already in `src/config/env.ts`. |
| `fs-extra` | Deprecated and unnecessary since modern Node.js has native promised-based FS and recursive `mkdirSync` / `mkdir`. | Native `node:fs`. |

## Stack Patterns by Variant

**If using self-hosted:**
- Use arbitrary custom Coolify URL (e.g. `https://coolify.mycompany.com`).
- Enable toggling `verifySsl` to `false` in `instances.json` and client creator to support self-signed development/internal certs.

**If using Coolify Cloud:**
- Force URL to `https://app.coolify.io`.
- Enforce `verifySsl` is strictly `true` (do not allow disabling SSL validation for production cloud endpoints).
- Team-scoped tokens: Since Cloud is organized per team, ensure all multi-instance operations default to team contexts and redact authorization headers in all log outputs.

**If managing workspace-specific project context:**
- Write and load from a local `.coolify/manifest.json` file in the current working directory (`process.cwd()`).
- The directory `.coolify/` and `.coolify/manifest.json` must be added to `.gitignore` to prevent committing developer-specific state or credentials.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| awesome-coolify-mcp@0.1.2 | Node >=22.14.0 | Relies on modern Node.js ES Modules features and built-in Fetch. |
| awesome-coolify-mcp@0.1.2 | Zod@^4.4.3 | Uses Zod's robust parsing and custom `superRefine` for XOR operations (e.g., in logs, applications). |
| awesome-coolify-mcp@0.1.2 | ofetch@^1.5.1 | Integrates with UnJS fetch client for intelligent error mapping and automatic retries. |

## Sources

- `/unjs/ofetch` — Resolved via Context7. Verified ofetch client creation and retry config.
- `https://app.coolify.io/api/v1` — Verified official Coolify Cloud API base URL, Bearer auth, and parity with self-hosted API endpoints.
- `https://github.com/coollabsio/coolify` — Coolify open-source repository and OpenAPI specifications.
- `MEDIUM` Confidence level — Cross-referenced and verified against live Coolify 4.1.x instances and codebase patterns.

---
*Stack research for: Coolify MCP Platform Foundation (v3.0)*
*Researched: Tuesday Jul 21, 2026*
