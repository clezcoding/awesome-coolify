---
phase: 16-coolify-cloud-server-branding
plan: 02
subsystem: api
tags: [coolify-cloud, instance-tool, cloud-info, static-discovery, vitest, mcp]

requires:
  - phase: 16-00
    provides: RED scaffolds in instance.test.ts for cloud-info action
  - phase: 16-01
    provides: isCloudUrl helper and cloud error codes (referenced indirectly via knownLimits)
provides:
  - instance.cloud-info local/static discovery action (CLD-01)
  - Three source paths — registry, env, infer — with D-16 fallback to app.coolify.io
  - setupHints, knownLimits, docsLink contract for agent discoverability
affects: [16-03, 16-04]

tech-stack:
  added: []
  patterns:
    - "cloud-info resolves credentials via InstanceManager.resolveCredentials — infer fallback only on COOLIFY_NO_INSTANCE"
    - "Static discovery — zero network calls; isCloud from inferInstanceType hostname heuristic"

key-files:
  created: []
  modified:
    - src/mcp/tools/instance.ts
    - src/mcp/tools/instance.test.ts
    - src/mcp/server.ts

key-decisions:
  - "cloud-info infer fallback catches COOLIFY_NO_INSTANCE only — unknown instance names still throw COOLIFY_INSTANCE_NOT_FOUND (D-17)"
  - "resolveEnv merges handler env param with process.env for source=env detection"

patterns-established:
  - "Static cloud-info action: buildReadResponse with isCloud/url/source/setupHints/knownLimits/docsLink — no createCoolifyClient"

requirements-completed: [CLD-01]

coverage:
  - id: D1
    description: "instanceActionSchema accepts cloud-info with optional instance param"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#instanceActionSchema accepts cloud-info action"
        status: pass
    human_judgment: false
  - id: D2
    description: "cloud-info env path returns source env and isCloud from hostname"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#cloud-info with env credentials returns isCloud false and source env"
        status: pass
    human_judgment: false
  - id: D3
    description: "cloud-info registry path with named instance returns source registry"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#cloud-info on registered cloud instance returns isCloud true and source registry"
        status: pass
    human_judgment: false
  - id: D4
    description: "cloud-info infer fallback to https://app.coolify.io when no creds"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#cloud-info with no registry or env infers app.coolify.io"
        status: pass
    human_judgment: false
  - id: D5
    description: "cloud-info response includes setupHints, knownLimits, docsLink"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#cloud-info response includes setupHints, knownLimits, and docsLink"
        status: pass
    human_judgment: false
  - id: D6
    description: "unknown instance name returns COOLIFY_INSTANCE_NOT_FOUND"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#cloud-info with unknown instance name returns COOLIFY_INSTANCE_NOT_FOUND"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-22
status: complete
---

# Phase 16 Plan 02: Cloud-Info Action Summary

**instance.cloud-info liefert lokale Cloud-Erkennung (registry/env/infer) mit setupHints, knownLimits und docsLink — ohne Live-API-Probe**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-22T01:37:38Z
- **Completed:** 2026-07-22T01:39:30Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `cloudInfoActionSchema` in discriminatedUnion + Handler-Branch in `instance.ts`
- Drei Source-Pfade: `registry` (expliziter Name), `env` (COOLIFY_URL+TOKEN), `infer` (Fallback `https://app.coolify.io`)
- Unbekannter Instanzname → `COOLIFY_INSTANCE_NOT_FOUND` via `resolveCredentials`
- Alle 7 Wave-0 `it.fails`-Scaffolds in `instance.test.ts` auf GREEN geflippt (24/24 pass)
- `instance`-Tool-Beschreibung in `server.ts` um `cloud-info` erweitert

## Task Commits

1. **Task 1: instance.ts — add cloud-info action schema + handler branch** - `356edd1` (feat)

**Plan metadata:** `507b84a` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/instance.ts` — `cloudInfoActionSchema`, `case 'cloud-info'` mit statischer Antwort
- `src/mcp/tools/instance.test.ts` — Wave-0-Scaffolds von `it.fails` auf `it` geflippt
- `src/mcp/server.ts` — Tool-Beschreibung um cloud-info ergänzt

## Decisions Made

- Infer-Fallback nur bei `COOLIFY_NO_INSTANCE` — nicht bei unbekanntem Instanznamen (Threat T-16-02-01)
- `resolveEnv` merged Handler-`env`-Param mit `process.env` für korrekte `source=env`-Erkennung in Tests

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: Wave 0 scaffolds from Plan 16-00 (`82b088b`)
- GREEN gate: `feat(16-02)` commit `356edd1` — all cloud-info scaffolds pass
- REFACTOR gate: N/A

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-03 kann McpServer-Branding-Metadaten in `server.ts` implementieren
- Plan 16-04 kann End-to-End-Verifikation und Docs-Parität abschließen
- `cloud-info` bereit für Agent-Discovery ohne Live-Coolify-Cloud-API

---
*Phase: 16-coolify-cloud-server-branding*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: `.planning/phases/16-coolify-cloud-server-branding/16-02-SUMMARY.md`
- FOUND: `src/mcp/tools/instance.ts`
- FOUND: `src/mcp/tools/instance.test.ts`
- FOUND: `src/mcp/server.ts`
- FOUND: commit `356edd1`
