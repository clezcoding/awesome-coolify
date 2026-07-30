# Phase 29: Drift & Heal - Research

**Researched:** 2026-07-30
**Domain:** Manifest drift audit + cross-environment env promotion on Coolify 4.1.x — composite MCP actions, no new REST endpoints
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Tool surface packaging
- **D-01:** Extend existing domain tool **`manifest`** with action **`audit`** — do **not** create a new `drift`/`heal` MCP tool and do **not** fold audit into `intelligence`. Manifest cache drift belongs on the manifest surface (Phase 17 D-01); `intelligence` stays scorecard/graph/janitor/cleanup. — **Reversibility:** costly — agent action catalog + habits.
- **D-02:** Env promotion ships as **`application` action `envs:promote`** (docs/requirements may say `env.promote`). Reuse existing envs list/create/update/bulk-update client paths — no parallel env client and no new top-level MCP tool. — **Reversibility:** costly — published action name.
- **D-03:** Keep existing **`manifest.diff`** as the raw non-destructive structural report. **`manifest.audit`** builds on the same live-vs-local comparison but adds severity-tagged findings + structured remediation steps (DRIFT-03). Do not redefine `diff` as audit. — **Reversibility:** costly — two agent-facing contracts.

#### Manifest audit (DRIFT-01 / DRIFT-03)
- **D-04:** `manifest.audit` compares local `.coolify/manifest.json` vs live Coolify inventory for the scoped instance (optional `instance` routing, Phase 15/17 parity). Minimum comparison axes: resource **presence by UUID**, **type**, **name**, **domains**, and **project/environment nesting** already stored in the manifest schema — not a full Coolify config dump of every API field. — **Reversibility:** costly — audit semantics agents rely on.
- **D-05:** Audit response includes **findings[]** with severity tags (`critical` | `high` | `info` parity with `diagnose.scan` / Phase 28 scorecard) and **structured remediation hints** naming the follow-up tool/action (e.g. `manifest.sync`, `manifest.upsert`, domain CRUD) — same envelope spirit as `RECOVERY_HINTS` / diagnose hints, not free-text-only. Raw diff summary may be included as supporting detail, never as the sole payload. — **Reversibility:** costly — envelope contract.
- **D-06:** Audit is **read-only / advisory**. It never mutates manifest or live Coolify state. Mutations stay on existing actions (`sync`/`upsert`/CRUD) with their own confirm rules. Soft partials when one live fetch fails (Phase 26/28 spirit) — return other findings with failure flags. — **Reversibility:** one-way for advisory-only contract (published safety).
- **D-07:** Missing local manifest → structured error + recovery hint pointing to `manifest.sync` / `manifest.upsert` (soft-start pattern); missing creds on audit → `COOLIFY_NO_INSTANCE` + hints (Phase 17 D-04). No mid-call auto-sync (Phase 17 D-15).

#### Env promote (DRIFT-02)
- **D-08:** `envs:promote` compares env vars between a **source environment** and a **target environment** for the same application (UUIDs/names resolved like existing envs actions). Output: keys only-in-source, only-in-target, value-mismatches (values redacted by default unless existing `reveal` policy applies), plus **promotion suggestions**. — **Reversibility:** costly — comparison contract.
- **D-09:** Default posture is **preview / dry suggestion** (`dry_run: true` default or explicit preview when confirm absent). Applying copies/updates into the target requires **`confirm: true`** (SAF-01 / `envs:sync` / Phase 10 parity). Prefer reusing `envs:bulk-update` / create helpers for the apply path — no silent overwrite storm. — **Reversibility:** one-way for confirm gate.
- **D-10:** Conflict policy on apply: **do not clobber target keys that already differ** unless caller opts in with an explicit conflict policy (mirror `envs:sync` `conflict_policy` spirit — exact enum names → research/planner). Never promote into a different application UUID without explicit target uuid. — **Reversibility:** costly — safety defaults.
- **D-11:** Cross-environment only within one Coolify instance per call — **no cross-instance env promote** (CTX-10 deferred). Optional `instance` routing param like other live application actions.

