---
phase: 27
slug: branding-docs-stale-fix
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-29
---

# Phase 27 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| test → source files | Tests read `server.ts` / icon modules; no untrusted input | Test fixtures, source strings |
| build script → PNG asset | `generate-mcp-icon-data.mjs` reads trusted repo asset only | Base64 PNG embed |
| initialize → MCP client | `serverInfo.icons` and `version` are server-originated constants | Icon URLs, data URI, version string |
| maintainer → Cursor IDE | Manual UI observation for BRND-02 re-verify | Screenshot, initialize JSON dump |
| verify doc → public readers | Evidence doc is trusted maintainer record | Truncated icon samples, path configs |
| docs → readers | Public copy is maintainer-authored static markdown | Version strings, branding copy |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-27-00-01 | Tampering | server.test.ts | low | accept | Wave 0 scaffolds only; no runtime change | closed |
| T-27-01 | Tampering | icons[] src | medium | mitigate | PNG-only assets; no SVG; jsDelivr from own repo path only | closed |
| T-27-02 | Spoofing | CDN icon URLs | medium | mitigate | Hardcode `clezcoding/awesome-coolify@main/docs/assets` base | closed |
| T-27-03 | Denial of Service | data URI size | low | accept | ~42 KB acceptable per RESEARCH A3; exclude favicon-512 | closed |
| T-27-01-SC | Tampering | npm/pip/cargo installs | high | mitigate | No new packages this phase | closed |
| T-27-02-01 | Repudiation | verify evidence | low | mitigate | Screenshot + initialize JSON dump both paths | closed |
| T-27-02-02 | Information Disclosure | initialize dump in doc | low | accept | Truncate base64 placeholder per UI-SPEC | closed |
| T-27-03-01 | Tampering | D-09 history | medium | mitigate | Prohibition gate on CHANGELOG/milestones diff | closed |
| T-27-03-02 | Spoofing | version claims in docs | low | mitigate | Align with package.json 1.0.1 and `readPackageVersion()` | closed |

*Status: closed — L1 grep verification 2026-07-29 (ASVS L1, `block_on: high`)*

### Verification Evidence

| Threat ID | Evidence |
|-----------|----------|
| T-27-00-01 | Accepted risk — see Accepted Risks Log |
| T-27-01 | `src/mcp/server-icons.ts:5-22` — PNG mimeType only; `src/mcp/server-icons.test.ts:35-38` asserts `image/png` on all entries; no SVG in `icons[]` |
| T-27-02 | `src/mcp/server-icons.ts:3` — `CDN` constant hardcoded to `clezcoding/awesome-coolify@main/docs/assets` |
| T-27-03 | Accepted risk — see Accepted Risks Log; `buildMcpServerIcons()` uses 192×192 embed only (no favicon-512) |
| T-27-01-SC | `27-01-SUMMARY.md` frontmatter `tech-stack.added: []`; no new dependencies in phase |
| T-27-02-01 | `docs/assets/cursor-icon-verify.md` — Path A + Path B sections with initialize JSON dumps; screenshot linked |
| T-27-02-02 | Accepted risk — see Accepted Risks Log; `cursor-icon-verify.md:51,109,142` truncates data URI to `data:image/png;base64,{…}` |
| T-27-03-01 | `tests/integration/doc-version-parity.test.ts:3` — scope excludes CHANGELOG/milestones per D-09 |
| T-27-03-02 | `src/mcp/server.test.ts:424-429` — `readPackageVersion()` matches `package.json` `1.0.1` |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-27-01 | T-27-00-01 | Wave 0 RED scaffolds only; no production runtime change in plan 27-00 | gsd-secure-phase L1 audit | 2026-07-29 |
| AR-27-02 | T-27-03 | ~42 KB data URI acceptable for MCP initialize; favicon-512 (~788 KB) explicitly excluded per UI-SPEC | gsd-secure-phase L1 audit | 2026-07-29 |
| AR-27-03 | T-27-02-02 | Public verify doc uses `{…}` placeholder for base64; full payload verified via maintainer stdio dump command | gsd-secure-phase L1 audit | 2026-07-29 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-29 | 9 | 9 | 0 | gsd-secure-phase (orchestrator L1, auditor skipped — ASVS L1 + threats_open: 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-29
