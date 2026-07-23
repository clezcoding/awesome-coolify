---
phase: 16-coolify-cloud-server-branding
verified: 2026-07-22T02:30:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 16: Coolify Cloud & Server Branding Verification Report

**Phase Goal:** Agent can operate Coolify Cloud with the same tool surface, recover from cloud-only restrictions, and users see a branded icon in the MCP server list (like pg-aiguide). D-09 documented Cursor client limitation for icon *rendering* is an accepted alternate path — server must still emit `serverInfo.icons`.
**Verified:** 2026-07-22T02:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Agent can connect to `https://app.coolify.io` with a team-scoped Bearer token using the same tools as self-hosted instances | ✓ VERIFIED | `src/mcp/server.ts` registers the same 14 domain tools via `registerCoolifyTools` regardless of hostname; `src/api/client.ts` uses Bearer auth uniformly (unchanged from prior phases); `instance.add` accepts `type:'cloud'` with any URL per D-14; `instance.cloud-info` discovery action reports `isCloud` via `inferInstanceType` hostname heuristic. No cloud-specific tool fork exists. |
| 2 | Cloud-only or permission-denied endpoint failures return structured recovery hints instead of opaque 403/404 loops | ✓ VERIFIED | `src/utils/errors.ts` lines 19-20 add `COOLIFY_CLOUD_FORBIDDEN`/`COOLIFY_CLOUD_UNSUPPORTED` to the union; lines 103-110 define `RECOVERY_HINTS` entries; `isCloudUrl` (lines 113-120) classifies `coolify.io`/`*.coolify.io`; `mapApiError` (lines 172-200) intercepts cloud 403/404 before `statusToCode`; `toStructuredError` (lines 267-281) inspects `fetchError.request` URL per-error. `npx vitest run src/utils/errors.test.ts -t 'Cloud hostname'` → 7 passed. |
| 3 | README EN/DE and install docs include a Coolify Cloud setup path with smoke-test instructions | ✓ VERIFIED | `docs/en/cloud.md` (144 lines) and `docs/de/cloud.md` (DE parity) both contain `app.coolify.io`, `COOLIFY_CLOUD_FORBIDDEN`, `COOLIFY_CLOUD_UNSUPPORTED`, `cloud-info`, plus Setup/Smoke/Known limits/Error codes sections. `README.md:283` and `README.de.md:283` each have a `## ☁️ Coolify Cloud` quick overview linking to the topic docs. |
| 4 | MCP `initialize` response includes `serverInfo.icons` pointing at a public HTTPS PNG (192×192 Hex Robot Helper on brand violet) | ✓ VERIFIED | `src/mcp/server.ts` lines 591-597 pass `icons: [{ src: 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png', mimeType: 'image/png', sizes: ['192x192'] }]`. `docs/assets/mcp-icon-192.png` exists; `file` reports `PNG image data, 192 x 192`; `sips -g pixelWidth -g pixelHeight` confirms 192x192. `docs/assets/README.md:13,42` lists the asset with the jsDelivr URL. |
| 5 | Cursor MCP server list displays the awesome-coolify icon after reconnect (or documents known client limitation with title/description fallback) | ✓ VERIFIED | Documented client limitation per phase goal's accepted alternate path. `docs/assets/cursor-icon-verify.md` records: server emits `serverInfo.icons` correctly (initialize JSON captured), jsDelivr PNG HTTP 200, Cursor shows generic "A" fallback. `docs/assets/cursor-icon-verify.png` screenshot attached. Per RESEARCH Pitfall 2 / Open Question 1 (RESOLVED) and phase goal D-09 clause, this is an accepted outcome. |
| 6 | `McpServer` exposes `title`, `description`, and `websiteUrl` alongside icons | ✓ VERIFIED | `src/mcp/server.ts` lines 587-590: `title: 'Awesome Coolify'`, `description: 'MCP server for Coolify 4.1.x — …'`, `websiteUrl: 'https://github.com/clezcoding/awesome-coolify'`, peer fields with `icons` in one `serverInfo` object. `npx vitest run src/mcp/server.test.ts -t 'branding metadata'` → 6 passed. |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/utils/errors.ts` | Cloud codes + isCloudUrl + cloud-aware mapping | ✓ VERIFIED | Lines 19-20 (union), 103-110 (hints), 113-120 (isCloudUrl), 172-200 (cloud branches), 267-281 (request URL inspection) |
| `src/mcp/tools/instance.ts` | cloud-info action schema + handler | ✓ VERIFIED | `cloudInfoActionSchema` line 107, in discriminatedUnion line 124, `case 'cloud-info'` lines 344-394 with three source paths (registry/env/infer) + COOLIFY_NO_INSTANCE fallback |
| `src/mcp/server.ts` | McpServer constructor branding + cloud-info in instance description | ✓ VERIFIED | Lines 584-598 (constructor), line 440 (instance description mentions cloud-info) |
| `docs/assets/mcp-icon-192.png` | 192x192 PNG, Hex Robot Helper on brand violet | ✓ VERIFIED | `file` → PNG 192x192; `sips` → 192x192; dedicated asset (not favicon reuse) |
| `docs/assets/README.md` | MCP icon section with jsDelivr URL | ✓ VERIFIED | Line 13 (asset table row), line 42 (jsDelivr URL) |
| `docs/en/cloud.md` | Cloud setup + smoke + limits + error codes | ✓ VERIFIED | 144 lines, all required literals present |
| `docs/de/cloud.md` | German parity translation | ✓ VERIFIED | 4588 bytes, 15 matches for required literals |
| `README.md` / `README.de.md` | ≤15-line Cloud quick overview + links | ✓ VERIFIED | Section at line 283 in both files, TOC anchor at line 76 |
| `.planning/codebase/CONVENTIONS.md` | Single-repo Repository Model (D-07) | ✓ VERIFIED | Line 7 single-repo statement, line 11 dual-repo retired note |
| `docs/assets/cursor-icon-verify.md` + `.png` | D-09 evidence | ✓ VERIFIED | Both files present; documents client limitation with initialize JSON + CDN 200 + screenshot |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `toStructuredError` | `isCloudUrl` | request URL inspection (lines 267-269) | ✓ WIRED | `isCloud = requestUrl ? isCloudUrl(requestUrl) : false` |
| `toStructuredError` | `mapApiError` | isCloud flag forwarded (line 281) | ✓ WIRED | `mapApiError(error, status, coolifyMessage, isCloud)` |
| `instance.cloud-info` | `InstanceManager.resolveCredentials` | reuses Phase 15 precedence (line 358) | ✓ WIRED | Throws COOLIFY_INSTANCE_NOT_FOUND for unknown names; infer fallback only on COOLIFY_NO_INSTANCE |
| `instance.cloud-info` | `inferInstanceType` | isCloud derivation (line 380) | ✓ WIRED | `isCloud: inferInstanceType(resolvedUrl) === 'cloud'` |
| `instance.cloud-info` | `buildReadResponse` | uniform envelope (line 379) | ✓ WIRED | Returns isCloud/url/source/setupHints/knownLimits/docsLink |
| `McpServer constructor` | MCP initialize serverInfo | peer fields (lines 587-597) | ✓ WIRED | title/description/websiteUrl/icons in one object |
| `icons[0].src` | jsDelivr CDN @main | `docs/assets/mcp-icon-192.png` (line 593) | ✓ WIRED | `https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png` |
| `README.md` | `docs/en/cloud.md` | quick overview link (line 287) | ✓ WIRED | "Full setup, smoke test, and known limits → docs/en/cloud.md" |
| `README.de.md` | `docs/de/cloud.md` | quick overview link (line 287) | ✓ WIRED | German parity link present |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `instance.cloud-info` response | `isCloud` / `url` / `source` | `InstanceManager.resolveCredentials` + `inferInstanceType` | Yes — resolves from registry/env/infer | ✓ FLOWING |
| `toStructuredError` cloud envelope | `code` / `recoveryHints` | `RECOVERY_HINTS.COOLIFY_CLOUD_*` + `isCloudUrl(request)` | Yes — per-error URL inspection | ✓ FLOWING |
| `McpServer` serverInfo | `title` / `description` / `websiteUrl` / `icons` | Static literals in constructor + `package.json` description | Yes — emitted in initialize handshake | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Cloud hostname error mapping | `npx vitest run src/utils/errors.test.ts -t 'Cloud hostname'` | 7 passed, 31 skipped | ✓ PASS |
| cloud-info action (all source paths) | `npx vitest run src/mcp/tools/instance.test.ts -t 'cloud-info'` | 7 passed, 17 skipped | ✓ PASS |
| McpServer branding metadata | `npx vitest run src/mcp/server.test.ts -t 'branding metadata'` | 6 passed, 11 skipped | ✓ PASS |
| Full phase test suite | `npx vitest run src/mcp/server.test.ts src/utils/errors.test.ts src/mcp/tools/instance.test.ts` | 79 passed, 0 failed | ✓ PASS |
| tsup build | `npm run build` | `⚡️ Build success in 25ms` | ✓ PASS |
| Icon asset dimensions | `sips -g pixelWidth -g pixelHeight docs/assets/mcp-icon-192.png` | 192x192 | ✓ PASS |
| Icon file type | `file docs/assets/mcp-icon-192.png` | `PNG image data, 192 x 192, 8-bit/color RGB` | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes declared for this phase. Phase 16 verification is test- and artifact-based.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| CLD-01 | 16-00, 16-02 | Agent can connect to `https://app.coolify.io` with team-scoped Bearer token using same tool surface | ✓ SATISFIED | `instance.cloud-info` action (instance.ts:344-394) + same 14 tools registered + `instance.add` accepts `type:'cloud'` |
| CLD-02 | 16-00, 16-01 | Cloud-only or permission-denied failures return structured recovery hints | ✓ SATISFIED | `errors.ts` cloud codes + `isCloudUrl` + cloud-aware `mapApiError` (lines 172-200); 7 tests pass |
| CLD-03 | 16-04 | README EN/DE and install docs include Coolify Cloud setup path with smoke-test instructions | ✓ SATISFIED | `docs/en/cloud.md`, `docs/de/cloud.md`, `README.md:283`, `README.de.md:283` |
| BRND-01 | 16-00, 16-03 | MCP `initialize` exposes `serverInfo.icons` | ✓ SATISFIED | `server.ts:591-597`; cursor-icon-verify.md confirms initialize emits icons |
| BRND-02 | 16-03 | Icon is 192×192 PNG served via public HTTPS (jsDelivr) | ✓ SATISFIED | `docs/assets/mcp-icon-192.png` 192x192 PNG; jsDelivr URL wired; CDN 200 confirmed in cursor-icon-verify.md |
| BRND-03 | 16-00, 16-03 | `McpServer` metadata includes `title`, `description`, `websiteUrl` as fallback | ✓ SATISFIED | `server.ts:587-590`; 6 branding tests pass |