#### Cross-cutting (carry-forward, not re-opened)
- **D-12:** Single-instance scope per call via optional `instance` — no fan-out.
- **D-13:** Structured errors + recovery hints; soft partials for composite reads.
- **D-14:** No stub tools / no fake Coolify endpoints (spike mandate). Env promote uses existing env CRUD APIs only.
- **D-15:** Capability / catalog / README EN+DE updates follow Phase 24–26 parity when actions ship. Exact capability key names → Claude's discretion (e.g. `manifest_audit`, `envs_promote`).
- **D-16:** Do **not** auto-heal (auto-apply audit remediations or promote) without explicit confirm — Out of Scope “Auto-execute destructive cleanup without confirm” spirit applies to heal mutations.

### Claude's Discretion
- Exact Zod field names for audit findings, promote source/target params, conflict_policy enum.
- Whether audit reuses `diff` internals as a shared helper vs parallel fetch (prefer shared helper to avoid drift between diff and audit).
- Whether promote preview returns suggested `entries[]` ready for `envs:bulk-update`.
- Numeric/ordering of severity when multiple findings share a resource.
- Exact MCP tool description / safety footer wording for new actions.
- Placement of capability flags in `capabilities.ts` / `system.version`.
- Whether `manifest.audit` accepts optional project/environment scope filters.

### Deferred Ideas (OUT OF SCOPE)
- Deploy preflight risk score / rollback → Phase 30
- Log Brain patterns, ops playbooks, smart recipes → Phase 31
- Service/DB log tails → v3.4 (Coolify 4.2+)
- Cross-instance fan-out queries / cross-instance env promote → CTX-10
- ML/statistical anomaly detection → out of scope
- Full live config deep-diff beyond manifest-stored fields → out of phase (YAGNI)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRIFT-01 | Agent can run manifest audit comparing local `.coolify/manifest.json` vs live Coolify state with remediation steps | `manifest.audit` action reusing `fetchRemoteManifest` + new `buildManifestAuditFindings()`; findings with `FollowUpHint` remediation objects |
| DRIFT-02 | Agent can compare environment variables across environments and receive promotion suggestions (`env.promote`) | `application` `envs:promote` with `source_uuid` + `target_uuid`; reuse `fetchApplicationEnvs` + `diffEnvs` + `bulkUpdateEnvs`/`createEnv` apply path |
| DRIFT-03 | Audit and drift results include concrete fix hints, not raw diff only | `findings[].hint: FollowUpHint` on audit; `promotion_suggestions[].hint` on promote — raw diff/disposition as supporting `summary` only |
</phase_requirements>

## Summary

Phase 29 extends two **existing domain tools** — no new MCP tool surface, no new npm packages, no new Coolify REST endpoints. `manifest.audit` is a remediation-aware layer on top of the same live-vs-local manifest fetch path that powers `manifest.diff`/`sync`. `application.envs:promote` is a cross-app env comparison (source app UUID → target app UUID, typically different Coolify environments) built from existing `fetchApplicationEnvs`, `diffEnvs`, and `bulkUpdateEnvs`/`createEnv` client methods [VERIFIED: `docs/COVERAGE.md` env rows, `src/api/client.ts`].

The main implementation risk is **silent false negatives on audit** when `.coolify/manifest.json` is absent: `ManifestManager.load()` returns an empty manifest instead of erroring [VERIFIED: `src/utils/manifest.ts:100-104`]. Audit must gate on file existence before comparing (D-07). Second risk: **drift between diff and audit** if they duplicate fetch/compare logic — extract shared `fetchLiveManifestSnapshot()` and index builders used by `diff`, `sync`, and `audit` (CONTEXT discretion recommends shared helper).

Env promote is **not** a Coolify-native “promote” API — it is MCP orchestration comparing two application env lists and optionally applying via bulk-update/create [VERIFIED: spike-findings SKILL.md — no promote endpoint; `GET/PATCH /applications/{uuid}/envs` only]. Default `dry_run: true` + `conflict_policy: 'keep_remote'` on value mismatches mirrors `envs:sync` safety (D-09/D-10).

