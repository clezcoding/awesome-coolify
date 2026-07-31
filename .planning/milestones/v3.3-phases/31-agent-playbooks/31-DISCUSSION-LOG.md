# Phase 31: Agent Playbooks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-31
**Phase:** 31-Agent Playbooks
**Mode:** `--batch --auto` (batch overlay no-op under auto)
**Areas discussed:** Log Brain packaging, Log Brain pattern scope, Ops Playbook prompts, Smart Recipes packaging

---

## Log Brain packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `diagnose` with `analyze` | Triage-adjacent to `diagnose.logs`; keep logs raw | ✓ |
| New top-level `log-brain` tool | Separate catalog surface | |
| Fold into `intelligence` | Fleet scorecard tool owns log patterns | |

**User's choice:** [auto] Extend `diagnose` with `analyze` (recommended default)
**Notes:** Mirrors Phase 29 “extend existing tool when capability belongs there”; `intelligence` stays scorecard/graph/janitor.

---

## Log Brain pattern scope

| Option | Description | Selected |
|--------|-------------|----------|
| App runtime + optional build; 4 named rules; no ML | BRAIN-01 set; v3.4 for service/DB | ✓ |
| Runtime + build equally weighted always | Always dual-source | |
| Include service/DB log stubs | Stub absent endpoints | |

**User's choice:** [auto] App runtime primary; optional build when `deployment_uuid`; four named patterns; no ML; no stubs
**Notes:** Spike mandate — omit absent endpoints.

---

## Ops Playbook prompts

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade `incident` + add `rollback` + `maintenance-window` | Parameterized prompts; compose atomics | ✓ |
| New prompt names only (replace `incident`) | Break existing prompt consumers | |
| Executable playbook-runner tool | Auto-run multi-step mutations | |

**User's choice:** [auto] Upgrade `incident` + add `rollback` + `maintenance-window`; prompts only; SAF confirm on rollback
**Notes:** PLAY-01/02; no duplicate API clients.

---

## Smart Recipes packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `recipe` with `recommend` | Live `list-types`; advisory plan | ✓ |
| New top-level `smart-recipe` tool | Extra catalog surface | |
| Prompt-only recommendation | No structured tool payload | |

**User's choice:** [auto] `recipe.recommend` from live catalog; advisory; no hardcoded YAML SoT
**Notes:** SREC-01/02; high-confidence catalog matches over aggressive fuzzy.

---

## Claude's Discretion

Exact Zod fields, pattern regexes, prompt arg schemas, NL→catalog scoring within D-15, capability key names, whether to extract `log-patterns` util.

## Deferred Ideas

- Service/DB logs → v3.4
- Cross-instance fan-out → CTX-10
- ML anomaly detection → out of scope
- Auto-execute playbooks without confirm → out of scope
