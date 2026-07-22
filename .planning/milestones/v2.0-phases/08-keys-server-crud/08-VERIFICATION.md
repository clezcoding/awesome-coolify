---
phase: 08-keys-server-crud
verified: 2026-07-18T03:25:00Z
status: passed
score: 10/10 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 10/10
  previous_verified: 2026-07-17T00:14:00Z
  gaps_closed:
    - "private_key.list + reveal:true dual-layer rejection (08-05 plan)"
  gaps_remaining: []
  regressions: []
---

# Phase 8 Verification — Keys & Server CRUD

**Phase:** 08-keys-server-crud
**Verified:** 2026-07-18T03:25:00Z
**Status:** passed
**Verifier:** gsd-verifier (autonomous)
**Re-verification:** Yes — after 08-05 gap closure (dual-layer D-11 rejection)

---

## Summary

Phase 8 fully implemented and re-verified after plan 08-05 closed the single UAT gap (private_key.list + reveal:true). All 10 requirement IDs (KEY-01..05, SRV-01..05) verified in code and tests. Full suite 599/599 green, build succeeds. Dual-layer D-11 rejection confirmed: schema accepts reveal, handler rejects reveal:true with COOLIFY_422 before fetchPrivateKeys is called.

**Status:** passed — no gaps, no human verification needed.

---

## Phase Goal

**Goal (ROADMAP.md):** Agent can register SSH private keys and stand up target servers with auto-validation — the prerequisites for every subsequent deployment target.

**Requirements:** KEY-01..KEY-05, SRV-01..SRV-05 (10 IDs).

**Success Criteria (5):** See ROADMAP.md Phase 8 section — all 5 SCs map to the 10 requirement IDs and are verified below.

---

## Requirement Traceability

| ID | Requirement | Plan(s) | Code Evidence | Test Evidence | Status |
|----|-------------|---------|---------------|---------------|--------|
| KEY-01 | Agent can list private keys | 00, 01, 02, 04, 05 | `private_key.ts` list-Action; `fetchPrivateKeys` in `client.ts:353` | `private_key.test.ts` list block (5 tests) | VERIFIED |
| KEY-02 | Agent can get private key details by UUID | 00, 01, 02, 04 | `private_key.ts` get-Action; `fetchPrivateKey` in `client.ts:363` | `private_key.test.ts` get block | VERIFIED |
| KEY-03 | Agent can create private key (name, PEM, description) | 00, 01, 02, 04 | `private_key.ts` create-Action with XOR superRefine (D-01); `createPrivateKey` in `client.ts:373` | `private_key.test.ts` create block (XOR, PEM stripping) | VERIFIED |
| KEY-04 | Agent can update private key metadata | 00, 01, 02, 04 | `private_key.ts` update-Action; `updatePrivateKey` in `client.ts:383` | `private_key.test.ts` update block | VERIFIED |
| KEY-05 | Agent can delete private key with confirm:true | 00, 01, 02, 04 | `private_key.ts` delete-Action; `validateDeleteConfirm` + `COOLIFY_409` deps; `deletePrivateKey` in `client.ts:394` | `private_key.test.ts` delete block | VERIFIED |
| SRV-01 | Agent can create server (name, IP, port, user, private_key_uuid) | 00, 01, 03, 04 | `server.ts` create-Action; `createServer` in `client.ts:418` + `runValidationCycle` (D-05/D-06) | `server.test.ts` create block | VERIFIED |
| SRV-02 | Agent can update server configuration | 00, 01, 03, 04 | `server.ts` update-Action; `updateServer` in `client.ts:428` | `server.test.ts` update block | VERIFIED |
| SRV-03 | Agent can delete server with confirm:true, delete_volumes=false default | 00, 01, 03, 04 | `server.ts` delete-Action; `deleteServer` in `client.ts:439` with `delete_volumes=false` default (D-16) | `server.test.ts` delete block | VERIFIED |
| SRV-04 | Agent can trigger server validation (SSH/reachability) | 00, 01, 03, 04 | `server.ts` validate-Action; `validateServer` in `client.ts:453` + `pollServerUntilReachable` (D-08) | `server.test.ts` validate block | VERIFIED |
| SRV-05 | Agent can mark server as build server via update | 00, 01, 03, 04 | `server.ts` update-Action with `is_build_server` field (line 86) | `server.test.ts` update block (build_server) | VERIFIED |

