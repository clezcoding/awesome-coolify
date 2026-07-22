# Model Slugs (Cursor + GSD)

**Research agents:** `gemini-3.5-flash` — valid Cursor Task subagent slug (verified 2026-07-12).

| Slug | Cursor Task | GSD `model_overrides` | Notes |
|------|-------------|----------------------|-------|
| `gemini-3.5-flash` | ✓ | ✓ | Use for research subagents |
| `gemini-3-flash` | ✓ | — | GSD catalog internal name (same tier) |
| `gemini-3.5-flash-preview` | ✗ | ✗ | Invalid — do not use |
| `gemini-3.1-pro` | ✓ | fallback | Heavier research if needed |
| `composer-2.5-fast` | ✓ | ✓ | Planning, roadmap, execution |
| `claude-sonnet-5-thinking-high` | ✓ | ✓ | Complex debug only |

Configured in `.planning/config.json` → `model_overrides`.

If Task spawn fails with "Invalid model selection", re-check this table — Cursor allowlist changes over time.
