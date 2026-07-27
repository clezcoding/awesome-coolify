# Phase 24: Capabilities & Deployment Logs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 24-Capabilities & Deployment Logs
**Mode:** `--batch` (German UI, recommendations marked)
**Areas discussed:** Capability-Flags Modell, Version-Antwort-Merge, deployment.logs vs application.logs, Log-Output-Vertrag, Flag-Payload-Schema, Kein Deployment bei application_uuid, Docs/Prompts Scope, diagnose im Capability-Set

---

## Capability-Flags Modell

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Flat booleans | `{ capabilities: { key: true } }` | |
| 1b Flat + min_version/note | Booleans with per-flag metadata | ✓ (later refined to object shape in Extra) |
| 1c Nested by domain | `{ logs: {…}, deploy: {…} }` | |
| 2a Static 4.1.2 table | Hardcoded curated flags | ✓ |
| 2b Semver gates | Parse version → feature matrix | researched, rejected as sole source |
| 2c Hybrid | Static + version override | |
| OpenAPI archive idea | Last N release OpenAPI files + CI | deferred |
| 3a Known 4.1.2 set | application_logs, deployment_logs, deployment_watch, deploy_watch | ✓ |
| 3b Large matrix | Include future false flags | |
| 3c Minimal | Only flags needed today | |
| 4a Soft | Agent skips; no schema hard-block | ✓ |
| 4b Hard-block | Action errors if capability missing | |
| 4c Both | Flag + soft error | |

**User's choice:** 1b → refined to Extra 1a object shape; 2a; 3a; 4a; keep Coolify target 4.1.2 (do not lower to 4.0.0)
**Notes:** User asked whether semver (2b) works and proposed OpenAPI multi-version archive. Research on coollabsio/coolify: openapi.json/yaml at repo root per tag; 4.1.2=96 paths, 4.2.0=135; patch releases often identical. Archive feasible but out of Phase 24 scope.

---

## Version-Antwort-Merge

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Merge into system.version; keep meta | CAP-01 + back-compat | ✓ |
| 1b Remove meta.version | | |
| 1c Docs-only dual call | | |
| 2a coolifyVersion + mcpVersion + serverName + capabilities | | ✓ |
| 2b Keep bare `version` + mcpVersion | | |
| 2c Nested version object | | |
| 3a package.json version | | ✓ |
| 3b Code constant | | |
| 3c Build-time inject | | |
| 4a Rename version→coolifyVersion | Breaking OK on 1.0.x | ✓ |
| 4b Dual alias | | |
| 4c Alias only | | |

**User's choice:** 1a, 2a, 3a, 4a

---

## deployment.logs vs application.logs

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Action on deployment tool | | ✓ |
| 1b New top-level tool | | |
| 1c Alias only | | |
| 2a Keep application.logs build path | Back-compat; steer via docs | ✓ |
| 2b Soft-deprecate warning | | |
| 2c Hard remove | | |
| 3a Separate from watch include_logs | | ✓ |
| 3b Watch routes to logs | | |
| 3c Deprecate include_logs | | |
| 4a deployment_uuid only | | |
| 4b deployment_uuid OR application_uuid | | ✓ |
| 4c Both required | | |
| Latest = any status by timestamp | Follow-up on 4b | ✓ |
| Latest = terminal only | | |
| Latest = successful only | | |

**User's choice:** 1a, 2a, 3a, 4b, latest=a

---

## Log-Output-Vertrag

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Full param parity | | ✓ |
| 1b Minimal params | | |
| 1c max_chars only | | |
| 2a Reuse log-helpers | | |
| 2b New helpers | | |
| 2c Claude decides at research | | ✓ |
| 3a Same shape as application.logs build | | |
| 3b Slimmer shape | | |
| 3c Claude decides at research | | ✓ |
| 4a Soft empty OK | | ✓ |
| 4b Error if no logs | | |
| 4c Soft if running else error | | |

**User's choice:** 1a, 2c, 3c, 4a

---

## Extra gray areas

### Flag-Payload-Schema
**User's choice:** 1a — per key `{ supported, coolify_min_version, note? }`

### Kein Deployment bei application_uuid
**User's choice:** 2a — structured error + recovery hint

### Docs/Prompts Scope Phase 24
**User's choice:** 3a — catalog + tool desc + short README; deploy prompt only if needed; incident → Phase 26

### diagnose im Capability-Set
**User's choice:** 4b — no diagnose flag; four keys only

---

## Claude's Discretion

- Log helper reuse vs extraction (prefer reuse)
- Exact response envelope beyond resolved deployment_uuid
- Exact capability note / min_version strings
- Whether meta.version also emits capabilities (default no)

## Deferred Ideas

- OpenAPI multi-version archive + CI sync
- incident prompt / diagnose.logs docs (Phase 26)
- Application log follow (Phase 25)
- Service/DB log capabilities (4.2.0+ / v3.3)
- Hard capability enforcement
- Retiring meta.version
