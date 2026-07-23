---
phase: 18
slug: live-uat-harness
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 18 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Maintainer CLI → local filesystem | Harness reads `.cursor/mcp.json`, `~/.coolify-mcp/instances.json`, process.env | URLs, Bearer tokens |
| Harness → spawned MCP child | Local stdio; child receives routingEnv | Token in env of child process |
| Harness → in-process handlers | Same process as routingEnv | Token + live API responses |
| Harness → live Coolify API | Outbound HTTPS with Bearer | Secrets in responses possible |
| Harness → stdout / `--out` / Markdown | Report leak surface | Must be redacted |
| Mutating row → live resources | Write/destructive under flag gates | Scoped to `UAT_PROJECT_UUID` |
| Maintainer → CONTRIBUTING.md | Docs leak surface | Placeholders only |
| npm publish → public registry | Tarball must exclude harness | `files` allowlist |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-18-01 | Information Disclosure | redact() + all output paths | high | mitigate | `createRedactor` masks `COOLIFY_TOKEN` before stdout/`--out`/Markdown; live UAT confirmed no token in reports | closed |
| T-18-02 | Elevation of Privilege | UAT_PROJECT_UUID + two-tier flags | high | mitigate | Exit 2 without UUID; write needs `--write`; destructive needs `--confirm-destructive`; out-of-scope → `blocked-outside-uat` | closed |
| T-18-03 | Tampering | spawnChild / respawn argv | medium | mitigate | `spawn('node', [distEntry], …)` — no `shell:true`; Zod CLI before side effects | closed |
| T-18-04 | Denial of Service | McpStdioClient timeout | high | mitigate | `STDIO_REQUEST_TIMEOUT_MS = 30_000`; SIGTERM in `finally` + 500ms await | closed |
| T-18-05 | Tampering | in-process dispatch map | medium | mitigate | Exact tool-name keys; unknown → `UAT_IMPORT_FAIL`, suite continues | closed |
| T-18-06 | Repudiation | v3_gaps + skip reasons | low | accept | Skip reasons recorded in report; sufficient at ASVS L1 | closed |
| T-18-07 | Information Disclosure | CONTRIBUTING.md examples | medium | mitigate | Placeholders only (`<your-uat-project-uuid>`); no real token shape | closed |
| T-18-08 | Tampering | npm `files` allowlist | high | mitigate | Allowlist `dist`, `.env.example`, `LICENSE`; pack dry-run excludes harness scripts | closed |
| T-18-SC | Tampering | tsx respawn / supply chain | low | mitigate | `tsx` pinned in `devDependencies`; harness prefers `node_modules/tsx` over unpinned `npx` fetch | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-18-01 | T-18-06 | Skip reasons in report provide auditability; no extra logging required at ASVS L1 | plan author | 2026-07-23 |
| AR-18-02 | T-18-SC | Superseded — `tsx` now pinned in `devDependencies` (2026-07-23 review fix) | plan author / maintainer | 2026-07-23 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 9 | 9 | 0 | gsd-secure-phase (ASVS L1 short-circuit after UAT; register authored at plan time) |

## Security Audit 2026-07-23

| Metric | Count |
|--------|-------|
| Threats found | 9 |
| Closed | 9 |
| Open | 0 |

L1 evidence: `redact()` / `abortSetup` / flag gates / 30s timeout / `spawn` without shell / CONTRIBUTING placeholders / `package.json` files allowlist; live UAT exit 0 with token absent from stdout/json/md.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
