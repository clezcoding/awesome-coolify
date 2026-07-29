# Phase 26: Diagnose Logs & Incident DX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 26-Diagnose Logs & Incident DX
**Areas discussed:** diagnose.logs Oberfläche, Antwort-Envelope & Fehler, incident Prompt Flow, coolify-setup Skill + Capability
**Mode:** `--batch` (German UI, ★ recommendations marked)

---

## Gray area selection

User selected all four areas: `1,2,3,4`.

---

## diagnose.logs Oberfläche

| Option | Description | Selected |
|--------|-------------|----------|
| Action on `diagnose` tool | New `logs` action (deployment.logs pattern) | ✓ |
| Top-level `diagnose_logs` tool | Separate MCP tool | |
| Docs-only alias | No new action | |
| Runtime one-shot tail | Bounded via application.logs; no follow | ✓ |
| Embed follow | follow:true inside diagnose.logs | |
| Runtime + auto build | Also pull deployment.logs on build-fail triage | |
| Always full diagnose | Same as diagnose.app then logs | |
| Lighter triage | Status/issues only | |
| Mode full \| logs-only | Agent chooses | ✓ |
| Identifiers like diagnose.app + log params | query\|uuid\|name\|domain + lines/max_chars | ✓ |
| uuid-only | Hard uuid required | |
| + deployment_uuid | Also allow build path | ✓ (with XOR follow-up) |
| deployment_uuid → build only (XOR) | No runtime when set | ✓ |
| Both runtime + build | Always both | |
| Auto switch on triage | Heuristic | |
| Default mode full | When mode omitted | ✓ |
| Default logs-only | | |
| Mode required | No default | |

**User's choice:** `1a;2a;3c;4a und 4c` then `5a;6a`
**Notes:** Mode selectable was override of initial “always full” recommendation; XOR build path clarified in follow-up batch.

---

## Antwort-Envelope & Fehler

| Option | Description | Selected |
|--------|-------------|----------|
| Nested `{ diagnose?, logs }` | Clear split; omit diagnose on logs-only | ✓ |
| Flat merge | | |
| Compact summary string | | |
| Hard fail whole action | On diagnose fail | |
| Soft partial + error flag | Logs if fetchable | ✓ |
| Always try logs | Nested diagnose error only | |
| Empty logs soft OK + hint | Phase 24 parity | ✓ |
| Soft warning flag | | |
| Hard error on empty | | |
| Reuse application.logs defaults | lines/max_chars | ✓ (Claude pick — user: “smartest”) |
| Tighter diagnose defaults | | |
| lines always required | | |

**User's choice:** `1a;2b;3a;` + smartest for caps → `4a`
**Notes:** Soft partial on diagnose failure is intentional agent-DX choice.

---

## incident Prompt Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Primary diagnose.logs mode full | Replace separate app+logs | ✓ |
| Keep old order; optional shortcut | | |
| Both equal | | |
| deployment.logs on build suspicion / failed watch | Not always | ✓ |
| Always parallel | | |
| Hint only | | |
| Follow after one-shot when live needed | Check application_logs_follow | ✓ |
| Follow as default | | |
| Follow only in setup skill | | |
| Explicit app-only guardrail | No service/DB log steps | ✓ |
| Silent omission | | |
| Coming-later stub | Rejected | |

**User's choice:** `1a;2a;3a;4a`

---

## coolify-setup Skill + Capability

| Option | Description | Selected |
|--------|-------------|----------|
| New capability `diagnose_logs` | Soft flag, supported true | ✓ |
| No new flag | Catalog only | |
| Coarse `diagnose` flag | Rejected as too broad | |
| Short troubleshooting section | Cap check → diagnose.logs → follow/deployment.logs → skill links | ✓ |
| Long runbook | Duplicate incident | |
| Links only | | |
| Own section after setup/wire | | ✓ |
| Inline post-setup verify | | |
| Separate file under coolify-setup/ | | |
| Catalog + README EN/DE | Phase 24/25 parity | ✓ |
| Skill+prompt only | | |
| Full docs site page | Scope creep → deferred | |

**User's choice:** `1a;2a;3a;4a`

---

## Claude's Discretion

- Caps defaults when user asked for “smartest” variant → reuse `application.logs`
- Exact mode param naming, nested field shapes, soft-partial error field names, capability note strings, optional brief diagnose-prompt pointer, coverage row wording

## Deferred Ideas

- Service/DB diagnose.logs (SVC-04/05 / Coolify 4.2+)
- Follow embedded in diagnose.logs
- Full docs-site troubleshooting page
- Phase 27 branding/docs stale
