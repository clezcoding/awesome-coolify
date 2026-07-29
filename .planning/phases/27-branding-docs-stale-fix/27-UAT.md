---
status: complete
phase: 27-branding-docs-stale-fix
source: 27-00-SUMMARY.md, 27-01-SUMMARY.md, 27-02-SUMMARY.md, 27-03-SUMMARY.md
started: 2026-07-29T00:00:24Z
updated: 2026-07-29T01:57:51Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Laufenden Server/Prozess beenden. Ephemeren State leeren (Temp, Caches, Locks). App von Null starten (`npm run build` falls nötig, dann MCP/Server). Boot ohne Fehler; Health/Primärquery liefert Live-Daten (z.B. initialize oder Test-Suite-Smoke).
result: pass
notes: "kill-mcp + npm run build + initialize → version 1.0.1, icons[]=3, data URI first; mcp.json → Path A dist/"

### 2. Cursor MCP-Listen-UI — Path A + Path B
expected: cursor-icon-verify.md dokumentiert Path A (dist/) und Path B (npx) mit UI-Beobachtungen und initialize-Auszügen. Cursor MCP-Liste: Verbindung grün, Tools sichtbar; Icon ggf. nur Buchstabe „A“ (Client-Limitierung D-05 akzeptiert).
result: pass
notes: "Path A: green connect, 18 tools / 4 prompts, letter A icon only (D-05 client limitation)"
coverage_id: D1
rationale: Cursor MCP list UI observation requires maintainer visual check

### 3. Wave 0 — server.test.ts Branding-Scaffolds
expected: server.test.ts it.fails for buildMcpServerIcons import, readPackageVersion, data URI + jsDelivr shape
result: pass
source: automated
coverage_id: D1

### 4. Wave 0 — server-icons.test.ts Shape-Contract
expected: server-icons.test.ts five it.fails for buildMcpServerIcons length, ordering, CDN URLs, mimeType
result: pass
source: automated
coverage_id: D2

### 5. Wave 0 — doc-version-parity PROJECT Opener Gate
expected: doc-version-parity.test.ts it.fails for PROJECT.md opener 1.0.1 / no pending Version Packages
result: pass
source: automated
coverage_id: D3

### 6. Build embeds data URI in dist
expected: npm run build embeds data:image/png;base64 in dist/index.js
result: pass
source: automated
coverage_id: D1

### 7. buildMcpServerIcons Dual-Icon Contract
expected: buildMcpServerIcons returns 3 entries: data URI 192x192 first, favicon-32 CDN, mcp-icon-192 CDN
result: pass
source: automated
coverage_id: D2

### 8. McpServer Constructor Icons + Version
expected: McpServer constructor uses buildMcpServerIcons() and readPackageVersion()
result: pass
source: automated
coverage_id: D3

### 9. Conclusion Table BRND-02
expected: Conclusion table covers data URI, CDN, version 1.0.1, jsDelivr 200, tools visible, custom icon per path
result: pass
source: automated
coverage_id: D2

### 10. D-05 Client-Limitation dokumentiert
expected: D-05 pass: client limitation documented with initialize dump for both paths
result: pass
source: automated
coverage_id: D3

### 11. PROJECT.md Opener 1.0.1 shipped
expected: PROJECT.md opener reflects 1.0.1 shipped — no pending Version Packages phrasing
result: pass
source: automated
coverage_id: D1

### 12. README EN/DE Branding Copy
expected: README EN/DE branding sections match UI-SPEC copywriting contract
result: pass
source: automated
coverage_id: D2

### 13. Public Docs Sweep + Suite Green
expected: Public docs sweep — cloud.md, assets README, full test suite green; D-09 history preserved
result: pass
source: automated
coverage_id: D3

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
