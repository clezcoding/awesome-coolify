# Coding Conventions

**Analysis Date:** 2026-07-18

## Repository Model

**Dual-repo layout:**
- **Private dev repo** (`awesome-coolify` local checkout) — full GSD workflow, dev scripts, planning artifacts
- **Public repo** (`clezcoding/awesome-coolify-mcp`) — npm package + GitHub Pages; synced via `scripts/sync-public-repo.sh`

Keep prod-relevant changes in paths listed in `scripts/sync-public-repo.sh` `INCLUDE` array. Dev-only work stays under `.planning/`, `.cursor/`, `.agents/`, `graphify-out/`, `mcp_features.md`.

## Naming Patterns

**Files:**
- Source: `kebab-case.ts` in domain folders (`src/mcp/tools/application.ts`)
- Tests: co-located `*.test.ts` beside source; integration tests in `tests/integration/*.test.ts`
- Scripts: `kebab-case.mjs` or `kebab-case.sh` under `scripts/`

**Functions:**
- camelCase handlers: `handleApplicationAction()`, `createCoolifyClient()`
- Action parsers: `parseProjectAction()`, `resolveEnvironmentUuid()`

**Types:**
- PascalCase for schemas/types; Zod exports suffixed `Schema` (`applicationActionSchema`)

## Code Style

**Formatting:**
- No Prettier/ESLint config detected — TypeScript compiler is sole static checker
- `"strict": true` in `tsconfig.json`

**Linting:**
- **Gap:** No lint tooling; do not reference `npm run lint` until added
- CI uses `npm run lint --if-present` (currently no-op)

## Import Organization

**Order:**
1. Vitest/node built-ins (`vitest`, `node:fs`)
2. Relative imports with `.js` extension (ESM): `'./tools/meta.js'`

**Path Aliases:**
- None — use relative imports from module root

## Error Handling

**Patterns:**
- MCP tools return structured envelopes via `wrapMcpError()` / `buildReadResponse()` in `src/utils/errors.ts`, `src/utils/projections.ts`
- API client throws; tool layer catches and wraps

## Logging

**Framework:** Custom logger in `src/utils/logger.ts`

**Patterns:**
- Use `createLogger()` with level from env; redact secrets via `src/utils/redact.ts`

## Comments

**When to Comment:**
- Minimal — code is action-schema driven
- Phase/summary docs live in `.planning/` (gitignored), not inline

**JSDoc/TSDoc:**
- Sparse; prefer Zod schema descriptions for MCP tool contracts

## Git & Commit Conventions

**Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>(<optional scope>): <short description>
```

Types used in repo history: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`

**Enforcement:**
- `commitlint.config.js` extends `@commitlint/config-conventional`
- `/.husky/commit-msg` runs `npx --no -- commitlint --edit "$1"`

**Branches:**
- `main` protected (when `scripts/setup-branch-protection.sh` succeeds)
- Feature branches: `feat/`, `fix/`, `chore/` per `CONTRIBUTING.md`

**Hooks (current state):**
- Husky via `"prepare": "husky"` in `package.json`
- commit-msg: commitlint ✓
- pre-commit: was `npm test` in HEAD; **deleted in working tree** — restore lightweight check before relying on hooks

**gsd-core divergence:** gsd uses `.githooks/` + `git config core.hooksPath .githooks` with targeted pre-commit checks, not full test suite.

## Release Conventions

**Versioning:** Changesets (`npx changeset` → PR → merge → `release.yml` → `publish.yml`)

**Fix before first release:** `/.changeset/config.json` `"access"` must be `"public"` (currently `"restricted"`)

## Pull Request Conventions

- Use `/.github/PULL_REQUEST_TEMPLATE.md`
- Release-relevant changes: add changeset file under `/.changeset/`
- Link issue in PR body (`Closes #`)

## Module Design

**Exports:**
- Package entry: `src/index.ts` → `dist/index.js` via tsup
- MCP server: `src/mcp/server.ts`
- Tools: one file per domain under `src/mcp/tools/`

**Barrel Files:**
- Not used — direct imports preferred

## Where Local Artifacts Go

| Artifact | Location | Git |
|----------|----------|-----|
| GSD planning | `.planning/` | ignored |
| Cursor rules/skills | `.cursor/`, `.agents/` | ignored |
| Graph analysis | `graphify-out/` | ignored |
| Env secrets | `.env` | ignored |
| Env template | `.env.example` | **should be tracked** (currently not) |
| Dev feature notes | `mcp_features.md` | tracked (dev repo only) |

---

*Convention analysis: 2026-07-18*
