---
phase: 03-diagnose-issue-scan
plan: verification
status: passed
score: 4/4
requirements: [SYS-03, SYS-04, SYS-05, OUT-06]
verified: 2026-07-12
verifier: gsd-verify-work (automated + manual review)
test_state: green
build_state: green
tsc_state: pre-existing-debt
gap_closure_verified: 2026-07-12
gap_closure_plan: 03-07-PLAN.md
---

# Phase 03 Verification Report — Diagnose & Issue Scan

**Phase goal (ROADMAP.md):** As an AI agent, I want app/server diagnose and global issue scan, so that I can triage unhealthy deployments before acting.

**Verdict:** PASSED — alle 4 Success Criteria erfüllt, alle 4 Requirement-IDs traced, 198/198 Tests grün, `npm run build` grün. Pre-existing tsc-Debt dokumentiert (kein Phase-3-Failure).

---

## 1. Must-Haves Table

| # | Success Criterion (ROADMAP.md) | Status | Code Artifact (file:line) | Test Evidence |
|---|--------------------------------|--------|---------------------------|---------------|
| SC-1 | Agent diagnoses app by UUID, name, or domain — receives status, health, env count, recent deployments | ✅ passed | `src/mcp/tools/diagnose.ts:264-350` (`handleDiagnoseApp`); `src/utils/projections.ts:255-317` (`projectAppDiagnose`); input resolution via `resolveAppUuid` at `diagnose.ts:157-209` accepts query\|uuid\|name\|domain | `src/mcp/tools/diagnose.test.ts:401` ("never serializes env values — env_count is integer only"), `:361` (env_count: 2), `:419` (degrades env_count to null on 403); `tests/integration/diagnose-flow.test.ts:123` (D-05 fields + hints + updated_at) |
| SC-2 | Agent diagnoses server by UUID, name, or IP — receives resources, domains, validation state | ✅ passed | `src/mcp/tools/diagnose.ts:352-438` (`handleDiagnoseServer`); `src/utils/projections.ts:319-359` (`projectServerDiagnose`); `resolveServerUuid` at `diagnose.ts:211-262` accepts query\|uuid\|name\|ip; `validation_started` boolean at `projections.ts:356`; `trigger_validate` opt-out at `diagnose.ts:101-104` | `src/mcp/tools/diagnose.test.ts` server-branch tests (11 cases per 03-03 SUMMARY); `tests/integration/diagnose-flow.test.ts:142` (validation_started boolean + resources_counts{applications,databases,services} + domains) |
| SC-3 | Agent runs global issue scan — surfaces unhealthy apps/DBs/services and unreachable servers | ✅ passed | `src/mcp/tools/diagnose.ts:440-473` (`handleDiagnoseScan`); `src/utils/issue-classifier.ts:43-117` (`classifyIssues` partitions critical/high/info); 2-call enumeration `Promise.all([fetchServers, fetchResources])` at `diagnose.ts:444-447` | `src/mcp/tools/diagnose.test.ts` scan-branch tests (8 cases per 03-04 SUMMARY incl. "enumerates fleet with exactly 2 HTTP calls" + D-14 invariants + pagination meta); `tests/integration/diagnose-flow.test.ts:164` (critical=1, high=1, info=1, _meta.total=3) |
| SC-4 | Get/diagnose responses include follow-up action hints (e.g. "View logs", "Restart", "Deploy") | ✅ passed | `src/utils/diagnose-hints.ts:30-130` (`generateHints` returns structured `FollowUpHint[]`); `FollowUpHint` interface `diagnose-hints.ts:1-7` (tool/action/args/label/available_in_phase); retrofit in `src/mcp/tools/application.ts:59-66`, `src/mcp/tools/service.ts:59-66`, `src/mcp/tools/database.ts:59-66`; diagnose handlers attach hints at `diagnose.ts:339-344` (app), `:428-432` (server), `:452-457` (scan via `projectScanIssue`) | `src/mcp/tools/diagnose-hints.test.ts` (6 scenario cases); `src/mcp/tools/application.test.ts` (restart hint for unhealthy); `src/mcp/tools/service.test.ts` (restart hint); `src/mcp/tools/database.test.ts` (start hint for stopped); `tests/integration/diagnose-flow.test.ts:182,196,211` (OUT-06 integration assertions) |

