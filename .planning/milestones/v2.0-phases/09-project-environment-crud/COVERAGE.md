# Phase 09 — Coolify API Coverage Matrix (Projects & Environments)

**Authored:** 2026-07-17
**Source:** `docs/coolify_openapi.yaml` (lines 5493-5820) + spike findings `coolify-v412-endpoints.md`
**Scope fence:** PROJ-01..05 only. No app/service/db CRUD (Phases 10-11). No env var sync (Phase 12). No multi-instance (v2.x).

```coverage
[
  {"capability": "GET /projects (project.list)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "POST /projects (project.create)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "GET /projects/{uuid} (project.get)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "PATCH /projects/{uuid} (project.update)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "DELETE /projects/{uuid} (project.delete)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "GET /projects/{uuid}/environments (environment.list)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "POST /projects/{uuid}/environments (environment.create)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "GET /projects/{uuid}/{environment_name_or_uuid} (environment.get)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "DELETE /projects/{uuid}/environments/{env} (environment.delete)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "GET /resources (emptiness pre-check)", "decision": "INTEGRATE", "reason": ""},
  {"capability": "resource.list type=project or environment", "decision": "INTEGRATE", "reason": ""},
  {"capability": "Environment update (PATCH)", "decision": "OPT-OUT", "reason": "API gap — no PATCH endpoint in OpenAPI (PROHIB_ABSENT)"},
  {"capability": "Cascade / force delete non-empty project or environment", "decision": "OPT-OUT", "reason": "Scope fence — CONTEXT D-06/D-07: hard-block with COOLIFY_409, no force/cascade"},
  {"capability": "Application / service / database CRUD", "decision": "OPT-OUT", "reason": "Scope fence — Phases 10-11"},
  {"capability": "Env var CRUD / .env sync", "decision": "OPT-OUT", "reason": "Scope fence — Phase 12"},
  {"capability": "Multi-instance / instances.json", "decision": "OPT-OUT", "reason": "Scope fence — v2.x"},
  {"capability": "Auto-delete unsolicited production env on project create", "decision": "OPT-OUT", "reason": "Hard constraint — CONTEXT D-09: never auto-delete extras; surface in environments[]"}
]
```

## Coverage Decision Table

| Coolify Endpoint | Method | v4.1.2 Status | MCP Action | Disposition | Requirement | Decision Rationale |
|-----------------|--------|---------------|------------|-------------|-------------|--------------------|
| `/projects` | GET | EXISTS | `project.list` | INTEGRATE | D-02 | Domain-tool list per Phase 8 private_key.list parity |
| `/projects` | POST | EXISTS | `project.create` | INTEGRATE | PROJ-01, D-09, D-10, D-11 | Required; initial_environment ensures env UUID returned |
| `/projects/{uuid}` | GET | EXISTS | `project.get` (by uuid) | INTEGRATE | D-14 | uuid XOR name resolution |
| `/projects/{uuid}` | PATCH | EXISTS | `project.update` | INTEGRATE | PROJ-02 | Update name/description |
| `/projects/{uuid}` | DELETE | EXISTS | `project.delete` | INTEGRATE | PROJ-03, D-05, D-07 | Confirm gate + non-empty 409 (env count pre-check) |
| `/projects/{uuid}/environments` | GET | EXISTS | `environment.list` | INTEGRATE | D-03 | Scoped by project_uuid XOR project_name |
| `/projects/{uuid}/environments` | POST | EXISTS | `environment.create` | INTEGRATE | PROJ-04, D-12, D-15 | Duplicate name → API 409 → COOLIFY_409 with hint |
| `/projects/{uuid}/{environment_name_or_uuid}` | GET | EXISTS | `environment.get` | INTEGRATE | D-13 | Coolify resolves name OR uuid server-side |
| `/projects/{uuid}/environments/{environment_name_or_uuid}` | DELETE | EXISTS | `environment.delete` | INTEGRATE | PROJ-05, D-05, D-06 | Confirm gate + non-empty 409 (child resource pre-check via /resources) |
| `/resources` | GET | EXISTS | (internal) emptiness pre-check | INTEGRATE | D-06, D-07 | Client-side emptiness for reliable COOLIFY_409 child UUIDs (RESEARCH pitfall 2) |
| `resource.list` type enum | — | n/a | extend with `project` \| `environment` | INTEGRATE | D-04, Success Criteria #4 | Discovery surface for projects + environments |

## OPT-OUT Items

| Endpoint / Capability | Reason | Status |
|-----------------------|--------|--------|
| Environment update (PATCH `/projects/{uuid}/environments/{env}`) | **API gap** — no PATCH endpoint in OpenAPI (PROHIB_ABSENT) | OPT-OUT (omit, do not stub) |
| Cascade / force delete of non-empty project or environment | **Scope fence** — CONTEXT D-06/D-07: hard-block with COOLIFY_409, no force/cascade | OPT-OUT |
| Application / service / database CRUD | **Scope fence** — Phases 10-11 | OPT-OUT |
| Env var CRUD / `.env` sync | **Scope fence** — Phase 12 | OPT-OUT |
| Multi-instance / `instances.json` | **Scope fence** — v2.x | OPT-OUT |
| Auto-delete of unsolicited `production` env on project create | **Hard constraint** — CONTEXT D-09: never auto-delete extras; surface in `environments[]` | OPT-OUT (never) |

## Per-Requirement Coverage

| Requirement | MCP Action(s) | Endpoint(s) | Plan |
|-------------|---------------|--------------|------|
| PROJ-01 (create project) | `project.create` | POST /projects + POST /projects/{uuid}/environments | 09-02 |
| PROJ-02 (update project) | `project.update` | PATCH /projects/{uuid} | 09-02 |
| PROJ-03 (delete project + confirm) | `project.delete`, `project.delete_preview` | DELETE /projects/{uuid} + GET /projects/{uuid}/environments (pre-check) | 09-02 |
| PROJ-04 (create environment) | `environment.create` | POST /projects/{uuid}/environments | 09-03 |
| PROJ-05 (delete environment + confirm, empty only) | `environment.delete`, `environment.delete_preview` | DELETE /projects/{uuid}/environments/{name_or_uuid} + GET /resources (pre-check) | 09-03 |

## Coverage Summary

- **Endpoints in scope:** 9 (all EXISTS in v4.1.2)
- **INTEGRATE:** 9 endpoints + 1 internal pre-check + 1 resource.list extension = 11 capabilities
- **OPT-OUT:** 6 items (1 API gap + 5 scope fences)
- **Coverage:** 100% of PROJ-01..05; 100% of D-01..D-15 implemented or explicitly prohibited
- **No stubs:** Environment update omitted entirely per spike directive "KEINE Tools die nicht funktionieren"

## Verification

- All INTEGRATE rows mapped to a plan task with `<acceptance_criteria>` asserting the endpoint is called
- All OPT-OUT rows lifted into `must_haves.prohibitions` in the relevant PLAN.md
- OpenAPI line references: `/projects` 5493, `/projects/{uuid}` 5556, `/projects/{uuid}/{env_name_or_uuid}` 5671, `/projects/{uuid}/environments` 5711, `/projects/{uuid}/environments/{env_name_or_uuid}` 5793
