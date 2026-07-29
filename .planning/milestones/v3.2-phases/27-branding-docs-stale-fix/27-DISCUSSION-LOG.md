# Phase 27: Branding & Docs Stale Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 27-Branding & Docs Stale Fix
**Mode:** `--batch` (German UI)
**Areas discussed:** Icon-Workaround-Strategie, Re-Verify-Gate, Docs-Stale-Scope, Fallback/Experiment-Budget

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| A Icon-Workaround | data URI / multi-size / CDN | ✓ |
| B Re-Verify-Gate | dist + npx paths | ✓ |
| C Docs-Stale-Scope | PROJECT/README vs broader | ✓ |
| D Fallback | stop vs keep experimenting | ✓ |

**User's choice:** alle

---

## Icon-Workaround-Strategie

| Option | Description | Selected |
|--------|-------------|----------|
| 1a | Nur data URI | |
| 1b | CDN + multi-size | |
| 1c | data URI **und** multi-size CDN | ✓ |
| 1d | Nur multi-size CDN | |
| 2a | CDN Primär; data URI zusätzlich | |
| 2b | data URI Primär; CDN optional | ✓ |
| 2c | Claude entscheidet | |
| 7a | CDN bleibt als zusätzliche Entries | |
| 7b | CDN komplett raus | |
| 7c | Claude entscheidet nach SDK/Cursor | ✓ |

**User's choice:** 1c, 2b, 7c
**Notes:** Claude recommended 1c + 2a + 7a; user took 1c + 2b + 7c (data URI primary intent, CDN fate discretionary).

---

## Re-Verify-Gate

| Option | Description | Selected |
|--------|-------------|----------|
| 3a | Nur Cursor dist/ | |
| 3b | dist/ **und** npx | ✓ |
| 3c | Nur initialize JSON, UI optional | |
| 4a | Phase fails if icon not visible | |
| 4b | Pass + Client-Limit + Evidence | ✓ |
| 4c | Pass ohne neuen Screenshot | |
| 10a | Update cursor-icon-verify.md | ✓ |
| 10b | Neue v3.2-only verify file | |
| 10c | Nur Phase SUMMARY/VERIFICATION | |

**User's choice:** 3b, 4b, 10a
**Notes:** Matches BRND-02 + Phase 16 D-09 outcome class; refresh existing verify doc.

---

## Docs-Stale-Scope

| Option | Description | Selected |
|--------|-------------|----------|
| 5a | Nur PROJECT + README EN/DE | |
| 5b | + server.ts/meta 0.1.0 drift | |
| 5c | Alle Docs-Treffer repo-weit | ✓ (then bounded) |
| 8a | Public docs only; no CHANGELOG/.planning rewrite | |
| 8b | Public docs + server version → package.json | ✓ |
| 8c | Include .planning history + CHANGELOG rewrite | |

**User's choice:** 5c then 8b
**Notes:** Batch-2 bounded 5c → public surfaces + version alignment; exclude CHANGELOG history and `.planning/` archives (D-09 in CONTEXT).

---

## Fallback / Experiment-Budget

| Option | Description | Selected |
|--------|-------------|----------|
| 6a | Ein Workaround-Versuch, dann D-09 | |
| 6b | Mehrere Experimente bis Icon sichtbar | ✓ (then bounded) |
| 6c | Icon-Code unverändert, nur Docs/Verify | |
| 9a | Max 2 Varianten dann Stop | |
| 9b | Max 4 Varianten dann Stop + dokumentieren | ✓ |
| 9c | Kein Limit bis Cursor rendert | |

**User's choice:** 6b then 9b
**Notes:** Aggressive experimentation with hard stop at 4; phase still completable via 4b.

---

## Claude's Discretion

- Exact `icons[]` ordering and CDN retention after SDK/Cursor probes (7c / D-02)
- Multi-size set and data-URI embedding approach
- Exact four experiment variants within budget
- Whether only `server.ts` needs version sync vs tests asserting `0.1.0`

## Deferred Ideas

- Cursor IDE product fix for MCP icons
- CHANGELOG / `.planning/` historical narrative rewrites
- Service/DB log docs; full README→docs migration