---

## 2. Requirement Traceability

| Req-ID | Requirement (REQUIREMENTS.md) | Plan frontmatter `requirements:` | SUMMARY claim | Code cross-check | Status |
|--------|-------------------------------|-----------------------------------|---------------|------------------|--------|
| SYS-03 | Global Issue-Scan (unhealthy apps/DBs/services, unreachable servers) | `03-01-PLAN.md:23-27` (foundation); `03-04-PLAN.md:14-15` (vertical slice); `03-06-PLAN.md:16-20` (integration) | `03-01-SUMMARY.md:61` ✅; `03-04-SUMMARY.md:42` ✅; `03-06-SUMMARY.md:42-45` ✅ | `src/mcp/tools/diagnose.ts:440-473` (scan handler); `src/utils/issue-classifier.ts:43-117` (classifier); `tests/integration/diagnose-flow.test.ts:164` (integration) | ✅ traced |
| SYS-04 | App-Diagnose per UUID/Name/Domain (Status, Health, Env-Count, recent deployments) | `03-01-PLAN.md:23-27` (foundation); `03-02-PLAN.md:13-14` (vertical slice); `03-06-PLAN.md:16-20` | `03-01-SUMMARY.md:62` ✅; `03-02-SUMMARY.md:44` ✅; `03-06-SUMMARY.md:42-45` ✅ | `src/mcp/tools/diagnose.ts:264-350` (app handler); `src/utils/projections.ts:255-317` (D-05 projector); `src/mcp/server.ts:162-191` (tool registration) | ✅ traced |
| SYS-05 | Server-Diagnose per UUID/Name/IP (Resources, Domains, Validation) | `03-01-PLAN.md:23-27` (foundation); `03-03-PLAN.md:12-13` (vertical slice); `03-06-PLAN.md:16-20` | `03-01-SUMMARY.md:63` ✅; `03-03-SUMMARY.md:42` ✅; `03-06-SUMMARY.md:42-45` ✅ | `src/mcp/tools/diagnose.ts:352-438` (server handler); `src/utils/projections.ts:319-359` (D-09 projector); `src/api/client.ts:188-228` (`fetchServer`, `fetchServerResources`, `fetchServerDomains`, `triggerServerValidate`) | ✅ traced |
| OUT-06 | Follow-up Action Hints nach Get-Operationen | `03-01-PLAN.md:23-27` (foundation: generator); `03-05-PLAN.md:17-18` (retrofit); `03-06-PLAN.md:16-20` | `03-01-SUMMARY.md:64` ✅; `03-05-SUMMARY.md:41` ✅; `03-06-SUMMARY.md:42-45` ✅ | `src/utils/diagnose-hints.ts:30-130` (`generateHints`); retrofit in `application.ts:16,59-71`, `service.ts:16,59-71`, `database.ts:16,59-71`; `tests/integration/diagnose-flow.test.ts:182-224` (3 get-assertions) | ✅ traced |

**REQUIREMENTS.md Traceability table rows 311-314** mark all four REQ-IDs as `Complete` for Phase 3 — consistent with SUMMARY claims and code cross-check.

---

## 3. Cross-Cutting Invariants

### D-05: All AppDiagnoseSummary fields present (incl. updated_at — no silent drops)

`src/utils/projections.ts:70-83` — `AppDiagnoseSummary` interface enumerates ALL D-05 fields:

```70:83:src/utils/projections.ts
export interface AppDiagnoseSummary {
  uuid: string;
  name: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  status: string;
  health_check_status: string;
  env_count: number | null;
  last_deployment: LastDeployment;
  recent_deployments: DeploymentSummary[];
  updated_at: string;
  hints: FollowUpHint[];
}
```

`updated_at` mapped at `projections.ts:293` with `String(raw.updated_at ?? new Date().toISOString())` fallback. Integration test `tests/integration/diagnose-flow.test.ts:138` asserts `typeof result.data.updated_at === 'string'`. ✅ no silent drops.

### D-06: Env values never serialized

