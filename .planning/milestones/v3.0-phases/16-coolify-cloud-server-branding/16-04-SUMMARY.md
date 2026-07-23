---
phase: 16-coolify-cloud-server-branding
plan: 04
subsystem: docs
tags: [coolify-cloud, i18n, readme, conventions, mcp-icons, cursor, d-09]

requires:
  - phase: 16-01
    provides: COOLIFY_CLOUD_FORBIDDEN / COOLIFY_CLOUD_UNSUPPORTED error codes referenced in cloud docs
  - phase: 16-02
    provides: instance.cloud-info action documented in topic docs
  - phase: 16-03
    provides: serverInfo.icons + title/description/websiteUrl wired in McpServer constructor
provides:
  - docs/en/cloud.md and docs/de/cloud.md — Coolify Cloud setup, smoke test, known limits, error codes
  - README.md / README.de.md — ≤15-line Coolify Cloud quick overview linking to topic docs
  - .planning/codebase/CONVENTIONS.md — single-repo model (D-07 dual-repo retired)
  - docs/assets/cursor-icon-verify.md + .png — D-09 documented Cursor client limitation with evidence
affects: [16-verify-work, phase-17]

tech-stack:
  added: []
  patterns:
    - "Topic docs own Cloud depth; README stays quick overview + links (D-11)"
    - "D-09 verify gate accepts documented client limitation when Cursor UI skips custom MCP icons"

key-files:
  created:
    - docs/en/cloud.md
    - docs/de/cloud.md
    - docs/assets/cursor-icon-verify.md
    - docs/assets/cursor-icon-verify.png
  modified:
    - README.md
    - README.de.md
    - .planning/codebase/CONVENTIONS.md

key-decisions:
  - "D-09 outcome: documented client limitation — server emits serverInfo.icons; Cursor MCP list shows generic A fallback (not Hex Robot)"
  - "CONVENTIONS Repository Model rewritten to single public repo clezcoding/awesome-coolify per D-07"

patterns-established:
  - "First topic doc split: docs/en|de/cloud.md with README quick links only (D-11 first topic)"
  - "Icon verify artifacts: md + png in docs/assets/ when Cursor UI limitation blocks PASS"

requirements-completed: [CLD-03]

coverage:
  - id: D1
    description: "docs/en/cloud.md and docs/de/cloud.md with setup, smoke, limits, error codes"
    requirement: CLD-03
    verification:
      - kind: other
        ref: "grep app.coolify.io COOLIFY_CLOUD_FORBIDDEN cloud-info docs/en/cloud.md docs/de/cloud.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "README EN/DE Coolify Cloud quick overview sections linking to topic docs"
    requirement: CLD-03
    verification:
      - kind: other
        ref: "grep 'Coolify Cloud' docs/en/cloud.md docs/de/cloud.md README.md README.de.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "CONVENTIONS.md Repository Model single-repo; dual-repo sync retired"
    requirement: CLD-03
    verification:
      - kind: other
        ref: "grep -qi single .planning/codebase/CONVENTIONS.md"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-09 Cursor MCP list icon verify — documented client limitation (not icon PASS)"
    requirement: CLD-03
    verification:
      - kind: manual_procedural
        ref: "docs/assets/cursor-icon-verify.md + cursor-icon-verify.png"
        status: pass
    human_judgment: true
    rationale: "Human verified Cursor UI; custom icon does not render despite serverInfo.icons + jsDelivr 200 — acceptable documented limitation per RESEARCH Pitfall 2"

duration: 8min
completed: 2026-07-22
status: complete
---

# Phase 16 Plan 04: Coolify Cloud Docs + D-09 Verify Summary

**EN/DE Cloud-Topic-Docs, README-Quicklinks, Single-Repo-CONVENTIONS — D-09 als dokumentierte Cursor-Client-Limitation (kein Icon-PASS)**

## Performance

- **Duration:** 8 min (checkpoint resume; Tasks 1–2 prior session)
- **Started:** 2026-07-22T02:11:14Z
- **Completed:** 2026-07-22T02:12:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `docs/en/cloud.md` + `docs/de/cloud.md` — Setup (instance.add / import-env), Smoke (cloud-info → system → meta → resource), Known limits, Error codes (D-10/D-12/D-13)
- `README.md` + `README.de.md` — `## ☁️ Coolify Cloud` quick overview (≤15 lines) mit Links zu Topic-Docs (D-11)
- `.planning/codebase/CONVENTIONS.md` — Repository Model auf Single-Repo umgestellt; `sync-public-repo.sh` / dual-remote retired (D-07)
- **D-09:** `docs/assets/cursor-icon-verify.md` + `.png` — Server sendet `serverInfo.icons` korrekt; jsDelivr PNG HTTP 200; Cursor zeigt generisches **A**-Fallback statt Hex Robot — **documented client limitation**, kein Icon-PASS

## Task Commits

1. **Task 1: Create docs/en/cloud.md + docs/de/cloud.md** - `fdb917a` (feat)
2. **Task 2: README Cloud overview + CONVENTIONS dual-repo cleanup** - `a00bfe2` (feat)
3. **Task 3: D-09 Cursor MCP icon verify gate** - `0131fb8` (docs)

**Plan metadata:** `999b525` (docs: complete plan)

## Files Created/Modified

- `docs/en/cloud.md` — EN Cloud setup/smoke/limits/errors topic doc
- `docs/de/cloud.md` — DE parity translation
- `README.md` — Cloud quick section + TOC anchor
- `README.de.md` — DE Cloud quick section + TOC anchor
- `.planning/codebase/CONVENTIONS.md` — single-repo statement
- `docs/assets/cursor-icon-verify.md` — D-09 evidence write-up (initialize JSON, CDN, forum refs)
- `docs/assets/cursor-icon-verify.png` — Cursor MCP list screenshot (A fallback)

## Decisions Made

- D-09 closed as **documented client limitation** — branding metadata ships server-side (16-03); Cursor list icon rendering blocked by host UI until Cursor support lands
- Cloud topic depth stays in `docs/*/cloud.md`; README remains quick overview only (D-11)

## Deviations from Plan

None - plan executed exactly as written. D-09 alternate acceptance path (documented limitation) used per plan acceptance criteria and user checkpoint response (Option B).

## Issues Encountered

- Cursor MCP server list does not render custom `serverInfo.icons` despite correct handshake — documented with screenshot + initialize JSON per RESEARCH Pitfall 2 / Open Question 1 (RESOLVED)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 16 Plan 04 complete — CLD-03 satisfied via EN/DE Cloud docs + README links
- D-09 evidence on disk for verify-work / phase sign-off
- Phase 17 (Local Manifest & Sync) unblocked

## D-09 Verify Outcome

| Check | Result |
|-------|--------|
| `serverInfo.icons` in initialize | ✓ |
| jsDelivr PNG HTTP 200 | ✓ |
| Tools + title visible in Cursor | ✓ |
| Custom icon in Cursor MCP list | ✗ **client limitation** |

Evidence: [docs/assets/cursor-icon-verify.md](../../../docs/assets/cursor-icon-verify.md), [cursor-icon-verify.png](../../../docs/assets/cursor-icon-verify.png)

## Self-Check: PASSED

- FOUND: docs/assets/cursor-icon-verify.md
- FOUND: docs/assets/cursor-icon-verify.png
- FOUND: 16-04-SUMMARY.md
- FOUND: commits fdb917a, a00bfe2, 0131fb8

---
*Phase: 16-coolify-cloud-server-branding*
*Completed: 2026-07-22*