No orphaned requirements — all 6 IDs (CLD-01, CLD-02, CLD-03, BRND-01, BRND-02, BRND-03) declared in PLAN frontmatter across the phase map to REQUIREMENTS.md Phase 16 entries and are covered by verified truths/artifacts.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | No TBD/FIXME/XXX debt markers in modified files | ℹ️ Info | Clean |
| `src/mcp/tools/instance.ts` | 226 | "masked placeholder token ***" | ℹ️ Info | Legitimate token-masking error message, not a stub |
| `docs/en/cloud.md` | 25 | "use placeholders or environment variables" | ℹ️ Info | Legitimate doc prose about token placeholders, not a stub |

No blocker or warning anti-patterns detected. No empty implementations, no console.log-only handlers, no hardcoded empty data flows in modified production files.

### Human Verification Required

None. D-09 Cursor icon rendering was already resolved via the documented client limitation path (per phase goal's accepted alternate clause) — evidence in `docs/assets/cursor-icon-verify.md` + `.png`. No remaining behavior-unverified truths.

### Gaps Summary

No gaps found. All 6 roadmap success criteria verified, all 6 requirement IDs satisfied, all artifacts present and substantive and wired, all key links connected, data flows real (not static/hollow), full test suite green (79/79), tsup build green. D-09 closed as documented Cursor client limitation per the phase goal's explicit accepted alternate path.

### Notes

- `16-EDGE-PROBE.json` records 10 unresolved edge probes (concurrency/adjacency/empty/ordering categories) — these are planner-facing open questions, not goal-blocking gaps. None map to a must-have truth that failed verification.
- D-09 outcome (Cursor MCP list shows generic "A" fallback, not Hex Robot icon) is explicitly accepted by the phase goal: "D-09 documented Cursor client limitation for icon *rendering* is an accepted alternate path — server must still emit serverInfo.icons." Server-side emission verified; client rendering limitation documented with evidence.

---

_Verified: 2026-07-22T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