- `projections.ts` exposes only `env_count: number | null` (line 78, 290) — no `envs`/`env_values`/`env` array field in `AppDiagnoseSummary` or `AppDiagnoseFull`.
- `diagnose.ts:319-322` handler reads only `.length` from `envsSettled.value`:
  ```319:322:src/mcp/tools/diagnose.ts
  const envCount =
    envsSettled.status === 'fulfilled' && Array.isArray(envsSettled.value)
      ? envsSettled.value.length
      : null;
  ```
- Grep for env-array leakage in `projections.ts` and `diagnose.ts` returns no `envs.`/`env_value`/`envValues` references.
- Test `diagnose.test.ts:401` ("never serializes env values — env_count is integer only") + `:411-412` (`typeof env_count === 'number'`, `Array.isArray(env_count) === false`). ✅ enforced.

### D-14: stopped/exited → info, not high

`src/utils/issue-classifier.ts:80-113`:

```80:113:src/utils/issue-classifier.ts
    if (statusIncludes(status, 'unhealthy')) {
      // ... push into high[]
    } else if (
      statusStartsWith(status, 'exited') ||
      statusStartsWith(status, 'stopped')
    ) {
      // ... push into info[]  (NOT high)
    }
```

Property-based test `src/utils/issue-classifier.test.ts` asserts: `exited:0` → `info`, `stopped` → `info`, `unhealthy` → `high`. Scan integration test `diagnose-flow.test.ts:174-176` asserts `info.length === 1` for `db-stopped` (status `exited:0`). ✅ enforced.

### D-15: Structured FollowUpHint objects (not strings)

`src/utils/diagnose-hints.ts:1-7`:

```1:7:src/utils/diagnose-hints.ts
export interface FollowUpHint {
  tool: string;
  action: string;
  args: Record<string, unknown>;
  label: string;
  available_in_phase: number;
}
```

`ScanIssue.hint: FollowUpHint` typed at `issue-classifier.ts:13` (not `string`). `projectScanIssue` at `projections.ts:361-370` passes the structured object through unchanged. ✅ enforced.

---

## 4. Test & Build State

### Test suite — GREEN

```
> vitest run --run --reporter=dot

 Test Files  21 passed (21)
      Tests  198 passed (198)
   Duration  8.45s
```

Including: `src/mcp/tools/diagnose.test.ts` (41 tests), `src/utils/issue-classifier.test.ts` (9), `src/utils/diagnose-hints.test.ts` (6), `src/utils/projections.test.ts` (19), `tests/integration/diagnose-flow.test.ts` (9), `src/mcp/tools/{application,service,database}.test.ts` (9+7+7), `src/mcp/server.test.ts` (6).

### Build — GREEN

```
> tsup
ESM dist/index.js     34.80 KB
ESM ⚡️ Build success in 15ms
```

### tsc --noEmit — PRE-EXISTING DEBT (exit 2, not a Phase-3 failure)

Pre-existing library/type-inference errors **documented as pre-existing debt per 03-VALIDATION.md** — not introduced or counted as Phase 3 failures:

1. **`src/api/client.ts:63,73` — ky `retryDelay` type incompatibility.** The `retryDelay` callback signature uses `{ options: { retry?: number } }` but ky's `FetchContext.options.retry` is `number | false | undefined`. Library typing drift; runtime behaviour unaffected. Predates Phase 3 (originated in Phase 1 retry client).
2. **`src/mcp/integration.test.ts:84,96,107,116,125,136` — Zod `discriminatedUnion` test arg inference.** Vitest runtime passes (esbuild strips types); tsc cannot narrow the union from partial test args. Predates Phase 3 (Phase 2 integration test pattern).

**Phase 3-introduced minor test-type debt** (not blocking — runtime tests green, tsup build green):

3. `src/utils/projections.test.ts:276-277` — accesses `full.deployments` and `full.raw_application` on `AppDiagnoseSummary | AppDiagnoseFull` union without narrowing to `AppDiagnoseFull`. Runtime correct (the `full` projection path returns `AppDiagnoseFull`); only the static type narrowing is missing. Introduced in 03-01 Task 4. **Recommended follow-up:** cast or narrow via `'raw_application' in full` guard. Does not block sign-off.

---

## 5. Server Registration Confirmation

`src/mcp/server.ts:162-191` registers `diagnose` tool after `resource`:

