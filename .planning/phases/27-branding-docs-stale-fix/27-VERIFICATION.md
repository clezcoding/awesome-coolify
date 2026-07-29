---
phase: 27-branding-docs-stale-fix
verified: 2026-07-28T23:50:58Z
status: passed
score: 3/3 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 27: Branding & Docs Stale Fix Verification Report

**Phase Goal:** MCP advertise icon workarounds and public docs reflect shipped npm `1.0.1` without stale pending-release wording
**Verified:** 2026-07-28T23:50:58Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | MCP `initialize` advertises icons via spec-compliant workarounds (data URI and/or multi-size PNG entries) (BRND-01) | ✓ VERIFIED | `buildMcpServerIcons()` returns 3 entries: data URI first + jsDelivr `favicon-32.png` + `mcp-icon-192.png`; wired via `icons: buildMcpServerIcons()` in `createAndConnectServer`; stdio dump from `dist/index.js` confirms `iconCount:3`, data URI prefix, both CDN URLs; tests green (`server-icons.test.ts`, branding block in `server.test.ts`) |
| 2 | Maintainer re-verify gate documents outcome for Cursor `dist/` and npm (`npx awesome-coolify-mcp`) paths; client limitation accepted if UI still omits custom icon (BRND-02) | ✓ VERIFIED | `docs/assets/cursor-icon-verify.md` has Path A (`dist/`) + Path B (`npx awesome-coolify-mcp@1.0.1`), UI observations (letter **"A"** fallback), initialize excerpts `version: 1.0.1` / `icons[]` length 3, V1 variant + D-03 stop, conclusion table with client-limitation pass (D-05). Single verify doc (D-06). Screenshot file present; metadata notes `_(screenshot pending)_` — allowed by plan OR clause |
| 3 | PROJECT.md and README EN/DE reflect npm `1.0.1` shipped state (no stale “pending Version Packages” wording) (DOC-01) | ✓ VERIFIED | PROJECT.md opener: `1.0.1 shipped`; no `pending Version Packages` in PROJECT/README EN/DE/`docs/{en,de}`/`docs/assets`; branding sections link `cursor-icon-verify.md` + dual-icon wording; `doc-version-parity.test.ts` + `docs-parity.test.ts` green; `readPackageVersion()` in `server.ts` (D-08) — dist dump `version: "1.0.1"` |