**Primary recommendation:** Add `audit` to `manifest.ts` with shared fetch/compare helpers; add `envs:promote` to `application.ts` reusing `env-shared.ts` masking + `validateEnvMutationConfirm`; register capability keys `manifest_audit` and `envs_promote`; Wave 0 `it.fails` scaffolds in co-located test files.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Manifest drift detection | API / Backend (MCP `manifest.audit`) | Coolify REST reads | Compares workspace file vs live inventory; file I/O in MCP layer |
| Manifest remediation hints | API / Backend (shared utils) | — | `FollowUpHint` envelope from `diagnose-hints.ts`; audit never mutates |
| Cross-env env comparison | API / Backend (MCP `application.envs:promote`) | Coolify REST | Two `GET /applications/{uuid}/envs` calls + in-memory diff |
| Env promotion apply | API / Backend (MCP handler) | `bulkUpdateEnvs` / `createEnv` | Confirm-gated writes to **target** app only |
| Env value redaction | API / Backend (`env-shared.ts`) | — | `maskEnvRecord` / `reveal` policy unchanged |
| Instance routing | API / Backend (`InstanceManager`) | — | Optional `instance` on live actions (D-12) |

## Project Constraints (from .cursor/rules/)

| Rule | Directive for Phase 29 |
|------|------------------------|
| spike-findings-awesome-coolify | **No stub tools** — promote apply uses only verified env CRUD/bulk endpoints |
| ponytail / honey | Minimum diff; extend `manifest.ts` / `application.ts`; extract `manifest-audit.ts` helper only if shared by diff+audit |
| gsd-ship-labels | N/A at research — applies at ship |
| graphify | Disabled in project config — do not depend on graphify |
| caveman | User-facing docs DE; RESEARCH.md English |
| context7 / wigolo | External doc lookup only; implementation truth is repo + OpenAPI fixture |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | Phase is internal MCP tool code | All primitives exist: `zod/v4`, Vitest ^4.1.10, existing API client |

**Existing modules to compose (do not replace):**

| Module | Role in Phase 29 |
|--------|-------------------|
| `src/mcp/tools/manifest.ts` | Add `audit` action; extract shared live fetch for diff/sync/audit |
| `src/utils/manifest.ts` | `ManifestManager.load()` + new `ManifestManager.exists()` for D-07 |
| `src/mcp/tools/application.ts` | Add `envs:promote` handler + schema |
| `src/mcp/tools/env-shared.ts` | `maskEnvRecord`, `validateEnvMutationConfirm`, `buildEnvBulkEntry` |
| `src/utils/env-parser.ts` | `diffEnvs`, `ConflictPolicy` type |
| `src/api/client.ts` | `fetchApplicationEnvs`, `bulkUpdateEnvs`, `createEnv` |
| `src/utils/diagnose-hints.ts` | `FollowUpHint` shape for remediation objects |
| `src/mcp/tools/intelligence.ts` | `ScorecardFinding` pattern — severity + `hint: FollowUpHint` |
| `src/utils/errors.ts` | `COOLIFY_NO_INSTANCE`, `COOLIFY_CONFIRM_REQUIRED`, `RECOVERY_HINTS` |
| `src/mcp/capabilities.ts` | Add `manifest_audit`, `envs_promote` keys |

### Supporting

| Module | When to Use |
|--------|-------------|
| `src/utils/manifest-audit.ts` (new, recommended) | `indexManifestResources()`, `buildManifestAuditFindings()`, `domainsEqual()` — keeps `manifest.ts` handler thin |
| `docs/coverage-map.yaml` | Add `manifest.audit` + `application.envs:promote` rows before `npm run openapi:coverage` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `drift` tool | `manifest.audit` | **Rejected (D-01)** — splits manifest surface |
| Fold audit into `intelligence` | `manifest.audit` | **Rejected (D-01)** — intelligence is live health, not workspace cache |
| `env.promote` top-level tool | `application.envs:promote` | **Rejected (D-02)** — env actions live on domain tools |
| Inline audit logic in handler | `manifest-audit.ts` | Inline OK for small phase; extract recommended if diff+audit share indexes |

**Installation:** None — no new packages.

**Version verification:** Vitest `4.1.10` [VERIFIED: `package.json` devDependencies]; Node `>=24` [VERIFIED: `package.json` engines].

## Package Legitimacy Audit

> Phase installs **no new external packages**. Audit skipped.

| Package | Verdict | Disposition |
|---------|---------|-------------|
| — | — | N/A |

