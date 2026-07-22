---
phase: 11-service-database-crud
fixed_at: 2026-07-19T07:40:20Z
review_path: .planning/phases/11-service-database-crud/11-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-07-19T07:40:20Z
**Source review:** .planning/phases/11-service-database-crud/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Decoded `compose` YAML leaks secrets when `reveal:false`

**Files modified:** `src/mcp/tools/service.ts`, `src/mcp/tools/service.test.ts`
**Commit:** e2b2e37
**Applied fix:** Added `maskComposeIfNeeded` so `compose` is `***` unless `reveal:true`; wired into get/update/create; added `reveal` on create schema; updated D-06 tests for masked default.

### WR-01: `compose_file` size limit enforced only after full read

**Files modified:** `src/mcp/tools/service.ts`, `src/mcp/tools/service.test.ts`
**Commit:** b792a4a
**Applied fix:** `readBoundedComposeFile` now `openSync` + `fstatSync` and rejects when `size > COMPOSE_FILE_SIZE_LIMIT` before reading contents; tests mock fd helpers and cover oversize reject.

### WR-02: Inline `compose` has no size bound

**Files modified:** `src/mcp/tools/service.ts`, `src/mcp/tools/service.test.ts`
**Commit:** 087ee5e
**Applied fix:** Apply same 1 MiB `Buffer.byteLength` check to resolved inline compose on create and update before validate/encode.

### WR-03: Invalid `docker_compose_raw` base64 silently becomes empty `compose`

**Files modified:** `src/utils/yaml-validator.ts`, `src/utils/yaml-validator.test.ts`
**Commit:** e4b3294
**Applied fix:** `decodeCompose` returns `null` on invalid base64; `projectServiceCompose` sets `compose_decode_error` and strips `docker_compose_raw`.

### IN-01: Public-access confirm message always says “create”

**Files modified:** `src/mcp/tools/database.ts`, `src/mcp/tools/database.test.ts`
**Commit:** 683442b
**Applied fix:** `requireConfirmForPublicAccess` takes `actionName` (`create` | `update`); create/update refinements pass the correct label; tests assert message text.

### IN-02: Create success embeds unredacted start-failure `error` string

**Files modified:** `src/mcp/tools/database.ts`, `src/mcp/tools/service.ts`
**Commit:** 87e42f2
**Applied fix:** `deploy.error` on instant_deploy start failure uses `redactSecrets(message)` in both create handlers.

---

_Fixed: 2026-07-19T07:40:20Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