**Score:** 3/3 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `scripts/generate-mcp-icon-data.mjs` | PNG→base64 generator | ✓ VERIFIED | Build-time `readFileSync` of `docs/assets/mcp-icon-192.png` → writes `mcp-icon-data.ts` |
| `src/mcp/mcp-icon-data.ts` | `MCP_ICON_192_BASE64` | ✓ VERIFIED | Auto-generated constant (~42 KB); no runtime asset read |
| `src/mcp/server-icons.ts` | `buildMcpServerIcons()` | ✓ VERIFIED | Data URI first + 2 CDN entries; mimeType/sizes set |
| `src/mcp/server.ts` | icons + version wire-up | ✓ VERIFIED | `icons: buildMcpServerIcons()`, `version: readPackageVersion()` — no literal `0.1.0` |
| `package.json` build | pre-tsup icon generate | ✓ VERIFIED | `"build": "node scripts/generate-mcp-icon-data.mjs && tsup"` |
| `docs/assets/cursor-icon-verify.md` | BRND-02 verify record | ✓ VERIFIED | Path A/B, V1, conclusion table, curl CDN section |
| `docs/assets/cursor-icon-verify.png` | Screenshot asset | ✓ VERIFIED | Exists (34673 B); Phase 16-era blob; metadata still `screenshot pending` (plan-allowed) |
| `.planning/PROJECT.md` | 1.0.1 opener | ✓ VERIFIED | Opener + table align on 1.0.1 shipped |
| `README.md` / `README.de.md` | Dual-icon branding copy | ✓ VERIFIED | data URI + CDN + verify-doc link; docs-parity green |
| `src/mcp/server.test.ts` | Branding / D-08 assertions | ✓ VERIFIED | GREEN (no remaining `it.fails`) |
| `src/mcp/server-icons.test.ts` | Icon shape unit tests | ✓ VERIFIED | ≥3, data-first, both CDN URLs, mimeType |
| `tests/integration/doc-version-parity.test.ts` | DOC-01 gate | ✓ VERIFIED | Rejects pending Version Packages; requires 1.0.1 in opener |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `package.json` `build` | `scripts/generate-mcp-icon-data.mjs` | pre-tsup | ✓ WIRED | Script string includes generator before `tsup` |
| `buildMcpServerIcons` | `McpServer` constructor | `createAndConnectServer` | ✓ WIRED | `icons: buildMcpServerIcons()` at server.ts:804 |
| `readPackageVersion` | `McpServer` version | import `package-version.js` | ✓ WIRED | `version: readPackageVersion()` at server.ts:799 |
| `server-icons.ts` | `mcp-icon-data.ts` | `MCP_ICON_192_BASE64` | ✓ WIRED | Import + template data URI — no `readFileSync` of docs at runtime |
| `README` branding | `docs/assets/cursor-icon-verify.md` | markdown link | ✓ WIRED | EN L601 + DE L601 |
| `doc-version-parity.test.ts` | `.planning/PROJECT.md` opener | readFile + expect | ✓ WIRED | Automated gate |
| `cursor-icon-verify.md` Path A | `dist/index.js` initialize | stdio dump procedure | ✓ WIRED | Doc procedure + verifier re-ran dump → matching shape |
| `cursor-icon-verify.md` Path B | `npx awesome-coolify-mcp@1.0.1` | stdio dump procedure | ✓ WIRED | Documented with `/tmp` cwd collision workaround |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `buildMcpServerIcons()` | `icons[].src` | `MCP_ICON_192_BASE64` (build-time PNG) + CDN URL constants | Yes — non-empty base64 + live jsDelivr paths | ✓ FLOWING |
| `McpServer` `version` | `serverInfo.version` | `readPackageVersion()` ← `package.json` | Yes — `"1.0.1"` in dist initialize dump | ✓ FLOWING |
| `cursor-icon-verify.md` excerpts | documented JSON | Maintainer stdio dumps | Documented samples match live dist dump shape | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Icon unit + branding + DOC-01 tests | `npm test -- src/mcp/server-icons.test.ts src/mcp/server.test.ts tests/integration/doc-version-parity.test.ts` | 3 files, 38 passed | ✓ PASS |
| docs-parity EN/DE | `npm test -- tests/integration/docs-parity.test.ts` | 6 passed | ✓ PASS |
| Live `dist/` initialize | stdio `initialize` → `serverInfo` | `version:1.0.1`, 3 icons, data URI first, 2 CDN URLs | ✓ PASS |
| No stale opener phrase | `rg -i 'pending Version Packages' PROJECT/README/docs` | no hits on public surfaces | ✓ PASS |
| No runtime docs/assets read | `rg readFileSync.*docs/assets src/mcp/server*.ts` | empty | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No phase-declared `scripts/*/tests/probe-*.sh` | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| BRND-01 | 27-00, 27-01 | initialize icons data URI + multi-size PNG | ✓ SATISFIED | `server-icons.ts` + dist dump + tests |
| BRND-02 | 27-02 | Maintainer verify dist/ + npx; client limitation OK | ✓ SATISFIED | `cursor-icon-verify.md` Path A/B + conclusion |
| DOC-01 | 27-00, 27-03 | PROJECT + README EN/DE = 1.0.1 shipped | ✓ SATISFIED | opener fix + parity tests + branding copy |

No orphaned requirements for Phase 27 (REQUIREMENTS.md maps only BRND-01, BRND-02, DOC-01).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `docs/assets/cursor-icon-verify.md` | 5 | `_(screenshot pending)_` while Phase 16 PNG still committed | ℹ️ Info | Plan 27-02 explicitly allows “screenshot OR pending metadata”; not a goal blocker. Optional refresh of PNG for v3.2 evidence |
| — | — | No TBD/FIXME/XXX in phase production files | — | Clean |

### Human Verification Required

None. BRND-02 success criterion is the **documented** maintainer gate (already in `cursor-icon-verify.md`), not a re-run of Cursor UI by the verifier. Cursor letter-fallback accepted per D-05 with initialize evidence.

### Gaps Summary

None. Phase goal achieved in codebase: dual-icon initialize payload, version `1.0.1` parity, stale docs fixed, BRND-02 verify record complete for both paths.

### Prohibitions (enforced checks)

| Prohibition | Evidence | Status |
| ----------- | -------- | ------ |
| No runtime `readFileSync` of docs/assets for data URI | rg empty on `server-icons.ts` / `server.ts` | ✓ |
| Not data-URI-only / not CDN-only | tests assert both; dump shows 3 mixed entries | ✓ |
| No `favicon-512` in data URI | rg empty under `src/mcp/` | ✓ |
| No parallel v3.2-only verify doc | only `cursor-icon-verify.md` (+ shared `.png`) | ✓ |
| ≤4 experiment variants | V1 only; V2–V4 not required | ✓ |
| No CHANGELOG / milestone archive rewrite (D-09) | historical “Version Packages” remains only in archives/CONTRIBUTING process docs | ✓ |

---

_Verified: 2026-07-28T23:50:58Z_
_Verifier: Claude (gsd-verifier)_