**Packages removed due to SLOP verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Agent MCP call
        │
        ├──────────────────────────────┐
        ▼                              ▼
 manifest.audit                  application.envs:promote
 (read-only)                     (preview default / apply + confirm)
        │                              │
        ▼                              ▼
 ManifestManager.exists/load     resolve source_uuid + target_uuid
        │                              │
        ▼                              ├─ fetchApplicationEnvs(source)
 fetchLiveManifestSnapshot()           └─ fetchApplicationEnvs(target)
 (allSettled: resources,                      │
  projects, servers)                           ▼
        │                              diffEnvs(source → target)
        ▼                              mask values (reveal policy)
 buildManifestAuditFindings()                 │
        │                              ┌──────┴──────┐
        ▼                              ▼             ▼
 findings[] + hint:FollowUpHint    dry_run:true   confirm:true
 summary (merge report, optional)  suggestions[]  bulkUpdateEnvs /
                                   entries[]       createEnv (target)
        │
        ▼
 buildReadResponse (never writes manifest.json)
```

### Recommended Project Structure

```
src/
├── mcp/tools/
│   ├── manifest.ts           # + audit action; export/refactor shared fetch
│   ├── manifest.test.ts      # + audit it.fails → it() cases
│   ├── application.ts        # + envs:promote
│   └── application.test.ts   # + envs:promote cases
├── utils/
│   ├── manifest.ts           # + ManifestManager.exists()
│   └── manifest-audit.ts     # (new) index + findings builder
└── mcp/capabilities.ts       # + manifest_audit, envs_promote
```

### Pattern 1: Shared live manifest snapshot (diff / sync / audit)

**What:** Single function fetches and normalizes live state into `Manifest` shape; soft-partial on per-source failure for audit only.

**When to use:** Any live-vs-local manifest comparison.

**Example:**

```typescript
// Source: src/mcp/tools/manifest.ts (refactor target)
async function fetchLiveManifestSnapshot(
  creds: { url: string; token: string; verifySsl: boolean },
  options?: { softPartial?: boolean },
): Promise<{ manifest: Manifest; partial?: Record<string, { code: string; message: string }> }> {
  if (!options?.softPartial) {
    return { manifest: await fetchRemoteManifest(creds) };
  }
  const [resourcesR, projectsR, serversR] = await Promise.allSettled([
    fetchResources(creds.url, creds.token, creds.verifySsl),
    fetchProjects(creds.url, creds.token, creds.verifySsl),
    fetchServers(creds.url, creds.token, creds.verifySsl),
  ]);
  // ... build partial manifest from fulfilled; record failures for audit meta
}
```

`manifest.diff` / `sync` keep strict `Promise.all` behavior (unchanged contract). `manifest.audit` uses `softPartial: true` (D-06).

### Pattern 2: Manifest audit findings envelope (DRIFT-01 / DRIFT-03)

**What:** Field-level drift detection on manifest-stored axes only (D-04).

**Finding kinds and recommended severity:**

| Kind | Condition | Severity | Remediation hint action |
|------|-----------|----------|-------------------------|
| `local_orphan` | UUID in local, absent live | `high` | `manifest.sync` dry_run or `manifest.remove` |
| `remote_only` | UUID live, absent local | `info` | `manifest.sync` or `manifest.upsert` |
| `nesting_mismatch` | Same UUID, different project/env UUID | `critical` | `manifest.sync` (remote wins) |
| `type_mismatch` | Same UUID, different `type` | `critical` | `manifest.sync` + manual review |
| `name_drift` | Same UUID, different `name` | `info` | `manifest.sync` or `manifest.upsert` |
| `domain_drift` | Same UUID, `domains[]` differ (order-insensitive) | `high` | `application.update` / domain CRUD on resource tool |
| `empty_manifest` | File missing | N/A — error path | `manifest.sync` / `manifest.upsert` (D-07) |

**Response shape:**

```typescript
type ManifestAuditFinding = {
  severity: 'critical' | 'high' | 'info';
  kind: string;
  uuid: string;
  resource_type?: 'application' | 'service' | 'database';
  issue: string;
  local?: Record<string, unknown>;
  live?: Record<string, unknown>;
  hint: FollowUpHint; // tool/action/args/label/available_in_phase
};

