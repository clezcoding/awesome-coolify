# Phase 12: Environment Variables & Smart Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-20
**Phase:** 12-Environment Variables & Smart Sync
**Areas discussed:** Tool surface & action names, Smart Sync UX, Bulk scope service/DB, Delete gates & masking defaults

---

## Tool surface & action names

### Where do env actions live?

| Option | Description | Selected |
|--------|-------------|----------|
| Nested under application/service/database with `envs:*` | Matches roadmap wording | ✓ |
| Dedicated `env` MCP tool | Single entrypoint, breaks Phases 8–11 pattern | |
| Hybrid CRUD nested / sync-bulk only on application | Extra complexity | |

**User's choice:** Nested under existing tools
**Notes:** —

### Action naming schema?

| Option | Description | Selected |
|--------|-------------|----------|
| Colon-prefix `envs:*` | Roadmap / success criteria | ✓ |
| Underscore `env_*` | Breaks roadmap wording | |
| Flat `list_envs` / `create_env` | Inconsistent with roadmap | |

**User's choice:** `envs:*`
**Notes:** —

### Identity for update/delete/get?

| Option | Description | Selected |
|--------|-------------|----------|
| `env_uuid` primary + optional `key` lookup | Ambiguity → COOLIFY_AMBIGUOUS_MATCH | ✓ |
| `env_uuid` only | Forces list roundtrip always | |
| `key` only | Hides Coolify UUID model | |

**User's choice:** uuid + optional key
**Notes:** —

### Read actions?

| Option | Description | Selected |
|--------|-------------|----------|
| `envs:list` + `envs:get` on all three | Discovery before mutate/sync | ✓ |
| `envs:list` only | Less surface | |
| No read actions | Rely on parent get — risky | |

**User's choice:** list + get
**Notes:** —

---

## Smart Sync UX

### How does `.env` enter sync?

| Option | Description | Selected |
|--------|-------------|----------|
| XOR `env_file` \| `env_content` | Phase 11 compose XOR parity | ✓ |
| Path only | Breaks hosts without FS access | |
| Inline only | Token heavy / leak risk | |

**User's choice:** XOR
**Notes:** —

### Dry-run / preview?

| Option | Description | Selected |
|--------|-------------|----------|
| `dry_run: true` on `envs:sync` | Diff without writes | ✓ |
| Separate `envs:sync_preview` | More surface | |
| No dry-run | Riskier | |

**User's choice:** dry_run flag
**Notes:** —

### Prune missing remote keys?

| Option | Description | Selected |
|--------|-------------|----------|
| Default never; `prune:true` + `confirm:true` | Safe default; opt-in mirror | ✓ |
| Never prune / no flag | Manual deletes only | |
| `prune:true` without confirm | Dangerous | |

**User's choice:** prune + confirm
**Notes:** Diff always shows would-remove

### Value conflict policy?

| Option | Description | Selected |
|--------|-------------|----------|
| `conflicts[]` + `conflict_policy` after human | No auto-overwrite | ✓ |
| Whitelist `keys_to_update[]` | Stricter | |
| Claude discretion on details | — | |

**User's choice:** conflicts + conflict_policy (option 1 after freeform “user must be asked”)
**Notes:** User rejected local-wins auto-overwrite; human decides then agent retries with policy

---

## Bulk scope service/DB

### Where expose `envs:bulk-update`?

| Option | Description | Selected |
|--------|-------------|----------|
| All three tools | API exists; ENV-04 = minimum | ✓ |
| Application only | Strict requirements | |
| App + service | Half measure | |

**User's choice:** All three + always human confirmation
**Notes:** User added “bei allen 3 immer human confirmation”

### Confirm form for bulk?

| Option | Description | Selected |
|--------|-------------|----------|
| `confirm:true` required; no bulk-preview action | Same gate as delete | ✓ |
| Preview action + confirm | More surface | |
| Confirm only if batch > N | Inconsistent with “always” | |

**User's choice:** confirm only
**Notes:** —

### Where expose `envs:sync`?

| Option | Description | Selected |
|--------|-------------|----------|
| Application only | ENV-05 | ✓ |
| All three | Scope expansion | |
| App + service | Half measure | |

**User's choice:** Application only
**Notes:** —

### Sync apply confirm?

| Option | Description | Selected |
|--------|-------------|----------|
| Apply needs `confirm:true`; dry_run free | Consistent with bulk human gate | ✓ |
| Confirm only prune/conflicts | Partial | |
| Never confirm sync | Riskier | |

**User's choice:** confirm on apply
**Notes:** —

---

## Delete gates & masking defaults

### `envs:delete` confirm?

| Option | Description | Selected |
|--------|-------------|----------|
| `confirm:true` required | Destructive | ✓ |
| No confirm on single delete | Less friction | |
| Heuristic secret-name confirm | Fragile | |

**User's choice:** confirm required
**Notes:** —

### Masking / reveal?

| Option | Description | Selected |
|--------|-------------|----------|
| Always mask unless `reveal:true` after human OK + ask-human hint | SAF-04 + product policy | ✓ |
| Required `visibility` enum field | Harder schema | |
| Docs-only ask-human | Soft | |

**User's choice:** Option 1 after freeform “user should be asked masked vs revealed”
**Notes:** Agent must ask human before reveal; never auto-reveal

### Flag defaults?

| Option | Description | Selected |
|--------|-------------|----------|
| All flags default `false` | Predictable | ✓ |
| Heuristic multiline | Can mis-detect | |
| No defaults / required flags | High friction | |

**User's choice:** all false
**Notes:** —

### Create/update confirm?

| Option | Description | Selected |
|--------|-------------|----------|
| No confirm on create/update | Usable single-key edits | ✓ |
| Confirm every mutation | Too much friction | |
| Confirm update only | Inconsistent | |

**User's choice:** no confirm on create/update
**Notes:** Confirm remains for delete, bulk, sync-apply, prune

---

## Claude's Discretion

- `.env` parser edge cases
- Bulk vs fan-out fallback if API quirks
- Exact `conflicts[]` / disposition response shapes
- Shared helper extraction vs copy
- Per-resource flag support differences (e.g. `is_preview` on DB)

## Deferred Ideas

- Per-key conflict_policy map
- Sync on service/database