```162:191:src/mcp/server.ts
  server.registerTool(
    'diagnose',
    {
      description:
        'Synthesizes diagnose views for applications and servers, or runs a global fleet scan. Server action triggers validate with a non-blocking side-effect (D-10).',
      inputSchema: diagnoseToolSchema,
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handleDiagnoseAction(args, env);
      if (isDiagnoseErrorResult(result)) {
        return { ...result, structuredContent: { ok: false, error: result.structuredContent.error } };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: { ok: true, data: result.data, _meta: result._meta },
      };
    },
  );
```

`annotations: { openWorldHint: true }` — no `readOnlyHint` because server action triggers validate side-effect (D-10). Description documents `validate` + `side-effect`. `src/mcp/server.test.ts` (6 tests) asserts registration. ✅

---

## 6. Client Fetch Helpers (6 incl. fetchServer base)

`src/api/client.ts` exports all 6 helpers mandated by 03-01 Task 4:

| Helper | Endpoint | Signature | Line |
|--------|----------|-----------|------|
| `fetchApplicationEnvs` | `GET /applications/{uuid}/envs` | `(url, token, uuid, verifySsl?) => Promise<unknown[]>` | `client.ts:164-173` |
| `fetchAppDeployments` | `GET /deployments/applications/{uuid}` | `(url, token, uuid, verifySsl?) => Promise<unknown[]>` | `client.ts:175-186` |
| `fetchServer` | `GET /servers/{uuid}` | `(url, token, uuid, verifySsl?) => Promise<unknown>` | `client.ts:188-196` |
| `fetchServerResources` | `GET /servers/{uuid}/resources` | `(url, token, uuid, verifySsl?) => Promise<unknown[]>` | `client.ts:198-207` |
| `fetchServerDomains` | `GET /servers/{uuid}/domains` | `(url, token, uuid, verifySsl?) => Promise<unknown[]>` | `client.ts:209-218` |
| `triggerServerValidate` | `GET /servers/{uuid}/validate` | `(url, token, uuid, verifySsl?) => Promise<void>` | `client.ts:220-228` |

`fetchServer` base delivered in 03-01 (not conditionally added in 03-03) per plan decision. ✅

---

## 7. Gaps

**None blocking.**

Minor non-blocking debt:
- **G-1 (test-type debt, Phase 3-introduced):** `src/utils/projections.test.ts:276-277` accesses `AppDiagnoseFull`-only fields on the `AppDiagnoseSummary | AppDiagnoseFull` union without narrowing. Runtime tests green; tsup build green; `tsc --noEmit` flags it. Recommended fix: `if ('raw_application' in full) { ... }` guard or explicit cast. Does not block Phase 3 sign-off.
- **G-2 (pre-existing, not Phase 3):** `src/api/client.ts:63,73` ky `retryDelay` typing drift and `src/mcp/integration.test.ts:84,96,107,116,125,136` Zod union narrowing in test args. Documented in 03-VALIDATION.md as pre-existing debt. No Phase 3 ownership.

---

## 8. Human Verification (Manual-Only)

Per 03-VALIDATION.md `Manual-Only Verifications` table — surfaced there, not automated in vitest:

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| `trigger_validate: false` opt-out skips state mutation on real Coolify instance | SYS-05 / D-10 | Requires live Coolify + real validation endpoint | Point MCP client at staging Coolify, call `diagnose({ action: 'server', uuid, trigger_validate: false })`, confirm no validation record created on server | ⬜ pending manual |
| MCP stdio E2E handshake over `diagnose` tool via `createAndConnectServer` | SYS-03 / SYS-04 / SYS-05 / OUT-06 | vitest cannot reliably exercise stdio child-process handshake; P1 01-05 same pattern | Build `dist/index.js`, configure Cursor/Claude Desktop `mcp.json`, invoke `diagnose({action:"app"\|"server"\|"scan"})` and assert `structuredContent` envelope (ok/data/_meta or ok=false/error) per 03-06 acceptance criteria | ⬜ pending manual |

These map directly to the two rows in `03-VALIDATION.md:85-88`. No automated coverage gap — the handler-level integration test (`tests/integration/diagnose-flow.test.ts`) covers the same code paths through direct `handleDiagnoseAction` calls mirroring the P2 `src/mcp/integration.test.ts` pattern; only the stdio transport layer itself remains manual.

