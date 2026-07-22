---
spike: 003
name: existing-coolify-mcp-patterns
type: standard
validates: "Given existing Coolify MCPs (user-coolify, user-coolify-backup-mcp, stumason/coolify-mcp) + MCP SDK examples, when inspecting schemas + tool layouts, then proven patterns + anti-patterns extracted for v1 action-schema design"
verdict: VALIDATED
related: [001, 002]
tags: [mcp, coolify, comparison, patterns, landscape]
---

# Spike 003: Existing Coolify MCP Patterns

## What This Validates
Given three existing Coolify MCP servers (`user-coolify`, `user-coolify-backup-mcp`, `stumason/coolify-mcp`), when inspecting their tool schemas and patterns, then proven patterns and anti-patterns are extracted to inform v1 action-schema design and differentiation.

## Research

### Sources consulted
- MCP tool discovery (GetMcpTools) on `user-coolify` — 75 tools, full schemas (2182 lines)
- MCP tool discovery (GetMcpTools) on `user-coolify-backup-mcp` — ~42 tools, full schemas (1455 lines)
- context7 `/stumason/coolify-mcp` (239 snippets, High reputation, score 83.5) — v2.0.0 design docs, README, CLAUDE.md, CONTRIBUTING.md

### Approach

| Approach | Source | Pros | Cons | Status |
|----------|--------|------|------|--------|
| MCP tool discovery | GetMcpTools on user-coolify + backup-mcp | Ground truth, full JSON schemas | Large output (57+36 KB) | **Chosen** |
| context7 docs | `/stumason/coolify-mcp` | Design rationale, token metrics | No live schema | Chosen (parallel) |
| GitHub source | stumason/coolify-mcp repo | Full code | Skipped — context7 sufficient | — |

## How to Run
Research spike — no runnable code. Comparison source at `sources/comparison.md`. To re-verify:
```bash
# Via MCP discovery (already done):
# GetMcpTools server=user-coolify
# GetMcpTools server=user-coolify-backup-mcp
npx -y ctx7@latest docs /stumason/coolify-mcp "tool schema action-based patterns"
```

## What to Expect
A comparison document at `sources/comparison.md` covering: at-a-glance server comparison table, 11 proven patterns to adopt, 5 anti-patterns to avoid, feature-gap table (v1 differentiation), and full tool inventories for all three servers.

## Investigation Trail

### Iteration 1 — MCP discovery on both installed servers
GetMcpTools returned full JSON schemas for `user-coolify` (75 tools, 2182 lines) and `user-coolify-backup-mcp` (~42 tools, 1455 lines). Both written to agent-tools scratch files.

### Iteration 2 — tool name extraction
Grep for `"tool":` in both schema files → enumerated every tool name. Counted: user-coolify = 75 granular tools, user-coolify-backup-mcp = ~42 action-based tools.

### Iteration 3 — stumason/coolify-mcp context7 docs
Fetched design docs: "38 token-optimized tools", "85% token reduction (6,600 vs 43,000)", "consolidating related operations into single tools with action parameters", HATEOAS `_actions`/`_pagination` pattern, `Promise.allSettled` batch ops, smart lookup, summary mode.

### Iteration 4 — pattern extraction
Cross-referenced all three servers against v1 design (PROJECT.md + Spike 002 patterns). Identified 11 proven patterns to adopt and 5 anti-patterns to avoid. Mapped v1 differentiation: multi-instance via config file, structured error codes, wait-mode deploy polling, no broken-endpoint tools — none of the existing servers fill these gaps.

### Iteration 5 — schema-style comparison
- user-coolify: granular, one tool per op (e.g. `start_application`, `stop_application`, `restart_application`, `start_database`, ... = 9 lifecycle tools)
- user-coolify-backup-mcp: action-based with flat params (e.g. `application({ action: 'create_public'|'update'|'delete', project_uuid, server_uuid, github_app_uuid, ... })` — all params visible for every action)
- stumason: action-based with `resource`+`action` (e.g. `control({ resource: 'application', action: 'restart', uuid })`)
- **v1 choice**: zod `discriminatedUnion('action', [...])` — improves on all three: type-safe, self-documenting, only relevant params per action.

