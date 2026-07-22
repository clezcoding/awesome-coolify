# Phase 16: Coolify Cloud & Server Branding - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent can operate Coolify Cloud (`https://app.coolify.io`) with the same MCP tool surface as self-hosted, recover from cloud/permission failures via structured codes + actionable recovery hints, expose branded MCP `serverInfo` (icons + title/description/websiteUrl), and document Cloud setup EN/DE with smoke-test instructions. Scope includes a local/static `instance.cloud-info` action for discoverability. Not workspace manifest (Phase 17), not live UAT harness (Phase 18), not full README→docs migration of every section (deferred; Cloud is the first topic doc under the new pattern).

</domain>

<decisions>
## Implementation Decisions

### Cloud error hints (CLD-02)
- **D-01:** Use dedicated cloud error codes where useful; generic 403/404 remains fallback.
- **D-02:** Two focus codes: `COOLIFY_CLOUD_FORBIDDEN` (token/team permission) and `COOLIFY_CLOUD_UNSUPPORTED` (endpoint unavailable/different on Cloud). Keep existing `COOLIFY_403_SENSITIVE_REQUIRED` for sensitive API.
- **D-03:** Apply cloud codes only when instance is known cloud: registry `type: cloud` **or** hostname `*.coolify.io` / `coolify.io` (reuse `inferInstanceType` logic). No guesswork from response body alone on self-hosted.
- **D-04:** Recovery hints are actionable agent steps in English (check/regenerate team-scoped token, note self-hosted-only alternative if known, point to Cloud docs). Not long user prose.

### Branding & icon (BRND-01..03)
- **D-05:** Ship a **dedicated** MCP list icon (192×192): export from Hex Robot Helper (`docs/assets/mascot-d2-robot-hex.png`) on brand violet — not reuse of `favicon-192.png` as the MCP icon file.
- **D-06:** Host via jsDelivr from the single public repo: `https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/<mcp-icon>.png`.
- **D-07:** **Single repo only:** `https://github.com/clezcoding/awesome-coolify`. Dual-repo / separate `awesome-coolify-mcp` git remote is retired; npm already points here. Downstream agents must not plan sync-to-second-repo steps; update outdated dual-repo notes in `.planning/codebase/CONVENTIONS.md` when touched.
- **D-08:** MCP metadata (Claude discretion, package-aligned):
  - `title`: `Awesome Coolify`
  - `description`: match `package.json` description
  - `websiteUrl`: `https://github.com/clezcoding/awesome-coolify`
  - SDK/`bin` `name` stays `awesome-coolify-mcp` unless MCP SDK requires a different field split (planner verifies exact `McpServer` constructor API).
- **D-09:** **Aggressive verify gate:** Phase 16 is not done without a screenshot proving Cursor MCP server list shows the awesome-coolify icon after reconnect. Document client icon limitation only if that verify fails (with evidence).

### Cloud docs EN/DE (CLD-03)
- **D-10:** Depth = setup + smoke + known limits (not a full Cloud API handbook).
- **D-11:** Docs pattern shift: topic gets its own clear doc; README EN/DE keep a **quick overview + links** only. Phase 16 ships Cloud as the first topic under locale folders; full README section split is deferred.
- **D-12:** Files: `docs/en/cloud.md` + `docs/de/cloud.md`.
- **D-13:** Smoke path (Claude discretion): agent-first — after connect, `instance.add` / `import-env` (cloud) → `system` or `meta.version` / light list. Optional one-liner curl for token sanity only.

### Cloud instance behavior (CLD-01 + discoverability)
- **D-14:** Same tool surface for Cloud as self-hosted. On `instance.add`/`update`: still + infer `type`; no soft `_meta.cloudNote` warning; no hard rule that `type: cloud` requires `*.coolify.io` URL.
- **D-15:** Env-only Cloud (`COOLIFY_URL=https://app.coolify.io`) uses the same host-infer at runtime for cloud codes/hints — no registry entry required.
- **D-16:** Add `instance` action `cloud-info` (local/static only — no live API probe): reports `isCloud`, `url`, `source` (registry|env|infer), setup hints, known limits, link to `docs/en|de/cloud.md`.
- **D-17:** `cloud-info` supports optional instance routing like other tools (`instance` param → else Env/default resolution).

### Claude's Discretion
- Exact hint string copy for the two cloud codes (keep short, EN, actionable).
- Exact MCP icon filename under `docs/assets/` (suggest `mcp-icon-192.png` or similar).
- Exact `McpServer` / SDK field wiring for `icons`, `title`, `description`, `websiteUrl` after Context7/SDK check.
- Optional curl one-liner wording in cloud docs.
- How aggressively to refresh dual-repo language in CONVENTIONS (touch when docs/branding work lands).

