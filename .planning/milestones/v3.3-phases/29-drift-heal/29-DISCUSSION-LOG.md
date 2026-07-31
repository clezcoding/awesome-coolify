# Phase 29: Drift & Heal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 29-Drift & Heal
**Mode:** `--batch --auto` (batch overlay no-op under auto)
**Areas discussed:** Tool surface packaging, Manifest audit semantics, Env promote behavior, Remediation hint format

---

## Tool surface packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `manifest` + `application.envs:promote` | audit on manifest; promote on existing envs surface | ✓ |
| New `drift`/`heal` MCP tool | Separate composite tool for all drift actions | |
| Fold into `intelligence` | Add audit/promote actions to Phase 28 intelligence tool | |

**User's choice:** [auto] Extend `manifest` with `audit`; `envs:promote` on `application` (recommended default)
**Notes:** Matches Phase 17 dedicated manifest tool + existing envs CRUD; keeps `intelligence` for scorecard/graph/janitor.

---

## Manifest audit semantics

| Option | Description | Selected |
|--------|-------------|----------|
| New `audit` alongside existing `diff` | diff stays raw; audit adds findings + remediations | ✓ |
| Replace/enhance `diff` only | Change diff payload to include remediations | |
| Full Coolify config deep-diff | Compare every live field beyond manifest schema | |

**User's choice:** [auto] `manifest.audit` additive; keep `diff`; axes = manifest-stored fields only
**Notes:** DRIFT-03 requires fix hints; full deep-diff deferred as YAGNI.

---

## Env promote behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Preview default + confirm to apply | dry suggestion; `confirm: true` mutates target | ✓ |
| Always apply on call | Mutate target immediately | |
| Suggestions only (no apply path) | Never mutate; agent must call bulk-update manually | |

**User's choice:** [auto] Preview default + confirm gate; reuse bulk-update/create; conflict policy opt-in
**Notes:** SAF-01 / envs:sync parity; no cross-instance promote.

---

## Remediation hint format

| Option | Description | Selected |
|--------|-------------|----------|
| Structured hints (tool/action) | RECOVERY_HINTS / diagnose-style objects | ✓ |
| Free-text remediation paragraphs only | Natural language without action pointers | |
| Diff-only (no hints) | Raw structural delta | |

**User's choice:** [auto] Structured findings + remediation hints (recommended default)
**Notes:** Satisfies DRIFT-03; aligns Phase 26/28 envelopes.

---

## Claude's Discretion

- Zod field names, shared diff helper vs parallel fetch, promote `entries[]` shape for bulk-update, severity ordering, capability key names, optional audit scope filters, description/footer wording.

## Deferred Ideas

- Deploy Guard → Phase 30
- Playbooks / Log Brain / Smart Recipes → Phase 31
- Cross-instance fan-out / env promote → CTX-10
- Full live config deep-diff beyond manifest fields
- ML anomaly detection
