---
quick: 260727-codeql-openapi-coverage-fixes
created: 2026-07-27
---

# Quick: Fix 3 CodeQL alerts on openapi-coverage scripts

## Goal

Resolve open CodeQL alerts #4–#6 on `main` with real fixes (no suppress/ignore).

## Alerts

| # | Rule | File | Fix |
|---|------|------|-----|
| 6 | js/redos | openapi-coverage-join.mjs | Linear catalog literal parser |
| 5 | js/clear-text-logging | openapi-coverage.mjs | CoverageError + static logMessage |
| 4 | js/incomplete-sanitization | openapi-coverage-render.mjs | Escape `\` then `\|` in table cells |

## Verification

- `pnpm exec vitest run tests/openapi-coverage.test.ts`
- `pnpm run openapi:coverage -- --check`
