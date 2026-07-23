# API Coverage — Phase 18 Live UAT Harness

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 18 adds a maintainer-local live UAT harness (`scripts/live-uat.mjs` +
`scripts/live-uat.matrix.json` + `npm run uat:live`). It **consumes** the
existing Coolify MCP tool surface (Phases 1–17) via stdio MCP spawn and
in-process handler dispatch — **no new Coolify REST endpoints** and no new
MCP `registerTool` names. New work is (a) declarative matrix coverage of all
16 tools + `tools/list`, (b) credential resolution + token redaction,
(c) hybrid stdio/in-process runners with write/destructive flag gates and
UAT project scope, (d) JSON/Markdown reports + exit codes, and
(e) CONTRIBUTING runbook (maintainer-local only).

The API-Coverage gate fires on MCP + API wiring terms, so this matrix records
the integrate/opt-out decisions for the Phase 18 harness surface.

## Capability surface

| capability | decision | reason |
|---|---|---|
| matrix covers all 16 registerTool names + tools/list | INTEGRATE | |
| smoke suite default (read-only) | INTEGRATE | |
| v3 suite rows always included | INTEGRATE | |
| full suite gated behind `--full` | INTEGRATE | |
| credential chain mcp.json → env → InstanceManager | INTEGRATE | |
| COOLIFY_TOKEN redaction on stdout/JSON/MD | INTEGRATE | |
| UAT_PROJECT_UUID identity gate (exit 2) | INTEGRATE | |
| stdio McpStdioClient runner (initialize/tools.list/tools.call) | INTEGRATE | |
| in-process handle*Action runner | INTEGRATE | |
| write rows planned until `--write` | INTEGRATE | |
| destructive rows planned until `--confirm-destructive` | INTEGRATE | |
| mutations outside UAT_PROJECT_UUID → blocked-outside-uat | INTEGRATE | |
| emergency mutations without project_uuid blocked | INTEGRATE | |
| v3_gaps skip (missing preconditions, exit 0 if else green) | INTEGRATE | |
| JSON report stdout + optional `--out` + `.md` companion | INTEGRATE | |
| exit codes 0 success / 1 row fail / 2 setup abort | INTEGRATE | |
| npm run uat:live entry (D-02) | INTEGRATE | |
| harness excluded from npm pack tarball (D-03) | INTEGRATE | |
| CONTRIBUTING Live UAT runbook (placeholders only) | INTEGRATE | |
| new Coolify REST endpoints | OPT-OUT | explicitly out of scope — harness exercises existing client surface only |
| new MCP registerTool names | OPT-OUT | explicitly out of scope — coverage of existing 16 tools only |
| CI / remote secrets for live UAT | OPT-OUT | explicitly rejected — maintainer-local only (D-21 / UAT-06) |
| publish harness in npm package | OPT-OUT | explicitly rejected by D-03 — scripts/ stay out of tarball |
| auto-seed UAT smoke fixtures on Coolify | OPT-OUT | not needed yet — operator pre-seeds uat-smoke-* resources / env placeholders |
| unscoped emergency stop_all against non-UAT | OPT-OUT | explicitly rejected — blocked without project_uuid / outside UAT scope |

---

*Authored: 2026-07-23 — Phase 18 verify:pre gate unblock*
