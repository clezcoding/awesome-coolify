---
phase: 10-application-crud-safety
verified: 2026-07-19T07:15:00Z
status: passed
score: 17/18 must-haves verified
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:

  - truth: "D-08: instant_deploy queue failure returns soft success ok:true with deploy.status='failed_to_queue' and does NOT auto-rollback/delete the created app"
    test: "Mock triggerDeploy to reject during an instant_deploy:true create; assert handler returns ok:true, uuid present, deploy.status='failed_to_queue', and deleteApplication is NOT called"
    expected: "Soft-success envelope returned; created app remains; recoveryHints present"
    why_human: "Cleanup/cancellation invariant — presence checks see the catch block but no test deterministically exercises the failure path (the existing instant_deploy test accepts both 'queued' and 'failed_to_queue' statuses and does not mock triggerDeploy to reject)"
---

# Phase 10: Application CRUD & Safety Verification Report

**Phase Goal:** Agent can create all five application source types, update their configuration, and delete them safely — with cross-cutting safety guarantees (confirm gates, safe delete defaults, Zod validation, secret masking) as the canonical reference implementation for later phases.
**Verified:** 2026-07-19T07:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1/APP-12..16: 5 create source types dispatch to correct POST routes | VERIFIED | `createActionSchema` 5-variant discriminatedUnion (application.ts:395-401); `handleApplicationCreate` dispatches by source_type (application.ts:1508-1544); 5 tests pass |
| 2 | SC1/APP-20: instant_deploy fire-and-forget returns queued status + hints | VERIFIED | instant_deploy default false (application.ts:261-264); handler returns queued + hints (application.ts:1575-1592); test passes |
| 3 | SC2/APP-17: update with FQDN/build commands/healthcheck/labels reflects in response | VERIFIED | `updateActionSchema` curated fields (application.ts:425-487); `handleApplicationUpdate` calls updateApplication + fetchApplication + sanitizeFullProjection (application.ts:1382-1414); test passes |
| 4 | SC3/APP-18: delete with confirm:true calls deleteApplication with safe defaults | VERIFIED | `handleApplicationDelete` validates confirm + calls deleteApplication with 4 flags (application.ts:1416-1453); test passes |
| 5 | SC3/SAF-01: delete without confirm returns COOLIFY_CONFIRM_REQUIRED, no API call | VERIFIED | `validateDeleteConfirm` throws (application.ts:1425, 767); test asserts deleteApplication NOT called |
| 6 | SC3/SAF-02: delete defaults all four flags false (incl. delete_connected_networks) | VERIFIED | Zod defaults false (application.ts:547-562); test asserts all four flags false |
| 7 | SC4/APP-21 (create 409): 409 maps to COOLIFY_409 + data.conflicts + force_domain_override hint | VERIFIED | `toStructuredError` enriches (errors.ts:212-221); test asserts COOLIFY_409 + conflicts passthrough |
| 8 | SC4/APP-21 (create override): force_domain_override:true passes to create body, returns success | VERIFIED | `buildCreateApiBody` includes flag (application.ts:1317); test asserts createPublicApplication called with force_domain_override:true |
| 9 | SC5/APP-19: HTTP basic auth fields accepted on update | VERIFIED | `updateActionSchema` has is_http_basic_auth_enabled/username/password (application.ts:510-521); test passes |
| 10 | SC5/SAF-04: http_basic_auth_password masked unless reveal:true; username visible | VERIFIED | `handleApplicationUpdate` routes through sanitizeFullProjection(raw, parsed.reveal) (application.ts:1408); 2 tests pass (masked + revealed) |
| 11 | SC6/SAF-03 (create): Zod rejects malformed create before API call | VERIFIED | superRefine with COOLIFY_VALIDATION_ERROR (application.ts:285-323); test asserts createPublicApplication NOT called |
| 12 | SC6/SAF-03 (update): Zod .strict() rejects unknown update fields before API call | VERIFIED | `.strict()` on updateActionSchema (application.ts:532); test asserts updateApplication NOT called |
| 13 | APP-21 (update 409): 409 on update maps to COOLIFY_409 + force_domain_override hint | VERIFIED | Shared `toStructuredError` enrichment; test passes |
| 14 | APP-21 (update override): force_domain_override:true in PATCH body, returns success | VERIFIED | `buildUpdatePayload` includes flag when true (application.ts:1375-1377); test passes |
| 15 | D-21: identity resolution uuid|name|fqdn with COOLIFY_AMBIGUOUS_MATCH | VERIFIED | `resolveAppMutationUuid` used in update/delete/delete_preview; multi-match tests pass |
| 16 | delete_preview: returns would_delete + child_resources without deleting | VERIFIED | `handleApplicationDeletePreview` (application.ts:1455-1499); test asserts deleteApplication NOT called |
| 17 | D-04: build_pack=dockercompose rejected with COOLIFY_VALIDATION_ERROR | VERIFIED | `gitBuildPackSchema` superRefine (application.ts:272-283); test passes |
| 18 | D-08: instant_deploy queue failure returns soft success, no auto-rollback/delete | PRESENT_BEHAVIOR_UNVERIFIED | Catch block present (application.ts:1593-1613) but no test mocks triggerDeploy to reject; existing instant_deploy test accepts both 'queued' and 'failed_to_queue' statuses ambiguously |