// buildReadResponse data:
{
  severity: 'critical' | 'high' | 'info' | 'ok';
  findings: ManifestAuditFinding[];
  summary: {
    local_resource_count: number;
    live_resource_count: number;
    orphans_local: number;
    orphans_live: number;
    // optional: include merge report subset from buildReconciliationReport
  };
  partial?: Record<string, { code: string; message: string }>;
  diff_support?: ReturnType<typeof buildReconciliationReport>; // supporting detail only
}
```

Reuse `FollowUpHint` from `diagnose-hints.ts` [VERIFIED: `src/utils/diagnose-hints.ts:1-7`] — same shape as Phase 28 `ScorecardFinding.hint` [VERIFIED: `src/mcp/tools/intelligence.ts:61-69`].

**Domain comparison:** Compare `domains` as sorted sets (case-sensitive string equality) — `domainsFromApiResource()` already normalizes URLs vs fqdn [VERIFIED: `src/mcp/tools/manifest.ts:129-137`].

**Optional scope filter (discretion):** If added, filter indexed resources by `project_uuid` / `environment_uuid` before comparison — cheap post-index filter; omit in v1 if YAGNI.

### Pattern 3: `envs:promote` comparison + apply (DRIFT-02)

**What:** Compare env vars on **two application UUIDs** within one instance. In Coolify, each environment hosts a distinct application resource — promotion is **source app → target app**, not a single UUID spanning environments [VERIFIED: Coolify model — apps are per-environment resources; `resolveAppMutationUuid` does not filter by environment].

**Recommended schema params:**

| Param | Required | Default | Notes |
|-------|----------|---------|-------|
| `source_uuid` | yes | — | App in source environment |
| `target_uuid` | yes | — | App in target environment (D-10: explicit target) |
| `dry_run` | no | `true` | Preview suggestions (D-09) |
| `confirm` | when `dry_run: false` | — | `validateEnvMutationConfirm` |
| `conflict_policy` | on apply with mismatches | `'keep_remote'` | Same enum as `envs:sync`: `overwrite` \| `keep_remote` \| `abort` [VERIFIED: `src/utils/env-parser.ts:34`, `application.ts:743`] |
| `reveal` | no | `false` | `maskEnvRecord` + ask-human hint |
| `instance` | no | — | `parseWithInstanceRouting` if application tool already uses it for envs |

**Comparison buckets (D-08):**

| Bucket | `diffEnvs` mapping | Promote meaning |
|--------|-------------------|-----------------|
| `only_in_source` | `added` (source=local, target=remote) | Keys to create on target |
| `only_in_target` | `removed` | Informational — not deleted by promote |
| `value_mismatches` | `updated` | Conflicts — `keep_remote` skips unless `overwrite` |

**Preview response:**

```typescript
{
  dry_run: true,
  source_uuid: string,
  target_uuid: string,
  only_in_source: Array<{ key: string; value: '***' }>;
  only_in_target: Array<{ key: string; value: '***' }>;
  value_mismatches: Array<{ key: string; source_value: '***'; target_value: '***' }>;
  promotion_suggestions: Array<{
    key: string;
    action: 'create' | 'update';
    hint: FollowUpHint; // e.g. envs:promote confirm or envs:bulk-update
  }>;
  suggested_entries?: EnvBulkEntry[]; // discretion: ready for bulk-update on target
}
```

**Apply path (D-09/D-10/D-16):**

1. `dry_run: false` + `confirm: true` required.
2. Build `entries[]` from `only_in_source` (create) + `value_mismatches` where policy allows.
3. For `overwrite`: include mismatch keys in bulk payload.
4. For `keep_remote`: skip mismatch keys; still create `only_in_source` keys.
5. For `abort`: if any `value_mismatches`, throw `COOLIFY_CONFIRM_REQUIRED` with `conflict_policy_options` (mirror `validateSyncConflictPolicy` pattern [VERIFIED: `application.ts:2621-2643`]).
6. Prefer single `bulkUpdateEnvs` when all ops are updates; fan-out `createEnv` for new keys (existing sync pattern).
7. Never call delete on target for `only_in_target` keys.

**Cross-environment resolution:** Caller supplies both UUIDs. Optional convenience (discretion): accept `name` + `source_environment_uuid` + `target_environment_uuid` by filtering `fetchResources()` — only if unambiguous single match per env; otherwise `COOLIFY_AMBIGUOUS_MATCH`.

### Pattern 4: Missing manifest guard (D-07)

**What:** `ManifestManager.load()` returns empty manifest when file absent — audit must not treat that as “all remote_only”.

**Implementation:**

```typescript
// Add to ManifestManager in src/utils/manifest.ts
static exists(): boolean {
  return existsSync(manifestFilePath());
}