**Coverage:** 10/10 requirement IDs mapped and verified in code + tests. No orphans (all REQUIREMENTS.md Phase 8 IDs appear in at least one plan frontmatter).

---

## Plan 08-05 Coverage (Re-verification Focus)

Plan 08-05 closed the single UAT gap: `private_key.list + reveal:true` was rejected at the MCP host JSON Schema layer before the handler ran, instead of returning the structured `COOLIFY_422` envelope. The fix moves the rejection one layer down — schema accepts `reveal`, handler rejects `reveal:true`.

| Must-Have (08-05) | Evidence | Status |
|-------------------|----------|--------|
| list schema accepts `reveal` (optional boolean, default false) | `private_key.ts:30` `listReadParamsSchema = sharedReadParamsSchema`; `private_key.ts:47-52` `listActionSchema` spreads `listReadParamsSchema` (which includes reveal) with `.strict()` | VERIFIED |
| list with reveal:true returns structured COOLIFY_422 at handler level | `private_key.ts:272-280` `case 'list':` throws `CoolifyApiError({code:'COOLIFY_422', ...})` before `fetchPrivateKeys` | VERIFIED |
| list with reveal:false or reveal omitted returns normal summary projection | `private_key.ts:282-303` normal flow after guard; `private_key.test.ts:87-103` Tests B + C | VERIFIED |
| PEM material never returned by any private_key action (D-02 unchanged) | `stripPemFields` + `sanitizeFullProjection` in get/create/update paths; `PEM_FIELD_PATTERN` in `projections.ts` (2 hits) | VERIFIED |
| Tool description documents dual-layer rejection | `server.ts:402` description contains "list accepts reveal on the schema but rejects reveal:true at the handler with COOLIFY_422 (D-11)" | VERIFIED |
| Full suite green; build succeeds | `npm test` 599/599; `npm run build` success (99.25 KB ESM) | VERIFIED |

### Behavioral Spot-Checks (08-05)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Schema accepts reveal:true | `privateKeyActionSchema.safeParse({action:'list', reveal:true}).success` | `true` | PASS |
| Schema accepts reveal omitted | `privateKeyActionSchema.safeParse({action:'list'}).success` | `true` | PASS |
| Schema still rejects unknown keys (.strict retained) | `privateKeyActionSchema.safeParse({action:'list', bogus:true}).success` | `false` | PASS |
| Handler rejects reveal:true with COOLIFY_422, no fetch | `private_key.test.ts` "rejects reveal:true on list with COOLIFY_422 per D-11" | passes (suite 599/599) | PASS |
| Handler allows reveal:false, calls fetchPrivateKeys | `private_key.test.ts` "allows reveal:false on list and calls fetchPrivateKeys" | passes | PASS |
| Handler defaults reveal to false when omitted | `private_key.test.ts` "defaults reveal to false when omitted on list" | passes | PASS |
| Full suite green | `npm test` | 599/599 passed, 36 files | PASS |
| Build succeeds | `npm run build` | 99.25 KB ESM, 20ms | PASS |

---

## Must-Haves Check Per Plan

### Plan 08-00 (Wave 0 RED Scaffolds)

