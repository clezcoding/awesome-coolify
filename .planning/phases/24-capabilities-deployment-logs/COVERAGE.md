# Phase 24 — Coolify API Coverage Decision

**Phase:** 24-capabilities-deployment-logs  
**Scope:** Version capabilities (`system.version`) + deployment build logs (`deployment.logs`) — not the entire Coolify API.  
**Target:** Coolify 4.1.2 (pinned OpenAPI in `docs/coolify_openapi.json`).

## Coverage Matrix

| Coolify / MCP surface | OpenAPI / source | Decision | Reason |
|----------------------|------------------|----------|--------|
| `GET /version` | OpenAPI version endpoint | **INTEGRATE** | CAP-01 — Coolify server version via `system.version` → `coolifyVersion` |
| MCP `package.json` version | Local package metadata (not Coolify) | **INTEGRATE** | CAP-01 — `mcpVersion` via `readPackageVersion()` |
| Static capability flags | MCP-side table (not an OpenAPI path) | **INTEGRATE** | CAP-02 — `COOLIFY_412_CAPABILITIES` on `system.version` |
| `GET /deployments/{uuid}` (`logs` field) | `ApplicationDeploymentQueue.logs` | **INTEGRATE** | OBS-01 — build logs via `deployment.logs` / shared processor |
| `GET /deployments/applications/{uuid}` | App deployments list | **INTEGRATE** | D-13 — resolve newest deployment when only `application_uuid` given |
| `GET /applications/{uuid}/logs` | Runtime application logs | **OPT-OUT** (this phase) | Already integrated as `application.logs`; Phase 24 does not change runtime path (Phase 25 follow) |
| `application.logs` + `deployment_uuid` build path | Same `GET /deployments/{uuid}` | **KEEP** (back-compat) | D-11 — retain; docs steer to `deployment.logs` |
| `deployment.watch` `include_logs` | Same deployment GET, capped snapshot | **KEEP** (separate) | D-12 — do not route watch through `deployment.logs` |
| Service / DB log endpoints | Absent on 4.1.2 | **OPT-OUT** | Spike + CONTEXT deferred to v3.3 / SVC-04 |
| OpenAPI multi-version archive | N/A | **OPT-OUT** | Deferred — too heavy for capability flags |
| `diagnose` / `diagnose_logs` capabilities | N/A | **OPT-OUT** | D-03 — Phase 26 |
| Runtime OpenAPI diff for capabilities | N/A | **OPT-OUT** | D-02 — static table only |
| Hard Zod capability gating | N/A | **OPT-OUT** | D-04 — soft guidance only |

## Requirement Trace

| Req | Surfaces | Status |
|-----|----------|--------|
| CAP-01 | `GET /version` + `package.json` | Planned 24-01 |
| CAP-02 | Static `COOLIFY_412_CAPABILITIES` | Planned 24-01 |
| OBS-01 | `GET /deployments/{uuid}` (+ app deployments list) | Planned 24-02; coverage-map 24-00/24-03 |

## Notes

- Capability flags are **not** Coolify REST resources; they are an MCP discovery contract curated for 4.1.2.
- `docs/coverage-map.yaml` row for `deployment.logs` maps client helpers `fetchDeployment`, `fetchAppDeployments` to the OpenAPI paths above.
