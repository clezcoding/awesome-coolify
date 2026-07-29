---
status: complete
phase: 25-application-log-follow
source:
  - 25-00-SUMMARY.md
  - 25-01-SUMMARY.md
  - 25-02-SUMMARY.md
  - 25-03-SUMMARY.md
  - 25-04-SUMMARY.md
  - 25-05-SUMMARY.md
started: 2026-07-28T00:52:00Z
updated: 2026-07-28T01:49:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live-Bestätigung Application Log Follow
expected: system.version application_logs_follow + one-shot runtime/build logs unverändert + follow:true bounded poll + follow+deployment_uuid COOLIFY_422 live gegen Coolify
result: pass
retest_reason: "Gap G-25-1 fixed by 25-05 (MCP boundary schema split)"

### 2. log-follow-poll RED scaffolds (25-00)
expected: log-follow-poll RED scaffolds for dedup, idle, timeout, 429 backoff
result: pass
source: automated
coverage_id: 25-00-D1

### 3. application.logs follow RED scaffolds (25-00)
expected: application.logs follow schema accept + handler idle/timeout/422 RED scaffolds
result: pass
source: automated
coverage_id: 25-00-D2

### 4. COOLIFY_LOG_FOLLOW_TIMEOUT scaffold (25-00)
expected: COOLIFY_LOG_FOLLOW_TIMEOUT recovery hints scaffold
result: pass
source: automated
coverage_id: 25-00-D3

### 5. Five capability keys scaffold (25-00)
expected: system.version five capability keys including application_logs_follow
result: pass
source: automated
coverage_id: 25-00-D4

### 6. Integration follow schema (25-00)
expected: integration schema accepts follow:true
result: pass
source: automated
coverage_id: 25-00-D6

### 7. OBS-03 golden one-shot (25-00)
expected: OBS-03 golden runtime/build one-shot tests unchanged
result: pass
source: automated
coverage_id: 25-00-D6

### 8. followApplicationLogs poll loop (25-01)
expected: followApplicationLogs dedup, idle, timeout, 429 backoff
result: pass
source: automated
coverage_id: 25-01-D1

### 9. follow idle success (25-01)
expected: application.logs follow:true idle success with stopped_reason idle
result: pass
source: automated
coverage_id: 25-01-D2

### 10. dual-signal timeout (25-01)
expected: COOLIFY_LOG_FOLLOW_TIMEOUT dual-signal with partial logs_lines
result: pass
source: automated
coverage_id: 25-01-D3

### 11. follow max_chars cap (25-01)
expected: follow aggregate max_chars cap sets logs_truncated
result: pass
source: automated
coverage_id: 25-01-D4

### 12. partial logs on API error (25-01)
expected: API error during follow returns partial logs_lines in error data
result: pass
source: automated
coverage_id: 25-01-D5

### 13. schema follow accept (25-01)
expected: applicationActionSchema accepts follow:true on logs
result: pass
source: automated
coverage_id: 25-01-D6

### 14. zodDefaultFields follow strip (25-02)
expected: applicationActionSchema accepts follow on logs only with zodDefaultFields strip
result: pass
source: automated
coverage_id: 25-02-D1

### 15. follow+deployment_uuid reject (25-02)
expected: follow+deployment_uuid COOLIFY_422 on flat and nested schemas
result: pass
source: automated
coverage_id: 25-02-D2

### 16. OBS-03 runtime unchanged (25-02)
expected: One-shot runtime logs unchanged when follow absent or false
result: pass
source: automated
coverage_id: 25-02-D3

### 17. OBS-03 build path (25-02)
expected: Build logs path uses fetchDeployment not follow poll
result: pass
source: automated
coverage_id: 25-02-D4

### 18. integration follow + one-shot (25-02)
expected: Integration accepts follow:true schema and runtime one-shot unchanged
result: pass
source: automated
coverage_id: 25-02-D5

### 19. application_logs_follow capability (25-03)
expected: system.version exposes five capabilities including application_logs_follow
result: pass
source: automated
coverage_id: 25-03-D1

### 20. README/coverage docs (25-03)
expected: README EN/DE and coverage map document follow:true runtime polling
result: pass
source: automated
coverage_id: 25-03-D2

### 21. incident prompt deferred (25-03)
expected: No incident prompt edits (D-21 deferred Phase 26)
result: pass
source: automated
coverage_id: 25-03-D3

### 22. WR-01 empty-snapshot idle (25-04)
expected: Empty runtime log snapshots idle-stop with stopped_reason idle (WR-01)
result: pass
source: automated
coverage_id: 25-04-D1

### 23. WR-03 interval guard (25-04)
expected: One-bound interval ordering rejected on nested applicationLogsSchema (WR-03)
result: pass
source: automated
coverage_id: 25-04-D2

### 24. OBS-03 regression bundle (25-04)
expected: OBS-03 one-shot runtime/build paths unchanged
result: pass
source: automated
coverage_id: 25-04-D3

## Summary

total: 24
passed: 24
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-25-1
  truth: "follow:true + deployment_uuid returns structured COOLIFY_422 rejection via MCP application tool"
  status: resolved
  reason: "User reported: Tests 1–4 PASS live. Test 5: follow:true+deployment_uuid rejected with correct message but MCP envelope is 'Input validation error: Invalid arguments for tool application' — no structured { code: COOLIFY_422 } in response."
  severity: major
  test: 1
  root_cause: "MCP SDK validateToolInput runs applicationActionSchema superRefine before handler; Zod failures surface as generic 'Input validation error'. throwValidationError in parseApplicationAction (which maps issue.params.code → COOLIFY_422) never runs."
  artifacts:
    - path: "src/mcp/server.ts"
      issue: "registerTool inputSchema uses full applicationActionSchema with extraRefine"
    - path: "src/mcp/tools/application.ts"
      issue: "throwValidationError COOLIFY_422 mapping only reachable when handler parses"
    - path: "src/mcp/tools/shared-read-params.ts"
      issue: "createFlatActionSchema extraRefine baked into same schema used at MCP boundary"
  missing:
    - "Split MCP boundary schema (structural only) from handler validation schema (extraRefine + COOLIFY_422 params), OR map SDK validation errors to structured Coolify envelope"
    - "Live MCP integration test asserting follow+deployment_uuid returns structuredContent.error.code COOLIFY_422"
  resolved_by: 25-05-PLAN.md
  resolved_at: 2026-07-28
