---
phase: 15-multi-instance-registry-routing
verified: 2026-07-21T05:30:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 15: Multi-Instance Registry & Routing Verification Report

**Phase Goal:** Agent can manage named Coolify instances in a secure registry and route any tool call to a chosen instance without cross-instance leakage
**Verified:** 2026-07-21T05:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap Success Criteria (the contract):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Agent can add, list, update, and delete named instances in `~/.coolify-mcp/instances.json` and entries persist across sessions | ✓ VERIFIED | `src/utils/instance-registry.ts` InstanceManager.add/update/delete/list/loadRegistry (lines 84-250); `src/mcp/tools/instance.ts` handleInstanceAction switch (lines 230-305); `src/utils/instance-registry.test.ts` 15 it blocks GREEN covering add/list/update/delete/persist |
| 2 | Agent can set a default instance, and `COOLIFY_URL`/`COOLIFY_TOKEN` env vars override the registry default when present | ✓ VERIFIED | `InstanceManager.setDefault` (lines 223-236); `resolveCredentials` precedence (lines 252-299) — env both-set wins over registry default; `instance-registry.test.ts` "env both-set overrides registry default" + "set-default" tests GREEN |
| 3 | Agent can call any of the 14 tools with an optional `instance` parameter and the call routes to that named instance's credentials | ✓ VERIFIED | 12 API-calling tools (application, service, database, deployment, emergency, resource, system, diagnose, server, private_key, project, environment) all call `resolveRoutingEnv(env, parsed.instance)` at handler entry; `src/mcp/integration.test.ts` CTX-06 describe block has 9 prod-routing + 3 error-path tests GREEN. meta and docs intentionally excluded (no Coolify API call — documented in 15-04-PLAN prohibitions) |
| 4 | Registry directory and file created with `0o700`/`0o600` perms; list/get responses redact tokens unless `reveal: true` | ✓ VERIFIED | `executeSave` (lines 101-136): mkdirSync 0o700 + chmodSync 0o700 + writeFileSync 0o600 + chmodSync 0o600 + chmodSync after rename; `redactInstance` (lines 65-70) masks token as `***` unless reveal; `instance-registry.test.ts` "saveRegistry creates dir with 0o700 and file with 0o600" + "list redacts token as *** unless reveal:true" tests GREEN |
| 5 | Concurrent registry writes do not corrupt the file (atomic temp-file + rename) | ✓ VERIFIED | `executeSave` writes `${filePath}.tmp.${process.pid}.${Date.now()}` then `renameSync`; `withWriteLock` (lines 73-82) serializes via Promise chain; `instance-registry.test.ts` "saveRegistry uses temp file + rename; concurrent saves serialized by in-memory lock" test GREEN — Promise.all([add, add]) yields 2 entries, no tmp file remains |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils/instance-registry.ts` | InstanceManager CRUD + resolveCredentials + atomic writes + perms | ✓ VERIFIED | 300 lines; exports instanceSchema, Instance, Registry, InstanceManager with loadRegistry/saveRegistry/add/update/delete/setDefault/list/get/resolveCredentials; chmod 0o700/0o600 + temp+rename + Promise lock |
| `src/utils/errors.ts` | Extended with COOLIFY_NO_INSTANCE, COOLIFY_INSTANCE_NOT_FOUND, COOLIFY_PARTIAL_ENV | ✓ VERIFIED | CoolifyErrorCode union (lines 3-18) includes all 3 new codes; RECOVERY_HINTS (lines 88-100) has matching entries |
| `src/mcp/tools/instance.ts` | instance tool with 7 actions, no instance routing param, token redaction | ✓ VERIFIED | 316 lines; instanceActionSchema discriminatedUnion on action (list/get/add/update/delete/set-default/import-env); no instance field on any action; maskInstance redacts token; isInstanceErrorResult guard exported |
| `src/config/env.ts` | Softened: URL/TOKEN optional, partial-env guard | ✓ VERIFIED | envSchema (lines 6-13) — COOLIFY_URL/COOLIFY_TOKEN optional; loadEnv (lines 73-91) post-parse partial-env guard throws COOLIFY_PARTIAL_ENV; formatEnvLoadHint mentions soft-start + instance.add |
| `src/mcp/server.ts` | Registers 15th tool `instance`; soft-start boot | ✓ VERIFIED | registerTool('instance', ...) (lines 435-464) with readOnlyHint; createAndConnectServer (lines 581-591) accepts EnvConfig with undefined URL/TOKEN; src/index.ts boot path calls loadEnv() then createAndConnectServer — no crash on empty env |
| `src/mcp/tools/shared-read-params.ts` | Routing helpers: optionalInstanceParam, parseWithInstanceRouting, safeParseWithInstanceRouting, resolveRoutingEnv | ✓ VERIFIED | 203 lines; optionalInstanceParam regex ^[a-z][a-z0-9_-]{1,31}$; resolveRoutingEnv calls InstanceManager.resolveCredentials and merges into EnvConfig |
| 12 domain tool files (application/service/database/deployment/emergency/resource/system/diagnose/server/private_key/project/environment) | Each accepts optional instance param + routes via resolveRoutingEnv | ✓ VERIFIED | grep confirms resolveRoutingEnv( called in all 12 files; integration tests GREEN |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| instance.ts | InstanceManager (src/utils/instance-registry.ts) | import + InstanceManager.add/get/list/update/delete/setDefault calls | ✓ WIRED | instance.ts lines 12-15 import InstanceManager; handler calls InstanceManager methods per action |
| server.ts | instance tool registration | registerTool('instance', ...) + handleInstanceAction | ✓ WIRED | server.ts lines 42-46 import; lines 435-464 register |
| 12 domain tool handlers | InstanceManager.resolveCredentials | resolveRoutingEnv → InstanceManager.resolveCredentials(args.instance, env) | ✓ WIRED | shared-read-params.ts line 64-76; each handler calls resolveRoutingEnv at entry |
| 12 domain tool handlers | createCoolifyClient(resolved.url, resolved.token, resolved.verifySsl) | routingEnv.COOLIFY_URL/TOKEN/VERIFY_SSL passed to fetch* functions | ✓ WIRED | Verified in application.ts (lines 2745, 2787-2790), resource.ts (lines 230-234), system.ts (lines 130-134, 142-146) |
| 12 domain tool handlers | wrapMcpError on resolveCredentials throw | try/catch → wrapMcpError | ✓ WIRED | All 12 handlers wrap entry in try/catch returning wrapMcpError(error) |
| src/index.ts boot | loadEnv + createAndConnectServer | loadEnv() → createAndConnectServer(env) | ✓ WIRED | src/index.ts lines 6-7; soft-start verified — loadEnv({}) returns undefined URL/TOKEN |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| instance.ts list response | instances[] | InstanceManager.list() → loadRegistry() → readFileSync(instances.json) | ✓ Yes — real file read | ✓ FLOWING |
| instance.ts add response | new Instance | InstanceManager.add() → saveRegistry() → writeFileSync | ✓ Yes — real file write | ✓ FLOWING |
| 12 domain tool handlers | routingEnv.COOLIFY_URL/TOKEN | resolveRoutingEnv → InstanceManager.resolveCredentials → registry or env | ✓ Yes — real credential resolution | ✓ FLOWING |
| instance.ts list _meta.envOverride | Boolean(env.COOLIFY_URL && env.COOLIFY_TOKEN) | hasEnvOverride() reads env param + process.env | ✓ Yes — real env check | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| InstanceManager + instance tool + env + integration tests GREEN | `npx vitest run src/utils/instance-registry.test.ts src/mcp/tools/instance.test.ts src/config/env.test.ts src/mcp/integration.test.ts` | 4 files, 52 tests passed | ✓ PASS |
| 12 domain tool test suites GREEN | `npx vitest run src/mcp/tools/{application,service,database,deployment,emergency,resource,system,diagnose,server,private_key,project,environment}.test.ts` | 12 files, 431 tests passed | ✓ PASS |
| Build stays GREEN | `npm run build` (tsup) | dist/index.js 193.28 KB, build success | ✓ PASS |
| Full suite no regressions | `npm test` | 40 files, 876 tests passed | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` declared in PLAN/SUMMARY; phase is not a migration/tooling phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CTX-04 | 15-00, 15-01, 15-02 | Agent can add, list, update, and delete named instances in `~/.coolify-mcp/instances.json` | ✓ SATISFIED | InstanceManager CRUD + instance tool 7 actions + 15 registry tests + 12 instance tool tests GREEN |
| CTX-05 | 15-00, 15-01, 15-02 | Agent can set default instance; env vars override registry when present | ✓ SATISFIED | setDefault + resolveCredentials precedence (param→env→default→error); env.test.ts soft-start + partial-env cases GREEN |
| CTX-06 | 15-00, 15-03, 15-04 | Agent can route any tool call to a named instance via optional `instance` parameter | ✓ SATISFIED | 12 API-calling tools accept optional instance param + resolveRoutingEnv; integration.test.ts 12 CTX-06 tests GREEN (9 prod-routing + 3 error-path) |
| CTX-08 | 15-00, 15-01, 15-02 | Registry dir 0o700, file 0o600; tokens redacted in list/get unless `reveal: true` | ✓ SATISFIED | executeSave chmodSync 0o700/0o600 after every write; redactInstance masks token as `***`; registry test asserts mode & 0o777 |
| CTX-09 | 15-00, 15-01 | Registry writes atomic (temp file + rename) under concurrent access | ✓ SATISFIED | executeSave temp+rename; withWriteLock Promise serialization; concurrent-save test GREEN |

