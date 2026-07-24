---
status: testing
phase: 19-dx-schemas-mcp-prompts
source: [19-VERIFICATION.md]
started: 2026-07-24T02:11:40Z
updated: 2026-07-24T02:11:40Z
---

## Current Test

number: 1
name: Cursor Visual Parameter Panel Rendering
expected: |
  Each tool shows its flat z.object fields (action, uuid, etc.) as visible, fillable parameters; application/service/database envs:delete advertises env_uuid; application envs:bulk-update advertises entries
awaiting: user response

## Tests

### 1. Cursor Visual Parameter Panel Rendering
expected: Open Cursor → MCP settings → awesome-coolify-mcp → inspect each of the 16 registered tools. Parameter panel must render top-level fields (no empty `properties: {}` UI). Env-mutation catalog text must advertise `env_uuid` (not `key`) for envs:delete and `entries` (not `envs`) for envs:bulk-update.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
