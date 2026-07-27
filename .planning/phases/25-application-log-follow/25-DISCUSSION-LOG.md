# Phase 25: Application Log Follow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 25-Application Log Follow
**Mode:** `--batch` (German UI, recommendations marked ★)
**Areas discussed:** Follow-Oberfläche, Stop-/Terminal-Bedingungen, Delta- & Response-Vertrag, Poll-Defaults & Params, Capability-Flag, Docs-Scope Phase 25

---

## Follow-Oberfläche

| Option | Description | Selected |
|--------|-------------|----------|
| 1a follow:true on application.logs | Param on existing action | ✓ |
| 1b New action (logs_follow/follow) | Separate action | |
| 1c Hybrid | Alias + canonical action | |
| 2a Reject follow+deployment_uuid | COOLIFY_422 | ✓ |
| 2b Ignore follow, one-shot build | | |
| 2c Allow poll build logs | | |
| 3a One-shot unchanged without follow | OBS-03 | ✓ |
| 3b Change defaults without follow | | |
| 4a Catalog capability note only | | |
| 4b No capability text | | |
| 4c Both catalog + flag | | ✓ |

**User's choice:** 1a, 2a, 3a, 4c
**Notes:** Matches OBS-02 wording; ★ recommendations accepted.

---

## Stop-/Terminal-Bedingungen

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Timeout only | | |
| 1b Timeout OR idle | | ✓ |
| 1c Timeout OR app terminal status | Extra status polls | |
| 2a Idle default 30s | ★ was 30s | |
| 2b Idle default 60s | | ✓ |
| 2c Idle only if agent sets | | |
| 3a Hard stop + partial on API error | | ✓ |
| 3b Retry 5xx until timeout | | |
| 3c Soft continue, error at end | | |
| 4a until/regex out of scope | | ✓ |
| 4b Optional until | | |

**User's choice:** 1b, 2b, 3a, 4a
**Notes:** User chose 60s idle over ★ 30s recommendation.

---

## Delta- & Response-Vertrag

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Single aggregate (deduped) | | ✓ |
| 1b Last poll snapshot only | | |
| 1c Chunked MCP streaming | | |
| 2a Timeout: soft body + error flag | Phase 21 parity | ✓ |
| 2b Soft success only | | |
| 2c Hard error no body | | |
| 3a Idle: soft success + stopped_reason | | ✓ |
| 3b Idle same as timeout error | | |
| 4a Aggregate max_chars | | ✓ |
| 4b Per-poll only | | |
| 4c Both | | |

**User's choice:** 1a, 2a, 3a, 4a
**Notes:** ★ recommendations accepted.

---

## Poll-Defaults & Params

| Option | Description | Selected |
|--------|-------------|----------|
| 1a timeout default 300s | Watch parity | |
| 1b timeout default 120s | | ✓ |
| 1c timeout default 60s | | |
| 2a timeout + min/max_interval + idle_timeout | | ✓ |
| 2b timeout + idle_timeout only | | |
| 2c timeout only | | |
| 3a Watch parity backoff 3–30s | | ✓ |
| 3b Fixed 5s | | |
| 3c Fixed 2s | | |
| 4a lines per poll (default 100) | | ✓ |
| 4b Ignore lines fixed 100 | | |
| 4c Higher default lines 200 | | |

**User's choice:** 1b, 2a, 3a, 4a
**Notes:** User chose 120s timeout over ★ 300s recommendation.

---

## Capability-Flag

| Option | Description | Selected |
|--------|-------------|----------|
| 1a New application_logs_follow | | ✓ |
| 1b No new flag under application_logs | | |
| 1c Note only on application_logs | | |
| 2a supported true as MCP feature | | ✓ |
| 2b Gate on OpenAPI stream | Would be always false | |
| 3a Soft guidance | Phase 24 D-04 | ✓ |
| 3b Hard block | | |

**User's choice:** 1a, 2a, 3a
**Notes:** ★ recommendations accepted. system.version tests expecting exactly four keys must expand.

---

## Docs-Scope Phase 25

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Catalog + tool desc + short README EN/DE | | ✓ |
| 1b Also rewrite incident prompt now | | |
| 1c Catalog only | | |
| 2a Leave incident for Phase 26 | | ✓ |
| 2b One-sentence teaser in incident | | |
| 3a Update coverage map for OBS-02 | | ✓ |
| 3b Skip coverage | | |

**User's choice:** 1a, 2a, 3a
**Notes:** ★ recommendations accepted.

---

## Claude's Discretion

- Exact default `max_chars` for follow aggregate
- Envelope field names beyond `stopped_reason` / dual-signal
- Dedup algorithm
- Reuse vs sibling of `deploy-watch-poll`
- Capability `note` / `coolify_min_version` strings
- Schema wiring so absent `follow` keeps one-shot identical

## Deferred Ideas

- App-status terminal poll as follow stop
- until/regex stop pattern
- MCP chunked streaming for follow
- incident prompt + diagnose.logs docs (Phase 26)
- Service/DB log follow (v3.3)