// audit handler:
if (!ManifestManager.exists()) {
  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: 'Local manifest not found at .coolify/manifest.json',
    recoveryHints: [
      'Run manifest.sync to populate the local manifest cache from live Coolify state.',
      'Or manifest.upsert to add resources manually.',
    ],
  });
}
```

Also reject empty `projects` + `servers` after load if file exists but is `{}`? **Recommend:** audit runs on empty valid file — findings will be `remote_only` only; distinguish from missing file via `exists()` only.

### Anti-Patterns to Avoid

- **Redefining `manifest.diff` as audit** — violates D-03; agents depend on raw merge report.
- **Auto-sync on audit** — violates D-07/D-16; audit is advisory only.
- **Promote without explicit `target_uuid`** — violates D-10.
- **Default `dry_run: false` on promote** — violates D-09; silent env writes.
- **Plaintext env values in promote preview** — violates SAF-04; use `maskEnvRecord`.
- **New Coolify “promote env” endpoint** — does not exist; do not stub (D-14).
- **Service/database `envs:promote`** — out of scope; DRIFT-02 names application cross-env promotion only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env value diff | Custom string compare | `diffEnvs()` in `env-parser.ts` | Handles added/updated/removed semantics |
| Env masking | Custom redaction | `maskEnvRecord()` in `env-shared.ts` | SAF-04 parity with envs:list/sync |
| Confirm gates | Ad-hoc throws | `validateEnvMutationConfirm()` | SAF-01 consistent envelope |
| Live manifest fetch | Duplicate fetch in audit only | Shared `fetchRemoteManifest` / snapshot helper | Prevents diff vs audit drift |
| Remediation objects | Free-text-only hints | `FollowUpHint` struct | DRIFT-03 + Phase 28 precedent |
| Conflict resolution | New enum | Reuse `ConflictPolicy` from env-parser | Agent already knows sync semantics |

**Key insight:** Phase 29 is **orchestration + envelopes** on existing primitives — the complexity is in correct comparison semantics and safety defaults, not new HTTP or parsing libraries.

## Common Pitfalls

### Pitfall 1: Empty manifest false negative
**What goes wrong:** Audit reports zero drift when no manifest file exists.  
**Why it happens:** `ManifestManager.load()` returns `emptyManifest()` silently.  
**How to avoid:** `ManifestManager.exists()` guard before audit (D-07).  
**Warning signs:** All findings are `remote_only` on fresh workspace with no `.coolify/` dir.

### Pitfall 2: diff/audit logic divergence
**What goes wrong:** `diff` shows orphans audit misses (or vice versa).  
**Why it happens:** Separate fetch or index code paths.  
**How to avoid:** Shared `fetchLiveManifestSnapshot` + `indexManifestResources`; audit adds field-level pass on top of same indexes.  
**Warning signs:** Unit test fixtures pass for one action, fail for the other.

### Pitfall 3: Promote overwrites production env vars
**What goes wrong:** Preview apply writes conflicting keys to target.  
**Why it happens:** Default `conflict_policy` missing or set to `overwrite`.  
**How to avoid:** Default `dry_run: true`; apply defaults `conflict_policy: 'keep_remote'`; require explicit `overwrite` opt-in (D-10).  
**Warning signs:** Tests lack `confirm:true` gate on apply path.

### Pitfall 4: Domain array false positives
**What goes wrong:** `domain_drift` fires when order differs but URLs identical.  
**Why it happens:** Naive `JSON.stringify(domains)` compare.  
**How to avoid:** Sort-copy before compare.  
**Warning signs:** Flaky audit tests with permuted `urls[]` from API.

### Pitfall 5: Audit fetch failure hides all findings
**What goes wrong:** Single `fetchProject` 500 fails entire audit.  
**Why it happens:** `fetchRemoteManifest` uses `Promise.all`.  
**How to avoid:** Audit-only `allSettled` path with `partial` meta (D-06); keep strict fetch for diff/sync.  
**Warning signs:** No `partial` key in audit response when one API call mocked to reject.

## Code Examples

### Manifest audit finding with remediation hint

```typescript
// Source: pattern from src/mcp/tools/intelligence.ts ScorecardFinding + diagnose-hints FollowUpHint
{
  severity: 'high',
  kind: 'local_orphan',
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  resource_type: 'application',
  issue: 'Resource exists in local manifest but not in live Coolify inventory',
  hint: {
    tool: 'manifest',
    action: 'sync',
    args: { dry_run: true, instance: 'prod' },
    label: 'Preview manifest sync to reconcile cache',
    available_in_phase: 17,
  },
}
```

### envs:promote preview (reuses diffEnvs)

```typescript
// Source: src/utils/env-parser.ts diffEnvs + src/mcp/tools/application.ts envs:sync masking
const [sourceEnvs, targetEnvs] = await Promise.all([
  fetchApplicationEnvs(env.COOLIFY_URL, env.COOLIFY_TOKEN, sourceUuid, env.COOLIFY_VERIFY_SSL),
  fetchApplicationEnvs(env.COOLIFY_URL, env.COOLIFY_TOKEN, targetUuid, env.COOLIFY_VERIFY_SSL),
]);
const sourceParsed = sourceEnvs.map((e) => ({ key: e.key, value: e.value }));
const diff = diffEnvs(sourceParsed, targetEnvs);
// only_in_source ← diff.added; only_in_target ← diff.removed; value_mismatches ← diff.updated (masked)
```

### Confirm gate on promote apply

```typescript
// Source: src/mcp/tools/env-shared.ts validateEnvMutationConfirm
if (!parsed.dry_run) {
  validateEnvMutationConfirm(parsed.confirm, 'envs:promote', targetUuid, 'application');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `manifest.diff` only | `manifest.audit` adds findings + hints | Phase 29 | Agents get actionable remediation, diff unchanged |
| Manual env copy between envs | `envs:promote` preview + confirm apply | Phase 29 | Cross-env promotion with SAF parity |
| Intelligence for all composites | Drift on manifest/application surfaces | Phase 29 (D-01) | Clear tool ownership |

**Deprecated/outdated:**
- Creating a `drift` or `heal` MCP tool — rejected in CONTEXT D-01.
- Folding manifest audit into `intelligence.scorecard` — rejected; different data sources (workspace file vs live health).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Coolify has no native env-promote API; two app UUIDs + env CRUD is correct model | Pattern 3 | Would need different apply path if Coolify adds promote endpoint |
| A2 | `conflict_policy` enum reuses `overwrite \| keep_remote \| abort` from envs:sync | Pattern 3 | Agent confusion if promote uses different names |
| A3 | Capability keys `manifest_audit` and `envs_promote` | Standard Stack | Low — D-15 leaves naming to discretion |
| A4 | Optional `project_uuid`/`environment_uuid` audit filters deferred to v1 unless planner adds | Pattern 2 | Low — full-instance audit satisfies D-04 minimum |

**If planner locks A2:** Document in README that promote `keep_remote` means “skip value mismatches, still add missing keys”.

## Open Questions

1. **Server entries in audit findings?**
   - What we know: `Manifest` includes `servers[]`; `fetchRemoteManifest` populates them.
   - What's unclear: D-04 lists resource axes only; servers may be optional stretch.
   - Recommendation: Include `servers` presence/name drift as `info` findings if cheap; otherwise defer — not required for DRIFT-01 minimum.

2. **Promote: bulk-only vs create+fallback?**
   - What we know: `bulkUpdateEnvs` updates existing keys; new keys may need `createEnv`.
   - Recommendation: Mirror `envs:sync` apply — create for `only_in_source`, bulk for updates; single code path via internal helper extracted from sync if already exists.

3. **`instance` field mismatch in manifest vs routed instance?**
   - What we know: Manifest schema has optional `instance` slug.
   - Recommendation: Emit `info` finding when `manifest.instance` set and differs from `audit` `instance` param — helps multi-instance workspaces.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | v26.5.0 | — |
| Vitest | Unit tests | ✓ | 4.1.10 | — |
| Coolify 4.1.x API | Live integration / UAT | ✓ (operator) | 4.1.2+ | Unit tests mock `api/client` |
| `.coolify/manifest.json` | manifest.audit | ✓ (workspace) | — | Structured error if missing (D-07) |

**Missing dependencies with no fallback:** none for unit-test execution.

**Missing dependencies with fallback:** Live Coolify optional — mocked client in tests per `TESTING.md`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/mcp/tools/manifest.test.ts -t audit -x` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRIFT-01 | audit returns findings with severity + hint | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t audit -x` | ❌ Wave 0 |
| DRIFT-01 | missing manifest → validation error + hints | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t "missing manifest" -x` | ❌ Wave 0 |
| DRIFT-01 | soft partial when live fetch fails | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t "partial" -x` | ❌ Wave 0 |
| DRIFT-03 | findings include FollowUpHint shape (not text-only) | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t findings -x` | ❌ Wave 0 |
| DRIFT-02 | promote preview buckets only_in_source/target/mismatches | unit | `npx vitest run src/mcp/tools/application.test.ts -t "envs:promote" -x` | ❌ Wave 0 |
| DRIFT-02 | promote apply requires confirm | unit | `npx vitest run src/mcp/tools/application.test.ts -t "promote apply" -x` | ❌ Wave 0 |
| DRIFT-02 | conflict_policy keep_remote skips mismatches | unit | `npx vitest run src/mcp/tools/application.test.ts -t "promote conflict" -x` | ❌ Wave 0 |
| D-03 | manifest.diff unchanged contract | unit | `npx vitest run src/mcp/tools/manifest.test.ts -t diff -x` | ✅ existing |
| D-15 | capability keys manifest_audit + envs_promote | unit | `npx vitest run src/mcp/tools/system.test.ts -t capabilities -x` | ❌ Wave 0 extend |

### Sampling Rate

- **Per task commit:** `npx vitest run src/mcp/tools/manifest.test.ts src/mcp/tools/application.test.ts -x`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `manifest.test.ts` — `it.fails` scaffolds: audit findings, missing manifest, partial fetch, domain_drift, nesting_mismatch
- [ ] `application.test.ts` — `it.fails` scaffolds: envs:promote preview, confirm gate, conflict_policy, masked values
- [ ] `system.test.ts` — extend capability count for `manifest_audit` + `envs_promote`
- [ ] `docs/coverage-map.yaml` — rows for new actions (regen COVERAGE.md in implementation plan)
- [ ] `ManifestManager.exists()` — small util addition with unit test in `manifest.test.ts` or `src/utils/manifest.test.ts` if exists

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | N/A — uses existing instance token routing |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | `instance` routing; explicit `source_uuid`/`target_uuid`; no cross-instance promote |
| V5 Input Validation | yes | Zod `createFlatActionSchema`; UUID params; `conflict_policy` enum |
| V6 Cryptography | no | N/A — no new crypto |

### Known Threat Patterns for Phase 29

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Env var exfiltration via promote preview | Information disclosure | `maskEnvRecord`; `reveal` requires human gate (SAF-04) |
| Unauthorized env overwrite on target | Tampering | `dry_run: true` default; `confirm: true` on apply; `keep_remote` default on conflicts |
| Wrong-instance audit/promote | Spoofing | `COOLIFY_NO_INSTANCE` + `instance` param; manifest `instance` mismatch finding |
| Audit-triggered auto-mutation | Elevation | Audit read-only (D-06/D-16); hints only, no side effects |

## Sources

### Primary (HIGH confidence)
- `src/mcp/tools/manifest.ts` — `fetchRemoteManifest`, `mergeManifests`, `diff`/`sync` handlers
- `src/mcp/tools/application.ts` — `envs:sync`, `conflict_policy`, `validateSyncConflictPolicy`
- `src/utils/env-parser.ts` — `diffEnvs`, `ConflictPolicy`
- `src/mcp/tools/intelligence.ts` — `ScorecardFinding` + soft partial `Promise.allSettled` pattern
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — no stub tools mandate
- `docs/COVERAGE.md` — env CRUD/bulk endpoint coverage

### Secondary (MEDIUM confidence)
- `.planning/phases/29-drift-heal/29-CONTEXT.md` — locked decisions D-01..D-16
- `.planning/phases/28-instance-intelligence/28-RESEARCH.md` — findings envelope precedent
- `.planning/milestones/v3.0-phases/17-local-manifest-sync/17-CONTEXT.md` — manifest cache semantics

### Tertiary (LOW confidence)
- None requiring validation — all critical paths verified in repo this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all modules exist
- Architecture: HIGH — patterns directly extend Phase 17 manifest + Phase 12 envs + Phase 28 findings envelope
- Pitfalls: HIGH — `ManifestManager.load()` empty-file behavior verified in source

**Research date:** 2026-07-30  
**Valid until:** 2026-08-30 (stable domain; env/manifest contracts change slowly)