No orphaned requirements — all 5 IDs (CTX-04, CTX-05, CTX-06, CTX-08, CTX-09) mapped to Phase 15 in REQUIREMENTS.md are claimed by plans and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers in any phase-modified file; no stub returns; no hardcoded empty data; no console.log-only handlers |

### Human Verification Required

None. All truths behaviorally verified by passing tests (atomic-write concurrency test + per-request routing integration tests). No visual, real-time, or external-service items outstanding.

### Gaps Summary

No gaps. All 5 Roadmap Success Criteria verified against actual codebase:

1. **CRUD + persistence** — InstanceManager implements all 5 ops; tests exercise each; commits fb8362b + ad3ed17 + 1ea8ecb land the code.
2. **Default + env override** — resolveCredentials precedence (param→env→default→COOLIFY_NO_INSTANCE) verified by 4 resolveCredentials tests.
3. **Per-request routing** — 12 API-calling tools route via resolveRoutingEnv; 9 prod-routing integration tests capture creds and confirm correct instance; meta/docs intentionally excluded (no API call).
4. **Perms + redaction** — chmod 0o700/0o600 re-applied on every save; token masked as `***` unless reveal:true; registry test asserts file mode.
5. **Atomic writes** — temp+rename+Promise-lock; concurrent-save test passes.

**Note on SC #3 wording:** SC says "any of the 14 tools" — implementation routes 12 of 14 (meta and docs excluded). This is an intentional design decision documented in 15-04-PLAN prohibitions: "Do NOT add instance param to meta or docs tools (no API call)". meta returns MCP server version; docs searches static guides — neither makes a Coolify API call, so there are no credentials to route. The spirit of SC #3 (route any tool that needs credentials) is fully met. Flagging as informational, not a gap.

---

_Verified: 2026-07-21T05:30:00Z_
_Verifier: Claude (gsd-verifier)_
