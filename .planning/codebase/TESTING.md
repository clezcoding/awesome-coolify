# Testing Patterns

**Analysis Date:** 2026-07-18

## Test Framework

**Runner:**
- Vitest ^1.4.0
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect`

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run dev           # tsup watch (not test watch)
# No npm run test:watch defined — use: npx vitest
# Coverage: npx vitest run --coverage (v8 provider configured)
```

## Test File Organization

**Location:**
- Unit/co-located: `src/**/*.test.ts` beside implementation
- Integration: `tests/integration/*.test.ts`
- Fixtures: `tests/fixtures/*.ts`

**Naming:**
- `*.test.ts` suffix

**Structure:**
```
src/
  mcp/tools/application.ts
  mcp/tools/application.test.ts   # co-located unit
tests/
  fixtures/coolify-empty.ts
  integration/deploy-flow.test.ts # cross-module flows
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'vitest';
import { toolOutputSchema } from './server.js';

describe('toolOutputSchema', () => {
  it('accepts ReadResponse-shaped structuredContent with _meta', () => {
    const result = toolOutputSchema.safeParse({ ok: true, data: {}, _meta: { ... } });
    expect(result.success).toBe(true);
  });
});
```

**Patterns:**
- Setup: inline per test; no global setup file
- Teardown: none required (pure functions, mocked fetch)
- Assertion: `expect(result.success).toBe(true)` for Zod; `expect(...).toEqual(...)` for data

## Mocking

**Framework:** Vitest `vi` (where used); manual mock objects in integration tests

**Patterns:**
```typescript
// Integration tests mock Coolify API responses via fixture modules
import { coolifyEmptyFixture } from '../../tests/fixtures/coolify-empty.js';
```

**What to Mock:**
- Coolify HTTP API (`ofetch`) — use fixtures in `tests/fixtures/`
- Environment variables — set in test before importing modules under test

**What NOT to Mock:**
- Zod schemas — test real validation paths
- Projection/summary helpers — test with fixture data

## Fixtures and Factories

**Test Data:**
- `tests/fixtures/coolify-empty.ts` — empty fleet
- `tests/fixtures/coolify-malformed.ts` — bad API shapes
- `tests/fixtures/coolify-mixed-health.ts` — mixed health states

**Location:**
- `tests/fixtures/` for shared; inline objects in unit tests

## Coverage

**Requirements:** None enforced in CI

**View Coverage:**
```bash
npx vitest run --coverage
# Output: ./coverage/ (gitignored)
```

**Config:** `vitest.config.ts` — v8 provider, `text` + `json-summary` reporters

## Test Types

**Unit Tests:**
- Scope: single module — schemas, formatters, redact, projections
- Location: co-located `src/**/*.test.ts`
- Count: ~30+ files

**Integration Tests:**
- Scope: MCP tool flows end-to-end with mocked API
- Location: `tests/integration/`
- Files: `deploy-flow.test.ts`, `diagnose-flow.test.ts`, `docs-parity.test.ts`, `emergency-safety-flow.test.ts`, `install-configurator.test.ts`, `logs-service-db-flow.test.ts`, `mcp-schema-validation.test.ts`

**E2E Tests:**
- Not used in CI
- Manual/live: `scripts/test-mcp-stdio.mjs` (gitignored — uses live credentials)

## Common Patterns

**Async Testing:**
```typescript
it('polls until reachable', async () => {
  const result = await pollServerUntilReachable(mockClient, 'uuid');
  expect(result.reachable).toBe(true);
});
```

**Error Testing:**
```typescript
it('rejects invalid action', () => {
  const result = applicationActionSchema.safeParse({ action: 'invalid' });
  expect(result.success).toBe(false);
});
```

## CI Integration

**Workflow:** `/.github/workflows/ci.yml`
- Step: `npm test --if-present` on Ubuntu, Node 24
- Also: `npm run build --if-present`
- Lint step no-op until lint script added

**Public sync gate:** `scripts/sync-public-repo.sh` runs `npm test` on clean snapshot before commit

**Pre-commit hook (HEAD):** `/.husky/pre-commit` was `npm test` — deleted locally; do not rely on hooks for test gate until restored

## Repo-Quality Testing Gaps

- No hook/CI test for gitignore violations (tracked `.claude/...`)
- No automated public-repo parity test (sync script is manual)
- No changeset presence check in CI for release PRs

---

*Testing analysis: 2026-07-18*