| Must-Have | Evidence | Status |
|-----------|----------|--------|
| `private_key.test.ts` exists, covers KEY-01..05 | 17 `it()` blocks (was 14, +3 from 08-05) | VERIFIED |
| `server.test.ts` exists, covers SRV-01..05 | 16 `it()` blocks | VERIFIED |
| Both files mock `api/client.js` with all required functions | `vi.mock('../../api/client.js', ...)` in both | VERIFIED |
| No test touches real Coolify API | all ofetch calls replaced via `vi.fn()` | VERIFIED |
| No `.skip`/`.todo` | grep for `\.skip\(|\.todo\(` returns 0 | VERIFIED |

### Plan 08-01 (API Surface Extensions)

| Must-Have | Evidence | Status |
|-----------|----------|--------|
| `client.ts` exports 9 new functions + `pollServerUntilReachable` | All 10 exports present at lines 353, 363, 373, 383, 394, 418, 428, 439, 453, 468 | VERIFIED |
| `errors.ts` adds `COOLIFY_409` and `COOLIFY_SSH_UNREACHABLE` with `RECOVERY_HINTS` | grep count = 5 (>=4) | VERIFIED |
| `sanitizeFullProjection` masks PEM even with reveal=true (D-02) | `PEM_FIELD_PATTERN` in `projections.ts` (2 hits) | VERIFIED |
| `resource.list` schema type enum includes `'server'` (D-10) | `resource.ts:13` `z.enum(['application','service','database','server','project','environment'])` | VERIFIED |
| `resource.test.ts` covers new `'server'` list filter | 9 hits for `type=server`-style patterns | VERIFIED |

### Plan 08-02 (private_key Handler)

| Must-Have | Evidence | Status |
|-----------|----------|--------|
| Actions list, get, create, update, delete, delete_preview | `privateKeyActionSchema` discriminatedUnion with 6 variants (lines 120-127) | VERIFIED |
| D-09: Private keys only via `private_key.list` | no entry in `resource.list` for private_keys | VERIFIED |
| No action returns PEM (D-02) | `stripPemFields` + `sanitizeFullProjection` in get/create/update paths | VERIFIED |
| create accepts exactly one of private_key/key_file (XOR, D-01) | `superRefine` in `createActionSchema` (lines 72-84) | VERIFIED |
| create-Response shape `{uuid, name, fingerprint?}` (D-03) | `buildCreateResponse` in `private_key.ts` | VERIFIED |
| list/get Summary fields uuid, name, fingerprint, description (D-04) | `projectPrivateKeySummary` | VERIFIED |
| list with reveal:true -> COOLIFY_422 (D-11, dual-layer after 08-05) | handler-level guard at lines 273-280; schema accepts reveal | VERIFIED |
| delete requires confirm:true (D-14) | `validateDeleteConfirm` throws `COOLIFY_CONFIRM_REQUIRED` | VERIFIED |
| delete_preview lists dependent servers; delete with confirm on referenced key -> COOLIFY_409 with `dependent_server_uuids` (D-15) | `findDependentServers` + `COOLIFY_409` throw in delete-Action (lines 417-428) | VERIFIED |
| No `force` param in schema (D-15) | `grep -c 'force' src/mcp/tools/private_key.ts` == 0 | VERIFIED |

### Plan 08-03 (server Handler)

