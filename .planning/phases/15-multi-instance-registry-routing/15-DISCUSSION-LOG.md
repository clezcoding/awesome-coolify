# Phase 15: Multi-Instance Registry & Routing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 15-Multi-Instance Registry & Routing
**Areas discussed:** Tool-Oberfläche Registry, Instanz-Identität & Schema, Routing-Priorität, Default/Active-Modell, Bootstrap ohne Credentials
**Mode:** `--batch` (German UI; recommendations marked)

---

## Tool-Oberfläche Registry

| Option | Description | Selected |
|--------|-------------|----------|
| Neues `instance`-Tool | Dedicated domain tool for registry CRUD | ✓ |
| Actions auf `meta` | Extend meta with credential registry | |
| Actions auf `system` | Mix registry into system/infra tool | |
| Minimal actions | list/get/add/update/delete/set-default | |
| Minimal + switch | Add session switch | |
| Minimal + verify on add | Optional live verify | ✓ |
| Minimal + switch + verify | Full set | |
| Registry tool without `instance` param | Local file only | ✓ |
| Registry needs `instance` param | Nonsensical for file CRUD | |
| confirm only on delete | Standard confirm gate | |
| confirm + protect default/last | Extra force for default/last | ✓ |
| No confirm | Unsafe | |

**User's choice:** `1a, 2c, 3a, 4b`
**Notes:** Matched recommendations.

---

## Instanz-Identität & Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Slug/name primary key | Agent-friendly `instance: "prod"` | ✓ |
| UUID + display name | Extra indirection | |
| Free-form normalized name | Loose | |
| name+url+token only | Minimal fields | |
| + type | self-hosted \| cloud | |
| + type + verifySsl | Full recommended schema | ✓ |
| Strict slug regex | `^[a-z][a-z0-9_-]{1,31}$` | ✓ |
| Loose labels | 1–64 no whitespace | |
| Arbitrary string | Unsafe for params | |
| Duplicate URLs allowed | Multi-token / teams | ✓ |
| Duplicate URLs forbidden | One URL one instance | |
| Warn but allow | Soft policy | |

**User's choice:** `1a, 2c, 3a, 4a`
**Notes:** Matched recommendations.

---

## Routing-Priorität

| Option | Description | Selected |
|--------|-------------|----------|
| Param → Env → default | Explicit agent intent first | ✓ |
| Env always first | Even over param | |
| Param → default; Env only if neither | Weak Env override | |
| Param wins silently over Env | No conflict error | ✓ |
| Param wins with warning | Meta noise | |
| Hard conflict error | Force clear Env | |
| Unknown name → hard error | No silent fallback | ✓ |
| Fallback to default | Dangerous | |
| Fallback to Env | Dangerous | |
| Partial Env → hard error | Both or neither | ✓ |
| Mix Env URL + registry token | Dangerous | |
| Ignore partial Env | Silent | |

**User's choice:** `1a, 2a, 3a, 4a`
**Notes:** Matched recommendations. Clarifies CTX-05: Env overrides registry default, but explicit `instance` param overrides Env for that call.

---

## Default/Active-Modell

| Option | Description | Selected |
|--------|-------------|----------|
| Field `default` | Persistent, matches set-default | ✓ |
| Field `active` | Sounds like session | |
| Both default + active | Rejected (no session switch) | |
| First add auto-default | Zero-friction bootstrap | ✓ |
| No default until set-default | Extra step | |
| Auto-default only without Env | Conditional | |
| set-default unknown → error | + list hint | ✓ |
| Auto stub create | Dangerous | |
| list + `_meta.envOverride` | Show Env active without fake row | ✓ |
| Registry only | Env invisible | |
| Synthetic `__env__` row | Fake instance | |

**User's choice:** `1a, 2a, 3a, 4a`
**Notes:** Matched recommendations. Consistent with rejecting session `switch` in Area 1.

---

## Bootstrap ohne Credentials

| Option | Description | Selected |
|--------|-------------|----------|
| Soft-start | instance.* + meta.version; others COOLIFY_NO_INSTANCE | ✓ |
| Hard-fail on start | Blocks registry bootstrap | |
| Soft only if file exists | Partial | |
| No Env→registry import | Manual add only | |
| Auto-import Env | Side effect | |
| Opt-in `instance.import-env` | Explicit migration | ✓ |
| verifySsl per instance; log global | Split concerns | ✓ |
| All per instance | Overkill for log | |
| All process-global | Ignores per-instance SSL | |
| COOLIFY_NO_INSTANCE | Clear recovery | ✓ |
| Legacy Zod env parse error | Poor UX | |

**User's choice:** `1a, 2c, 3a, 4a`
**Notes:** Matched recommendations.

---

## Claude's Discretion

- Exact unknown-instance error code naming
- Whether to cache Coolify clients by resolved instance key (must stay request-scoped credentials)
- Which Coolify endpoint to use for optional `add` verify

## Deferred Ideas

- Todos not folded: IDE skills (v3.1), manifest (P17), Cloud (P16), setup tool (v3.1), OpenAPI docs
- Session `switch` / sticky `active` rejected for this phase
