---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 3
total_count: 4
last_updated: 2026-07-31T02:18:34.356Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 28 | stub | src/mcp/tools/intelligence.ts |  | scorecard/impact/janitor/cleanup throw COOLIFY_NOT_IMPLEMENTED pending 28-02..28-04 | fixed |  | 2026-07-30T01:48:17.514Z | 2026-07-30T02:12:16.212Z |
| 2 | 28 | deviation | src/mcp/tools/intelligence.ts |  | Combined Task1+2 commit due to husky related-test gate; bracket severity reads | fixed |  | 2026-07-30T01:58:59.837Z | 2026-07-30T02:12:28.123Z |
| 3 | 28 | stub | src/mcp/tools/intelligence.ts | 827 | cleanup action COOLIFY_NOT_IMPLEMENTED until Plan 28-04 | fixed |  | 2026-07-30T02:05:59.579Z | 2026-07-30T02:12:16.294Z |
| 4 | 31 | stub | src/utils/log-patterns.ts | 23 | matchLogPatterns Wave 0 shell returns [] until 31-01 GREEN | open |  | 2026-07-31T02:18:34.356Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "28",
    "file": "src/mcp/tools/intelligence.ts",
    "line": null,
    "description": "scorecard/impact/janitor/cleanup throw COOLIFY_NOT_IMPLEMENTED pending 28-02..28-04",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-07-30T01:48:17.514Z",
    "resolved_at": "2026-07-30T02:12:16.212Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "28",
    "file": "src/mcp/tools/intelligence.ts",
    "line": null,
    "description": "Combined Task1+2 commit due to husky related-test gate; bracket severity reads",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-07-30T01:58:59.837Z",
    "resolved_at": "2026-07-30T02:12:28.123Z"
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "28",
    "file": "src/mcp/tools/intelligence.ts",
    "line": 827,
    "description": "cleanup action COOLIFY_NOT_IMPLEMENTED until Plan 28-04",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-07-30T02:05:59.579Z",
    "resolved_at": "2026-07-30T02:12:16.294Z"
  },
  {
    "id": 4,
    "kind": "stub",
    "phase": "31",
    "file": "src/utils/log-patterns.ts",
    "line": 23,
    "description": "matchLogPatterns Wave 0 shell returns [] until 31-01 GREEN",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-31T02:18:34.356Z",
    "resolved_at": null
  }
]
````