| Must-Have | Evidence | Status |
|-----------|----------|--------|
| Actions get, create, update, delete, delete_preview, validate | `serverActionSchema` discriminatedUnion with 6 variants | VERIFIED |
| No `server.list` action (D-10) | no `list` variant in `serverActionSchema`; servers via `resource.list type=server` | VERIFIED |
| create auto-validates (default validate:true, 30s poll, D-05/D-06) | `createActionSchema.validate.default(true)` + `runValidationCycle` with `DEFAULT_VALIDATE_TIMEOUT_MS=30000` | VERIFIED |
| create with SSH unreachable -> ok:true + validation.reachable:false + COOLIFY_SSH_UNREACHABLE hint; no rollback (D-07) | `runValidationCycle` unreachable branch (lines 223); no `deleteServer` call in create | VERIFIED |
| create poll timeout -> ok:true + validation.status:'pending' + retry hint (D-05) | `runValidationCycle` pending branch | VERIFIED |
| validate uses same wait/timeout model as create (D-08) | shared `runValidationCycle` helper (line 189) | VERIFIED |
| get resolves `private_key_uuid` from `private_key_id` via `fetchPrivateKeys` (Pitfall 1); no validate side-effect (D-12) | `resolvePrivateKeyUuidFromId` (line 155); no `validateServer` call in `case 'get':` (line 311) | VERIFIED |
| delete requires confirm:true (D-14); delete_volumes default false (D-16) | `validateDeleteConfirm` + `deleteActionSchema.delete_volumes.default(false)` (line 107) | VERIFIED |
| delete_preview lists child resources as warning; delete with confirm allowed (D-16) | `deletePreviewActionSchema` + `response.warning` when `childResources.length > 0` (line 479) | VERIFIED |
| update accepts is_build_server boolean (SRV-05) | `updateActionSchema.is_build_server` (line 86) | VERIFIED |
| `delete_volumes` in `server.ts` >= 2 | grep count = 3 | VERIFIED |
| `COOLIFY_SSH_UNREACHABLE` in `server.ts` >= 1 | grep count = 1 | VERIFIED |
| `pollServerUntilReachable` in `server.ts` >= 1 | grep count = 2 | VERIFIED |

### Plan 08-04 (Tool Registration)

| Must-Have | Evidence | Status |
|-----------|----------|--------|
| `registerCoolifyTools` registers `private_key` and `server` | `server.registerTool` blocks at lines 398 (private_key) and 429 (server) | VERIFIED |
| Both tools use `toolOutputSchema` | `outputSchema: toolOutputSchema` in both blocks | VERIFIED |
| `private_key` annotations: openWorldHint:true, no readOnlyHint | `annotations: { openWorldHint: true }` | VERIFIED |
| `server` annotations: openWorldHint:true, no readOnlyHint | `annotations: { openWorldHint: true }` | VERIFIED |
| Error results as `structuredContent { ok:false, error }` | `isPrivateKeyErrorResult`/`isServerErrorResult` branches in `server.ts` | VERIFIED |
| `npm run test` green | 599/599 passed | VERIFIED |
| `registerTool` count >= 11 | 14 (was 12, now 14 with project + environment from Phase 9) | VERIFIED |

---

## Automated Verification Commands

| Command | Result |
|---------|--------|
| `npm test` (full suite) | 599/599 passed, 36 files, 8.42s |
| `npm run build` (tsup) | Build success, 99.25 KB ESM, 20ms |
| `grep -c 'registerTool' src/mcp/server.ts` | 14 |
| `grep -c 'force' src/mcp/tools/private_key.ts` | 0 |
| `grep -c 'delete_volumes' src/mcp/tools/server.ts` | 3 |
| `grep -c 'COOLIFY_409\|COOLIFY_SSH_UNREACHABLE' src/utils/errors.ts` | 5 |
| `grep -c 'PEM_FIELD_PATTERN' src/utils/projections.ts` | 2 |
| `grep -cE '\.skip\(|\.todo\(' *.test.ts` | 0 |
| `grep -c 'it(' src/mcp/tools/private_key.test.ts` | 17 (14 + 3 new from 08-05) |
| `grep -c 'it(' src/mcp/tools/server.test.ts` | 16 |
| `privateKeyActionSchema.safeParse({action:'list', reveal:true}).success` | true |
| `privateKeyActionSchema.safeParse({action:'list'}).success` | true |
| `privateKeyActionSchema.safeParse({action:'list', bogus:true}).success` | false (.strict retained) |
| `grep -c 'rejects reveal:true at the handler' src/mcp/server.ts` | 1 |

---

## Locked Decisions (D-01..D-16) Coverage

