# Stack Research

**Domain:** MCP Server & DX Tools
**Researched:** Friday Jul 24, 2026
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@modelcontextprotocol/server` | `^2.0.0-beta.4` | MCP Server core framework | Provides the standard protocol implementation for tools, resources, and the new Prompts API. |
| `@clack/prompts` | `^0.9.1` | Interactive CLI Setup Wizard | The modern, beautifully designed terminal prompt library used by Vite and Astro. Offers superior UX over older alternatives. |
| `@scalar/openapi-parser` | `^0.25.3` | OpenAPI Specification Parsing | A modern, zero-dependency, TypeScript-native OpenAPI parser that supports OpenAPI 3.0/3.1/3.2. Perfect for mapping coverage. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ofetch` | `^1.5.1` | Dynamic recipe and template fetching | Used to fetch the official `service-templates.json` from Coolify's repository at runtime, avoiding static catalog bloat. (Already installed) |
| `@scalar/openapi-types` | `^0.6.0` | Strict OpenAPI TypeScript types | Used alongside `@scalar/openapi-parser` for type-safe manipulation of the OpenAPI document. |
| `zod` | `^4.4.3` | Schema validation & Prompt arguments | Used to define and validate action inputs, outputs, and Prompts API arguments. (Already installed) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@changesets/cli` | Versioning and release management | Automates version bumps and changelog generation. Integrated with GitHub Release workflow. (Already installed) |
| `tsup` | Zero-config TypeScript bundler | Bundles the MCP server and CLI setup wizard into clean ESM output. (Already installed) |

## Installation

```bash
# Core & Supporting
pnpm add @clack/prompts @scalar/openapi-parser @scalar/openapi-types

# Dev dependencies (if any new needed, otherwise none)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@clack/prompts` | `inquirer` / `prompts` | Use `inquirer` only if you need legacy Node support (<16) or highly customized custom-drawn terminal widgets not supported by Clack. |
| `@scalar/openapi-parser` | `@apidevtools/swagger-parser` | Use `swagger-parser` if you are working with legacy Swagger 2.0 specs that require heavy JSON Schema validation or older CommonJS environments. |
| Dynamic `ofetch` | Static YAML templates | Only use static templates if the MCP server must operate in a strictly air-gapped environment with zero outbound internet access to GitHub/CDNs. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Static YAML Service Templates | Causes rapid drift from Coolify's 200+ catalog, bloats the repository, and creates a maintenance nightmare. | Dynamic fetching of `service-templates.json` via CDN/GitHub or linking to `coolify-examples`. |
| Legacy `.cursorrules` | Deprecated by Cursor, causes conflicts with the modern multi-file `.cursor/rules/*.mdc` system. | Modern `.cursor/rules/*.mdc` files with YAML frontmatter. |
| Custom Regex OpenAPI Parsing | Highly fragile, prone to failure on complex JSON reference (`$ref`) resolutions and multi-file specs. | `@scalar/openapi-parser` for robust dereferencing. |
| `execa` | Adds unnecessary dependency weight when Node's built-in `child_process` (with `util.promisify`) is sufficient. | Built-in `child_process` for lightweight `gh` CLI preflight checks. |

## Stack Patterns by Variant

**If running the Setup Wizard CLI:**
- Use `@clack/prompts` for interactive terminal prompts.
- Use Node's built-in `child_process` to execute `gh auth status` and other preflight checks without adding external dependency weight.

**If deploying IDE Skills:**
- For **Cursor**: Create `.cursor/rules/*.mdc` files with YAML frontmatter specifying `alwaysApply`, `globs`, and `description`.
- For **Claude Code**: Create `.claude/skills/SKILL.md` files with YAML frontmatter specifying `name`, `description`, and `allowed-tools`.
- For **Codex**: Create `.codex/skills/SKILL.md` files with YAML frontmatter and an accompanying `agents/openai.yaml` for UI metadata and tool dependencies.

**If implementing `service.list-types`:**
- Use `ofetch` to dynamically fetch the official `service-templates.json` from `https://cdn.jsdelivr.net/gh/coollabsio/coolify@main/templates/service-templates.json` with a local static fallback for offline resiliency.

**If implementing `deployment.watch`:**
- Reuse the existing `pollDeploymentUntilTerminal` utility located in `src/utils/deploy-poll.ts` to poll the deployment status until terminal or timeout.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@clack/prompts@^0.9.1` | `node@>=22.14` | Requires modern Node.js environment. |
| `@scalar/openapi-parser@^0.25.3` | `@scalar/openapi-types@^0.6.0` | Strict peer dependency match for type safety. |
| `@modelcontextprotocol/server@^2.0.0-beta.4` | `@modelcontextprotocol/sdk` | Fully compatible with the standard MCP Prompts API. |

## Sources

- `/modelcontextprotocol/typescript-sdk` — MCP Prompts API and autocompletion standard.
- `https://code.claude.com/docs/en/skills` — Claude Code skills specification.
- `https://developers.openai.com/codex/skills` — Codex skills and TOML configuration specification.
- `https://cursor.com/docs/rules` — Cursor rules and `.mdc` frontmatter specification.
- `https://github.com/scalar/scalar/tree/main/packages/openapi-parser` — Scalar OpenAPI parser capabilities.

---
*Stack research for: Coolify MCP Server v3.1*
*Researched: Friday Jul 24, 2026*