## Results

**Verdict: VALIDATED ✓**

v1 design validated against three existing servers. Action-based schema is the proven direction (2 of 3 servers use it; stumason reports 85% token reduction). v1 differentiation opportunities identified.

**Key findings:**

1. **Action-based schema is proven.** stumason v2.0.0 reduced tools from granular baseline to 38 action-based tools, cutting token cost 85% (43k → 6.6k). user-coolify-backup-mcp uses action-based with flat params. v1's zod `discriminatedUnion` is the strictest, type-safest variant — improvement on both.

2. **Unified `control` tool for lifecycle is proven.** user-coolify-backup-mcp's `control({ resource, action, uuid })` replaces 9 granular start/stop/restart tools. v1 adopts this directly.

3. **Sensitive-value masking with `reveal` opt-in is standard.** user-coolify-backup-mcp returns env vars as `***` by default, `reveal: true` for plaintext. Same pattern for `system` tool's `include_full` + `reveal`. v1 adopts.

4. **`include_logs` / `include_full` opt-in is standard.** Default to summary projections; opt-in for full payloads. Matches Spike 001 finding (deployment logs inline string, must cap).

5. **Per-call `confirm: true` arg is the better confirmation pattern.** user-coolify uses env var `COOLIFY_REQUIRE_CONFIRM` (global toggle, inflexible). user-coolify-backup-mcp + stumason use per-call `confirm: true`. v1 uses per-call (matches PROJECT.md).

6. **Smart diagnostics by name/domain/IP (not just UUID) is proven DX.** Both action-based servers do it. v1 adopts for `diagnose_app` + `diagnose_server`.

7. **HATEOAS `_actions` hints (stumason) is high-DX innovation.** Every response includes `_actions: [{ tool, args, hint }]` suggesting next steps. v1 adopts — matches `mcp_features.md` §2 "Follow-up Action Hints".

8. **`Promise.allSettled` + `BatchOperationResult` shape for batch ops.** stumason pattern: `{ summary: {total, succeeded, failed}, succeeded: [...], failed: [...] }`. v1 adopts for `stop_all_apps` emergency op.

9. **Anti-pattern: shipping tools for broken/missing endpoints.** user-coolify ships `execute_command`, `get_database_logs`, `get_service_logs` — all return errors. Spike 001 confirmed these endpoints don't exist in OpenAPI. v1 does NOT ship tools for them; documents as limitations.

10. **Anti-pattern: flat params for action tools.** user-coolify-backup-mcp's `application` tool exposes all 15+ params for every action — agent can't tell which apply. v1's discriminated union fixes this.

11. **Anti-pattern: no structured error codes.** All three servers return errors as free-text in `content[0].text`. v1's structured `error: { code, message, hint }` (Spike 002) is a differentiation.

**v1 differentiation (gaps none of the existing servers fill):**
- Multi-instance via `~/.coolify-mcp/instances.json` + `instance` arg (all three use env vars = single instance)
- Structured error codes with recovery hints (all three return free-text errors)
- Wait-mode deploy polling (user-coolify is fire-and-forget; backup-mcp partial)
- No broken-endpoint tools (user-coolify ships 3 broken tools)

## Impact on Build

v1 design is now fully validated across three angles:
- **Spike 001**: API surface — every v1 ops endpoint exists and is mapped
- **Spike 002**: MCP SDK patterns — every v1 design decision is feasible with `@modelcontextprotocol/sdk` v1.29.0
- **Spike 003**: existing servers — action-based schema proven (85% token reduction), 11 patterns to adopt, 5 anti-patterns to avoid, 4 differentiation opportunities

Ready for `/gsd-spike --wrap-up` to package findings into implementation blueprint, or `/gsd-plan-phase 1` to start planning the real build.
