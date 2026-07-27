---
quick: 260727-codeql-openapi-coverage-fixes
status: complete
completed: 2026-07-27
---

# Quick Summary: CodeQL openapi-coverage fixes

Fixed GitHub Code scanning alerts #4–#6 on Phase 23 maintainer scripts:

1. **js/redos** — `extractActionsCatalogLiteral()` linear parser replaces nested-quantifier regex on `*ActionsCatalog` concatenations.
2. **js/clear-text-logging** — `CoverageError` carries static `logMessage`; CLI `reportCliFailure()` never logs tainted `error.message`.
3. **js/incomplete-sanitization** — `escapeMarkdownTableCell()` escapes `\` before `|` on all dynamic table columns.

Verification: 8/8 openapi-coverage tests green; `pnpm run openapi:coverage -- --check` exit 0.