### Folded Todos
- **MCP Server für Coolify Cloud erweitern** — folds into CLD-01..03 / this phase (cloud connect, quirks, docs).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` — Phase 16 goal, success criteria, CLD-01..03, BRND-01..03
- `.planning/REQUIREMENTS.md` — CLD-01, CLD-02, CLD-03, BRND-01, BRND-02, BRND-03
- `.planning/PROJECT.md` — v3.0 Platform Foundation; Cloud + branding checklist items
- `.planning/phases/15-multi-instance-registry-routing/15-CONTEXT.md` — registry `type`, routing precedence, soft-start, infer for `*.coolify.io`

### Code integration
- `src/mcp/server.ts` — `McpServer` construction (`name`/`version` today); branding metadata lands here
- `src/utils/errors.ts` — structured codes + `RECOVERY_HINTS`; extend for cloud codes; `mapApiError` / `wrapMcpError`
- `src/mcp/tools/instance.ts` — `inferInstanceType`, `type` schema, new `cloud-info` action
- `src/utils/instance-registry.ts` — instance schema with `type: self-hosted | cloud`
- `package.json` — description, homepage, repository (single repo `clezcoding/awesome-coolify`)

### Docs & assets
- `docs/assets/README.md` — branding assets, Hex Robot Helper, jsDelivr CDN pattern (update repo slug if still wrong)
- `docs/assets/mascot-d2-robot-hex.png` — source mascot for dedicated MCP list icon
- `README.md` / `README.de.md` — quick overview + links to `docs/en|de/cloud.md` (do not dump full Cloud playbook into README)
- `docs/install.html` — optional short Cloud URL placeholder pointer (nice-to-have; not blocking if README+topic docs cover CLD-03)

### Spike / conventions
- `.cursor/skills/spike-findings-awesome-coolify/SKILL.md` — structured errors; no stub tools; action-based schema
- `.planning/codebase/CONVENTIONS.md` — **outdated dual-repo section** — treat D-07 as authoritative (single repo)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `inferInstanceType(url)` in `instance.ts` — already classifies `*.coolify.io` as `cloud`; reuse for error mapper + `cloud-info`.
- `RECOVERY_HINTS` + `CoolifyErrorCode` union in `errors.ts` — extend with two cloud codes; pattern matches `COOLIFY_403_SENSITIVE_REQUIRED`.
- `docs/assets/*` + jsDelivr URLs already used in README — same CDN pattern for MCP icon.
- Zod discriminatedUnion action schemas on `instance` — add `cloud-info` as another action branch.

### Established Patterns
- Action-based domain tools (not dozens of granular tools).
- Structured error envelopes with `recoveryHints` (EN).
- EN/DE README pair at repo root; Phase 16 starts locale docs under `docs/en/` and `docs/de/`.
- Per-request credential resolution from Phase 15 (instance → env → default).

### Integration Points
- Error mapping path must receive resolved URL/`type` (or hostname) so D-03 can fire without global mutable “active cloud” state.
- `createAndConnectServer` / `McpServer` options — wire icons + title/description/websiteUrl per current `@modelcontextprotocol/sdk` API.
- Public asset must be committed under `docs/assets/` so jsDelivr `@main` serves it after push.
- Verification evidence: Cursor reconnect + screenshot for D-09.

</code_context>

<specifics>
## Specific Ideas

- German discuss session; decisions above are normative for downstream agents (English).
- User explicitly rejected dual-repo: only `https://github.com/clezcoding/awesome-coolify`; npm already switched.
- Docs pattern: “everything gets its own clear doc; README = quick overview” — Cloud is first; full README split deferred.
- User chose aggressive Cursor icon verify (screenshot) over docs-only fallback.
- `instance.cloud-info` was accepted as in-scope discoverability (local/static), not deferred.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- Custom Skills pro IDE für Coolify — Phase 19+
- Integrate official Coolify OpenAPI specs — separate docs/foundation track
- Lokale Projekt-Manifest-Datei — Phase 17
- Standard-Setup Tool für neue Coolify-Projekte — Phase 19+

### Scope belonging to later / other work
- Full README → `docs/en|de/*` split for all sections (Phase 16 only ships Cloud topic docs)
- `.coolify/manifest.json` — Phase 17
- Live UAT harness — Phase 18
- Live `cloud-info` API probe / capability matrix — rejected for v1 of this action
- Billing/plan/rate-limit specific error code zoo — rejected without live evidence

</deferred>

---

*Phase: 16-Coolify Cloud & Server Branding*
*Context gathered: 2026-07-22*
