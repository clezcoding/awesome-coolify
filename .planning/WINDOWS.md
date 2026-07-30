---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 0
total_count: 3
last_updated: 2026-07-30T02:05:59.579Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 28 | stub | src/mcp/tools/intelligence.ts |  | scorecard/impact/janitor/cleanup throw COOLIFY_NOT_IMPLEMENTED pending 28-02..28-04 | open |  | 2026-07-30T01:48:17.514Z |  |
| 2 | 28 | deviation | src/mcp/tools/intelligence.ts |  | Combined Task1+2 commit due to husky related-test gate; bracket severity reads | open |  | 2026-07-30T01:58:59.837Z |  |
| 3 | 28 | stub | src/mcp/tools/intelligence.ts | 827 | cleanup action COOLIFY_NOT_IMPLEMENTED until Plan 28-04 | open |  | 2026-07-30T02:05:59.579Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "28",
    "file": "src/mcp/tools/intelligence.ts",
    "line": null,
    "description": "scorecard/impact/janitor/cleanup throw COOLIFY_NOT_IMPLEMENTED pending 28-02..28-04",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T01:48:17.514Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "28",
    "file": "src/mcp/tools/intelligence.ts",
    "line": null,
    "description": "Combined Task1+2 commit due to husky related-test gate; bracket severity reads",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T01:58:59.837Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "28",
    "file": "src/mcp/tools/intelligence.ts",
    "line": 827,
    "description": "cleanup action COOLIFY_NOT_IMPLEMENTED until Plan 28-04",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T02:05:59.579Z",
    "resolved_at": null
  }
]
````
