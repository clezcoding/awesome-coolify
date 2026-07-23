---
status: testing
phase: 18-live-uat-harness
source: [18-VERIFICATION.md]
started: 2026-07-23T18:33:00Z
updated: 2026-07-23T18:33:00Z
---

## Current Test

number: 1
name: Live UAT run against real Coolify UAT instance
expected: |
  Exit 0 (or 1 only on real tool failures); /tmp/uat.json + /tmp/uat.md written;
  stdout parses as JSON with rows, summary, v3_gaps; no resolved COOLIFY_TOKEN
  in stdout, /tmp/uat.json, or /tmp/uat.md
awaiting: user response

## Tests

### 1. Live UAT run
expected: Exit 0 (or 1 only on real tool failures); /tmp/uat.json + /tmp/uat.md written; stdout parses as JSON with rows, summary, v3_gaps; no resolved COOLIFY_TOKEN in stdout, /tmp/uat.json, or /tmp/uat.md
command: |
  export UAT_PROJECT_UUID=<uuid>
  npm run uat:live -- --out /tmp/uat.json
result: [pending]

### 2. Emergency preview row semantics (REVIEW CR-01)
expected: COOLIFY_CONFIRM_REQUIRED preview responses are scored as pass (preview assertion), not fail; default smoke run can exit 0 when all tools are healthy
result: [pending]

### 3. Matrix fixture assumptions (REVIEW WR-04)
expected: Rows application-get-smoke, service-get-smoke, database-get-smoke, server-get-smoke, deployment-list-smoke pass against the live UAT project; or fixture UUIDs are substituted from env vars. UAT project should have pre-seeded resources named uat-smoke-app, uat-smoke-service, uat-smoke-database, uat-smoke-server, uat-smoke-app-uuid
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