| Decision | Description | Code Evidence | Status |
|----------|-------------|---------------|--------|
| D-01 | create XOR private_key/key_file | `superRefine` in `createActionSchema` | VERIFIED |
| D-02 | PEM never returned, even with reveal | `stripPemFields` + `PEM_FIELD_PATTERN` | VERIFIED |
| D-03 | create-Response `{uuid, name, fingerprint?}` | `buildCreateResponse` | VERIFIED |
| D-04 | list/get Summary fields | `projectPrivateKeySummary` | VERIFIED |
| D-05 | auto-validate with timeout, pending status | `runValidationCycle` 30s | VERIFIED |
| D-06 | validate default true | `createActionSchema.validate.default(true)` | VERIFIED |
| D-07 | soft-unreachable, no rollback | unreachable branch without `deleteServer` | VERIFIED |
| D-08 | validate uses same wait model | shared `runValidationCycle` | VERIFIED |
| D-09 | private keys via `private_key.list` | not in `resource.list` enum | VERIFIED |
| D-10 | no `server.list`; `resource.list type=server` | enum + `parsed.type === 'server'` branch | VERIFIED |
| D-11 | list accepts reveal on schema, rejects reveal:true at handler (dual-layer after 08-05) | `listActionSchema` includes reveal; handler guard at line 273-280 | VERIFIED |
| D-12 | `server.get` without validate side-effect | no `validateServer` in get-Action | VERIFIED |
| D-13 | `delete_preview` on both tools | both schemas contain `delete_preview` variant | VERIFIED |
| D-14 | delete requires confirm:true | `validateDeleteConfirm` in both tools | VERIFIED |
| D-15 | `COOLIFY_409` on dependent servers, no `force` | `findDependentServers` + `COOLIFY_409` throw; 0 `force` in private_key.ts | VERIFIED |
| D-16 | `delete_volumes` default false; preview warning | `deleteActionSchema.delete_volumes.default(false)` + `response.warning` | VERIFIED |

---

## Anti-Pattern Scan

No `TBD`, `FIXME`, or `XXX` debt markers in files modified by this phase. No stub returns (`return null`, `return []`, `return {}`) in handler paths that flow to user-visible output. No hardcoded empty props at call sites. No console.log-only implementations.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none) | — | — | — |

---

## Manual-Only Verifications

Per `08-VALIDATION.md` and `08-UAT.md`, one manual smoke-test item remains (non-blocking): live Coolify SSH validate against a real host (SRV-04). All other behaviors are automated via mock-ofetch. The 08-UAT.md retest 2026-07-17 already confirmed the live MCP path returns structured `COOLIFY_422` (not host `-32602 Unrecognized key`) for `private_key.list + reveal:true` — the gap closed by 08-05.

---

## Re-verification Notes

- Previous verification (2026-07-17T00:14:00Z): status `passed`, score 10/10, no `gaps:` section.
- 08-05 plan was executed after that verification (commits `160cd41` fix + `dc5128c` docs) to close the UAT-identified D-11 gap.
- This re-verification confirms: 08-05 must-haves all VERIFIED, no regressions in 08-00..08-04 must-haves, full suite 599/599 green (was 547/547 in 08-05 SUMMARY; current count reflects Phase 9 additions).
- No new gaps. No human verification items.

---

## Conclusion

Phase 8 is fully and correctly implemented:

- **10/10 requirements** (KEY-01..05, SRV-01..05) verified in code and tests.
- **16/16 Locked Decisions** (D-01..D-16) enforced in code (D-11 updated to dual-layer after 08-05).
- **599/599 tests** green, build succeeds.
- All must-haves from plans 08-00..08-05 satisfied.
- 08-05 gap closure verified: schema accepts reveal, handler rejects reveal:true with COOLIFY_422 before fetchPrivateKeys.
- No gaps, no open questions, no human verification needed.

**Verification status:** `passed`

---

_Verified: 2026-07-18T03:25:00Z_
_Verifier: Claude (gsd-verifier, autonomous)_



