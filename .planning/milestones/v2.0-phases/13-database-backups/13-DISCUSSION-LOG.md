# Phase 13: Database Backups - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 13-Database Backups
**Mode:** `--auto --all` (autonomous selection; all gray areas)
**Areas discussed:** Tool surface, Schedule payload, Confirm gates, Trigger & history, Masking & reveal

---

## Tool surface & action names

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `database` with `backup:*` (recommended) | Mirror Phase 12 `envs:*` on existing domain tool | ✓ |
| New dedicated `backup` MCP tool | Separate tool for all backup ops | |
| Split read vs mutate tools | `database` read + `backup` mutate | |

**Auto choice:** Extend `database` with `backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, `backup:history`.
**Notes:** ROADMAP success criteria already name `database({ action: 'backup:…' })`.

---

## Schedule payload & S3 surface

| Option | Description | Selected |
|--------|-------------|----------|
| Curated OpenAPI fields (recommended) | frequency, enabled, save_s3, s3_storage_uuid, retention local/S3, timeout | ✓ |
| Minimal MVP (frequency + local retention only) | Defer S3 fields to later | |
| Full passthrough of API object | Agent supplies raw Coolify shape | |

**Auto choice:** Curated OpenAPI-aligned fields; named presets + cron for `frequency`; `save_s3` + `s3_storage_uuid` when S3 enabled.
**Notes:** Optional `backup_now` on create supported alongside dedicated `backup:now`.

---

## Confirm gates & destructive defaults

| Option | Description | Selected |
|--------|-------------|----------|
| confirm on delete only; delete_s3 default false (recommended) | SAF-01 parity; S3 purge requires explicit flag + confirm | ✓ |
| confirm on delete and backup:now | Treat immediate backup as destructive | |
| confirm on all mutations | Including create/update schedule | |

**Auto choice:** `backup:delete` requires `confirm: true`; `delete_s3` defaults false; execution delete out of scope.
**Notes:** BAK-04 explicitly tests delete without confirm → `COOLIFY_CONFIRM_REQUIRED`.

---

## Trigger & history semantics

| Option | Description | Selected |
|--------|-------------|----------|
| backup:now → PATCH backup_now:true (recommended) | Matches OpenAPI; no separate trigger route | ✓ |
| backup:now → POST new ephemeral schedule | Workaround if PATCH unavailable | |
| Merge history into backup:list | Single list action | |

**Auto choice:** Dedicated `backup:now` and `backup:history`; history via GET executions endpoint.
**Notes:** Researcher must verify live list response shape (OpenAPI GET list is stubbed).

---

## Masking, reveal & logging

| Option | Description | Selected |
|--------|-------------|----------|
| Mask S3 secrets; reveal opt-in + ask_human (recommended) | SAF-04 + Phase 12 D-15 continuity | ✓ |
| Never reveal backup credentials | Mask even with reveal:true | |
| Plaintext on create once | Show secrets only on create response | |

**Auto choice:** Mask credential fields by default; `reveal: true` opt-in with ask_human_reveal hint; redactSecrets in logs.

---

## Claude's Discretion

- Live API response shape for backup:list
- Curated backup:update allowlist detail
- Shared backup helper module vs inline handlers
- History pagination / output capping strategy

## Deferred Ideas

- Backup execution delete, restore/import, S3 destination CRUD — v2.x+
- Reviewed todos (Cloud MCP, skills, manifest, OpenAPI integration, setup tool) — not folded