---

## 9. Final Verdict

| Dimension | Result |
|-----------|--------|
| Success criteria (4/4) | ✅ all passed with file:line evidence |
| Requirement traceability (SYS-03, SYS-04, SYS-05, OUT-06) | ✅ all four traced PLAN frontmatter → SUMMARY → code |
| Test suite | ✅ 198/198 passed (21 files) |
| Build (`npm run build`, tsup) | ✅ green |
| `tsc --noEmit` | ⚠️ pre-existing debt (client.ts retryDelay, integration.test.ts zod union) + Phase 3 minor test-type debt in `projections.test.ts:276-277` — documented, not blocking |
| D-05 field completeness (incl. updated_at) | ✅ enforced |
| D-06 env-value secrecy | ✅ enforced (env_count integer only, no array serialization) |
| D-14 severity rule (stopped/exited → info) | ✅ enforced |
| D-15 structured FollowUpHint schema | ✅ enforced |
| Gaps blocking sign-off | none |
| Manual-only items | 2 (stdio E2E + trigger_validate opt-out on live Coolify) — surfaced in 03-VALIDATION.md |

**Status: PASSED** — Phase 3 goal achieved. Ready for Phase 4 (App Deploy Lifecycle) upon manual stdio E2E confirmation in production target environment.

---

*Verification performed 2026-07-12 against commit history through 03-06-SUMMARY.md (`048bd09`).*
*Pre-existing tsc debt explicitly excluded per verification instructions; Phase 3-introduced minor test-type debt (G-1) documented as follow-up, not blocking.*

---

## 10. Gap Closure Re-Verification (03-07)

Phase 3 was re-verified after `03-07-PLAN.md` closed the five UAT gaps (tests 3, 4, 5, 6, 15) surfaced by live MCP testing. All five gaps shared a single root cause: `src/mcp/server.ts:61-71` `toolOutputSchema` did not declare `_meta`, so every read handler returning `structuredContent: { ok, data, _meta }` failed MCP SDK JSON Schema validation against live clients with `MCP error -32602: Structured content does not match the tool's output schema`.

### 10.1 Commits landing the fix

```
563f5f2 feat(03-07): extend toolOutputSchema with _meta fields
de7616f test(03-07): add MCP schema validation integration test
e92883c docs(03-07): heal UAT gaps with live MCP re-verification
9c6e8f3 docs(03-07): complete gap closure plan summary
```

All four commits present (`git log --oneline --grep="03-07"` returns 4 entries).

### 10.2 Plan 03-07 `must_haves.truths` — all satisfied