**Score:** 17/18 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/mcp/tools/application.ts` | create/update/delete/delete_preview schemas + handlers | VERIFIED | createActionSchema, updateActionSchema, deleteActionSchema, deletePreviewActionSchema + 4 handlers wired into switch |
| `src/api/client.ts` | 7 CRUD client functions | VERIFIED | createPublicApplication, createPrivateGithubAppApplication, createPrivateDeployKeyApplication, createDockerfileApplication, createDockerimageApplication, updateApplication, deleteApplication (client.ts:257-324) |
| `src/utils/errors.ts` | COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough | VERIFIED | Union + RECOVERY_HINTS (errors.ts:13-15, 81); extractConflicts + toStructuredError enrichment (errors.ts:126-127, 212-221) |
| `src/mcp/tools/application.test.ts` | RED scaffolds flipped GREEN | VERIFIED | 78 tests pass; describe blocks for create/update/delete/delete_preview present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| application.ts handleApplicationAction | api/client.ts CRUD functions | imports + dispatch | WIRED | 7 client functions imported (application.ts:4-19); dispatched in handleApplicationCreate/Update/Delete |
| application.ts | utils/errors.ts | CoolifyApiError + RECOVERY_HINTS + wrapMcpError | WIRED | Imports (application.ts:33-39); COOLIFY_VALIDATION_ERROR + COOLIFY_CONFIRM_REQUIRED used |
| application.ts handleApplicationUpdate | utils/projections.ts sanitizeFullProjection | import + call | WIRED | sanitizeFullProjection(raw, parsed.reveal) at application.ts:1408 |
| application.ts handleApplicationCreate | utils/deploy-poll triggerDeploy + extractDeploymentUuid | import + call | WIRED | triggerDeploy + extractDeploymentUuid (application.ts:1566-1573) |
| application.ts handleApplicationDeletePreview | api/client.ts fetchResources | import + filter | WIRED | fetchResources + filter by application_uuid (application.ts:1464-1477) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| application create tests | `npx vitest run src/mcp/tools/application.test.ts -t "application create"` | 11 passed | PASS |
| application update tests | `npx vitest run src/mcp/tools/application.test.ts -t "application update"` | 9 passed | PASS |
| application delete tests | `npx vitest run src/mcp/tools/application.test.ts -t "application delete"` | 5 passed | PASS |
| full application suite | `npx vitest run src/mcp/tools/application.test.ts` | 78 passed | PASS |
| full workspace suite | `npx vitest run` | 638 passed (36 files) | PASS |
| build | `npm run build` | tsup success | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| APP-12 | 10-00, 10-01, 10-02 | Create app from public Git | SATISFIED | test "creates public_git application" passes |
| APP-13 | 10-00, 10-01, 10-02 | Create app from private Git via deploy key | SATISFIED | test "creates private_deploy_key application" passes |
| APP-14 | 10-00, 10-01, 10-02 | Create app from private Git via GitHub App | SATISFIED | test "creates private_github_app application" passes |
| APP-15 | 10-00, 10-01, 10-02 | Create app from inline Dockerfile | SATISFIED | test "creates dockerfile application" passes |
| APP-16 | 10-00, 10-01, 10-02 | Create app from Docker registry image | SATISFIED | test "creates dockerimage application" passes |
| APP-17 | 10-00, 10-01, 10-03 | Update application configuration | SATISFIED | test "patches curated fields via updateApplication" passes |
| APP-18 | 10-00, 10-01, 10-04 | Delete application with confirm + safe defaults | SATISFIED | test "deletes application when confirm:true with safe defaults" passes |
| APP-19 | 10-00, 10-03 | Configure HTTP basic auth | SATISFIED | test "passes HTTP basic auth fields" passes |
| APP-20 | 10-00, 10-02 | Enable instant deploy on create | SATISFIED | test "returns deploy queued status and follow-up hints" passes |
| APP-21 | 10-00, 10-01, 10-02, 10-03 | Structured 409 recovery hints with force_domain_override | SATISFIED | 4 tests (create 409, create override, update 409, update override) pass |
| SAF-01 | 10-00, 10-04 | Delete requires confirm:true | SATISFIED | test "returns COOLIFY_CONFIRM_REQUIRED when confirm is false" passes |
| SAF-02 | 10-00, 10-04 | Safe delete defaults (4 flags false) | SATISFIED | test "passes all four safe-delete flags false by default" passes |
| SAF-03 | 10-00, 10-02, 10-03 | Zod validation before API call | SATISFIED | tests "rejects create with missing server_uuid" + "rejects unknown update fields" pass |
| SAF-04 | 10-00, 10-03 | Secret masking unless reveal:true | SATISFIED | tests "masks http_basic_auth_password" + "returns plaintext when reveal:true" pass |

No orphaned requirements. All 14 IDs (APP-12..APP-21, SAF-01..SAF-04) declared in PLAN frontmatter and mapped to REQUIREMENTS.md traceability table.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers in modified files | info | Clean |

### Human Verification Required

### 1. D-08 instant_deploy queue-failure soft-success invariant

**Test:** Mock `triggerDeploy` to reject during an `instant_deploy: true` create call; assert handler returns `ok: true`, includes the created app UUID, sets `deploy.status: 'failed_to_queue'`, includes recoveryHints, and does NOT call `deleteApplication` (no auto-rollback).
**Expected:** Soft-success envelope returned; created app remains on Coolify; recoveryHints guide agent to retry deploy via `application.deploy`.
**Why human:** This is a cancellation/cleanup invariant — presence checks confirm the catch block exists (application.ts:1593-1613) but no test deterministically exercises the failure path. The existing `instant_deploy:true` test (application.test.ts:1468) accepts both `'queued'` and `'failed_to_queue'` statuses and does not mock `triggerDeploy` to reject, so the cleanup invariant ("no auto-rollback/delete") is never asserted.

### Gaps Summary

No gaps found. All 14 requirements satisfied; all artifacts exist, are substantive, and are wired; all key links connected; build green; full test suite (638 tests) green.

One behavior-dependent truth (D-08 instant_deploy queue-failure soft-success invariant) is present and wired but not exercised by a deterministic test — routed to human verification. The handler code is correct on inspection; the gap is test coverage, not implementation.

---

_Verified: 2026-07-19T07:15:00Z_
_Verifier: Claude (gsd-verifier)_
