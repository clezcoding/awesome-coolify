# Phase 27: Branding & Docs Stale Fix - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

MCP `initialize` advertises icons via spec-compliant workarounds (data URI **and** multi-size PNG entries), with up to four Cursor-facing experiments then a documented re-verify gate for both `dist/` and `npx awesome-coolify-mcp` paths (client limitation accepted with evidence). Public docs and MCP server version metadata reflect shipped npm `1.0.1` — no stale “pending Version Packages” wording. No Cursor product fix. No CHANGELOG history rewrite. No `.planning/` archive rewrites. No new MCP tools.

</domain>

<decisions>
## Implementation Decisions

### Icon workarounds (BRND-01)
- **D-01:** Advertise **both** a **data URI** icon entry **and** **multi-size CDN PNG** entries in `serverInfo.icons` (not data-URI-only, not CDN-only). — **Reversibility:** costly — published initialize payload / client display contract.
- **D-02:** Intent is **data URI as primary** branding signal; CDN remains in play as additional multi-size entries unless research/SDK/Cursor behavior shows a better ordering. Exact entry order and whether every CDN size stays are Claude’s discretion after checking SDK + client behavior (user locked “you decide” on CDN primacy). — **Reversibility:** reversible.
- **D-03:** Experiment budget: try up to **four** icon variants (e.g. entry order, sizes, theme, data-only vs mixed). After four attempts without Cursor UI render, **stop** — do not leave the phase open until Cursor renders. — **Reversibility:** reversible.

### Re-verify gate (BRND-02)
- **D-04:** Maintainer re-verify **both** paths: Cursor pointing at local **`dist/`** and **`npx awesome-coolify-mcp`**. — **Reversibility:** costly — BRND-02 success criterion.
- **D-05:** If Cursor MCP list still shows the generic letter fallback: phase **passes** with **documented client limitation** plus evidence (screenshot + initialize dump) — same outcome class as Phase 16 D-09, refreshed for v3.2 workarounds. — **Reversibility:** reversible.
- **D-06:** Update existing **`docs/assets/cursor-icon-verify.md`** (do not invent a parallel v3.2-only doc). Include outcomes/screenshots for both verify paths. — **Reversibility:** reversible.

### Docs & version parity (DOC-01)
- **D-07:** Fix stale “pending Version Packages” / pre-ship wording and reflect npm **`1.0.1` shipped** across **public surfaces**: `.planning/PROJECT.md`, `README.md`, `README.de.md`, `docs/**/*.md`, `CONTRIBUTING.md` as applicable. — **Reversibility:** reversible.
- **D-08:** Also fix hard-coded MCP server version drift (`src/mcp/server.ts` still advertises `0.1.0`) so initialize/`McpServer` version aligns with **`package.json` (`1.0.1`)** — prefer existing `readPackageVersion` pattern from `meta.ts` if research confirms it. — **Reversibility:** costly — published `serverInfo.version`.
- **D-09:** **Do not** rewrite historical `CHANGELOG.md` release entries or `.planning/` milestone archives that correctly describe past `1.0.0` / Version Packages events. — **Reversibility:** one-way — would falsify release history.

### Claude's Discretion
- Exact `icons[]` ordering (data URI first vs CDN first) after SDK/Cursor probes (D-02).
- Which multi-size set to ship (e.g. 48×48 + 192×192) and whether to generate/export additional PNGs from Hex Robot Helper assets.
- How to embed data URI (build-time read of `mcp-icon-192.png` vs checked-in constant) — prefer maintainable approach, avoid huge diffs if avoidable.
- Exact four experiment variants to try within D-03 budget.
- Whether `meta.version` / other surfaces already use `readPackageVersion` and need only `server.ts` (or tests that assert `0.1.0`) updated.
- Wording for README branding section updates after workarounds land.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 27 goal, success criteria; BRND-01, BRND-02, DOC-01
- `.planning/REQUIREMENTS.md` — BRND-01, BRND-02, DOC-01; out-of-scope service/DB logs (unrelated)
- `.planning/PROJECT.md` — v3.2 branding/docs debt; **stale opener** (“v1.0.0 pending Version Packages merge”) vs table `1.0.1`
- `.planning/STATE.md` — current position Phase 27

### Prior phase context
- `.planning/milestones/v3.0-phases/16-coolify-cloud-server-branding/16-CONTEXT.md` — D-05 dedicated icon, D-06 jsDelivr, D-09 aggressive verify → client limitation
- `.planning/phases/26-diagnose-logs-incident-dx/26-CONTEXT.md` — branding/docs explicitly deferred to Phase 27

### Implementation sources
- `src/mcp/server.ts` — `McpServer` constructor: `icons`, `version: '0.1.0'`, title/description/websiteUrl
- `src/mcp/server.test.ts` — branding / icons assertions (BRND)
- `src/utils/package-version.ts` — shared package version reader (if present; used by meta)
- `src/mcp/tools/meta.ts` — already uses `readPackageVersion` for `meta.version`
- `docs/assets/mcp-icon-192.png` — current MCP list icon asset
- `docs/assets/README.md` — brand assets + jsDelivr CDN URLs
- `docs/assets/cursor-icon-verify.md` — D-09 verify record to refresh (D-06)
- `package.json` — canonical npm version `1.0.1`
- `README.md` / `README.de.md` — branding + install wording
- `tests/integration/docs-parity.test.ts` — EN/DE parity gate if docs sections change

### Spec / SDK
- MCP TypeScript SDK `Implementation.icons` (`src`, `mimeType`, `sizes`, optional `theme`) — confirm current Context7/SDK docs during research

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/assets/mcp-icon-192.png` (+ favicon sizes) — source for data URI / multi-size exports
- `docs/assets/cursor-icon-verify.md` — verify template + prior D-09 conclusion
- `readPackageVersion` (`meta.ts` / `package-version` util) — pattern for aligning `McpServer` version with `package.json`

### Established Patterns
- Phase 16: single jsDelivr `@main` URL for `mcp-icon-192.png` in `icons[]`
- Docs parity: README EN/DE kept in lockstep via `docs-parity` tests
- Client limitation documented with initialize JSON + screenshot + forum evidence

### Integration Points
- `createAndConnectServer` in `src/mcp/server.ts` — sole wire-up for `icons` + server version
- Public docs + PROJECT.md for DOC-01 wording
- Maintainer manual Cursor UI checks for BRND-02 (not fully automatable)

</code_context>

<specifics>
## Specific Ideas

- User chose aggressive icon experimentation (up to 4 variants) while still accepting documented Cursor client limitation as a valid pass.
- Data URI primary intent + keep multi-size CDN entries unless Claude’s probe says otherwise.
- Version string `0.1.0` in `server.ts` explicitly in scope alongside docs stale fix.

</specifics>

<deferred>
## Deferred Ideas

- Fixing Cursor IDE itself so MCP list icons always render — host product issue
- Rewriting CHANGELOG / `.planning/` historical “1.0.0 / Version Packages” narrative
- Service/DB log branding or docs (out of milestone scope)
- Full README→docs migration of every section (Phase 16 deferred idea; still out)

</deferred>

---

*Phase: 27-Branding & Docs Stale Fix*
*Context gathered: 2026-07-28*