| # | Truth | Evidence | Status |
|---|-------|----------|--------|
| T1 | Live `diagnose({action:'scan'})` returns severity buckets (NOT -32602) — heals test 5 | `03-UAT.md` test 5 `verified_by`: "Live diagnose({action:'scan'}) → structuredContent.ok:true, data.critical.length=0, data.high.length=0, data.info.length=2, _meta.chars=847, _meta.page=1, _meta.total=2" | ✅ |
| T2 | Live `resource({action:'list'})` returns data — heals test 15 | `03-UAT.md` test 15 `verified_by`: "resource.list → structuredContent.ok:true, data.length=10" | ✅ |
| T3 | Live `system({action:'infrastructure_overview'})` returns data — heals test 15 | `03-UAT.md` test 15 `verified_by`: "system infrastructure_overview → servers.total=1, applications.total=13, projects.total=6" | ✅ |
| T4 | Live `docs({action:'search'})` returns data — heals test 15 | `03-UAT.md` test 15 `verified_by`: "docs.search(query:'deploy') → data.length=5" | ✅ |
| T5 | `diagnose({action:'app'})` and `diagnose({action:'server'})` success paths return D-05/D-09 structuredContent via live MCP — heals tests 3 and 4 | `03-UAT.md` test 3 `verified_by`: D-05 fields (uuid, hints[], updated_at, env_count); test 4 `verified_by`: D-09 fields (validation_started=true, resources_counts, domains.length=2, is_reachable=true) | ✅ |
| T6 | User story outcome met — agent can triage unhealthy deployments before acting — heals test 6 | `03-UAT.md` test 6 `verified_by`: combined live evidence from tests 3+4+5 (scan + app + server all structuredContent.ok:true via live MCP — triage outcome met without manual Coolify UI cross-reference) | ✅ |
| T7 | `toolOutputSchema.safeParse` on ReadResponse-shaped sample with `_meta` succeeds | `src/mcp/server.test.ts:14-29` "accepts ReadResponse-shaped structuredContent with _meta" — green | ✅ |
| T8 | Integration test fails on pre-fix code and passes after Task 1 fix | `tests/integration/mcp-schema-validation.test.ts:1-11` header documents pre-fix failure mode; `03-07-SUMMARY.md:121-126` records explicit revert-and-fail verification (test fails when `_meta` absent from `toJSONSchema(toolOutputSchema).properties`) | ✅ |
| T9 | `npm run build` exits 0 | tsup success, dist/index.js 35.04 KB | ✅ |
| T10 | `npm run test -- --run src/mcp/server.test.ts` exits 0 | 9 tests passed (3 new safeParse + 6 existing) | ✅ |
| T11 | `npm run test -- --run tests/integration/mcp-schema-validation.test.ts` exits 0 | 1 test passed (child-process MCP SDK JSON Schema parity) | ✅ |
| T12 | `03-UAT.md` Summary.issues = 0, Summary.passed = 42 | `03-UAT.md:300-307`: `total: 42, passed: 42, issues: 0, pending: 0, skipped: 0, blocked: 0` | ✅ |

### 10.3 Five UAT gaps healed with live MCP evidence (not just the word "pass")

| Test | Result | Live evidence captured in `verified_by` |
|------|--------|------------------------------------------|
| 3 (diagnose app) | pass | `structuredContent.ok:true`, `data.uuid='jdjb1z6iaj0dkib9vzwgr9nr'`, `data.name='clared-gotenberg'`, `data.status='running:healthy'`, `data.hints.length=0`, `data.updated_at='2026-07-12T20:29:58.000000Z'`, `data.env_count=0`, `_meta.chars=450` — captured against puzzlesstool.online post 03-07 schema fix |
| 4 (diagnose server) | pass | `structuredContent.ok:true`, `data.uuid='ozwpdpj5bgxax8v6gfs5lolv'`, `data.name='localhost'`, `data.validation_started=true`, `data.resources_counts.applications.total=13`, `data.resources_counts.databases.total=0`, `data.resources_counts.services.total=7`, `data.domains.length=2`, `data.is_reachable=true` |
| 5 (diagnose scan) | pass | `structuredContent.ok:true`, `data.critical.length=0`, `data.high.length=0`, `data.info.length=2`, `_meta.chars=847`, `_meta.page=1`, `_meta.total=2` |
| 6 (triage outcome) | pass | Combined live evidence from tests 3+4+5 — scan + app + server all `structuredContent.ok:true` via live MCP; triage outcome met without manual Coolify UI cross-reference |
| 15 (MCP stdio E2E) | pass | All six manifest read tools (resource.list, diagnose scan, system infrastructure_overview, docs.search, diagnose app, diagnose server) return `structuredContent.ok:true` with `_meta` — no -32602 |

Each `verified_by` field contains actual `structuredContent` field values captured from a live MCP call against `puzzlesstool.online` — not the literal string "pass".

### 10.4 Phase 2 regression documentation

`02-UAT.md:228-238` contains the `## Regressions Surfaced & Resolved in Phase 3` section. It documents: (1) the `toolOutputSchema` bug and the -32602 failure mode, (2) why Phase 2 UAT missed it (all 28 tests `source: automated`, no live MCP runtime check), (3) the fix via `03-07-PLAN.md`, (4) live re-verification of all six manifest read tools. The section explicitly references `03-07-PLAN.md`. Frontmatter `updated:` bumped to `2026-07-12T20:40:00Z`.

### 10.5 New integration test — `tests/integration/mcp-schema-validation.test.ts`

File exists, picked up by vitest config, and passes (1 test, 262ms). Test:

- Spawns `dist/index.js` as a child process with mock env (`COOLIFY_URL=http://127.0.0.1:<ephemeral>`, `COOLIFY_TOKEN=fake`, `COOLIFY_VERIFY_SSL=false`, `COOLIFY_MCP_LOG=error`)
- Starts a localhost HTTP server fixture mocking every Coolify API endpoint hit by the six read tools (servers, resources, projects, applications/{uuid}, applications/{uuid}/envs, deployments/applications/{uuid}, servers/{uuid}, servers/{uuid}/resources, servers/{uuid}/domains, servers/{uuid}/validate)
- Sends JSON-RPC `initialize` then `tools/call` for all six manifest read tools (diagnose scan, diagnose app, diagnose server, resource list, system infrastructure_overview, docs search)
- Asserts each response: `structuredContent.ok === true` OR `result.error.code !== -32602`
- Asserts at least 4 of 6 calls return `structuredContent.ok === true`
- Asserts `diagnose({action:'app'})` returns D-05 shape (`data.uuid`, `data.hints[]`)
- Asserts `diagnose({action:'server'})` returns D-09 shape (`data.validation_started` boolean, `data.resources_counts` object)
- Mirrors Cursor client JSON Schema parity: `z.toJSONSchema(toolOutputSchema).properties` must allowlist every key present in `structuredContent` (including `_meta`) — this is the layer that produces -32602 on live clients
- Pre-fix failure contract documented in header comment lines 1-11; executor verified via revert-and-fail (`03-07-SUMMARY.md:121-126`)

### 10.6 Full test suite + build re-verified green

```
> vitest run --run
 Test Files  22 passed (22)
      Tests  202 passed (202)
   Duration  8.44s
```

22 files / 202 tests (was 21 files / 198 tests pre-03-07; +1 file `mcp-schema-validation.test.ts`, +3 unit tests in `server.test.ts`, +1 integration test = +4 tests).

```
> tsup
ESM dist/index.js     35.04 KB
ESM ⚡️ Build success in 15ms
```

### 10.7 Original 4 success criteria — no regression

| SC | Pre-03-07 status | Post-03-07 status |
|----|------------------|-------------------|
| SC-1 (diagnose app) | passed | passed — D-05 fields now also confirmed via live MCP (test 3) |
| SC-2 (diagnose server) | passed | passed — D-09 fields now also confirmed via live MCP (test 4) |
| SC-3 (global scan) | passed | passed — severity buckets now also confirmed via live MCP (test 5) |
| SC-4 (follow-up hints) | passed | passed — hints[] still asserted in handler unit tests + integration + live MCP |

Requirement traceability (SYS-03, SYS-04, SYS-05, OUT-06) unchanged — all four still `Complete` in `REQUIREMENTS.md:311-314`. Cross-cutting invariants D-05/D-06/D-14/D-15 still enforced. Manual-only items from section 8 are now further de-risked by the child-process integration test (covers the stdio transport layer that was previously manual-only).

### 10.8 Gap Closure Verdict

| Dimension | Result |
|-----------|--------|
| Plan 03-07 `must_haves.truths` (12 entries) | ✅ all satisfied |
| 5 UAT gaps (tests 3, 4, 5, 6, 15) healed with live evidence | ✅ all `result: pass` with actual structuredContent field values in `verified_by` |
| `03-UAT.md` Summary 42/42, issues 0 | ✅ |
| `02-UAT.md` Regressions section referencing 03-07-PLAN.md | ✅ |
| New integration test exists and passes | ✅ `tests/integration/mcp-schema-validation.test.ts` |
| Full test suite green | ✅ 22 files / 202 tests |
| `npm run build` green | ✅ tsup success |
| Original 4 success criteria — no regression | ✅ all four still passed |

**Status: PASSED** — Phase 3 gap closure complete. The `toolOutputSchema` `_meta` fix healed all five Phase 3 UAT gaps and the three Phase 2 read-tool regressions (resource.list, system.infrastructure_overview, docs.search). A child-process integration test now guards the MCP SDK JSON Schema parity invariant that produced -32602 on live clients — preventing recurrence. Phase 3 is ready to close.

---

*Gap closure re-verification performed 2026-07-12 against commits `563f5f2`, `de7616f`, `e92883c`, `9c6e8f3`.*
