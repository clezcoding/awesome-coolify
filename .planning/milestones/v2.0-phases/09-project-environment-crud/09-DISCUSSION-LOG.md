# Phase 9: Project & Environment CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 9-Project & Environment CRUD
**Areas discussed:** Tool-Oberfläche & Discovery, Delete & Dependency UX, Default-Environment bei Project-Create, Scoping / Name-Resolution

---

## Tool-Oberfläche & Discovery

### Tool split
| Option | Description | Selected |
|--------|-------------|----------|
| Two tools `project` + `environment` | Roadmap/Phase-8 style | ✓ |
| Nested under `project` | Fewer tools, denser schema | |
| You decide | Planner discretion | |

**User's choice:** Two tools
**Notes:** Matches recommendation.

### Project list
| Option | Description | Selected |
|--------|-------------|----------|
| `project.list` on domain tool | Like private_key.list | ✓ |
| Only `resource.list type=project` | Like server | |
| Both | Duplicate surface | |

**User's choice:** `project.list` (via `^` = recommendation)
**Notes:** —

### Environment discovery
| Option | Description | Selected |
|--------|-------------|----------|
| `environment.list` + `environment.get` | Scoped list + get | ✓ |
| Via `project.get` nested only | | |
| Only `resource.list` | | |

**User's choice:** list + get
**Notes:** Matches recommendation.

### resource.list extension
| Option | Description | Selected |
|--------|-------------|----------|
| Add `project` + `environment` types | Success criteria #4 | ✓ |
| Project only | | |
| No extension | | |

**User's choice:** Add both types
**Notes:** Matches recommendation.

---

## Delete & Dependency UX

### Confirm / preview
| Option | Description | Selected |
|--------|-------------|----------|
| Two-stage `delete_preview` | Phase 8 pattern | ✓ |
| Emergency-style inline preview | | |
| Minimal confirm only | | |

**User's choice:** Two-stage
**Notes:** Matches recommendation / Phase 8.

### Non-empty environment
| Option | Description | Selected |
|--------|-------------|----------|
| Hard-block `COOLIFY_409` | PROJ-05 / SC #5 | ✓ |
| Passthrough API errors | | |
| Force cascade | Out of scope | |

**User's choice:** Hard-block 409
**Notes:** Matches recommendation.

### Non-empty project
| Option | Description | Selected |
|--------|-------------|----------|
| Hard-block if any envs remain | | ✓ |
| Empty = no resources in envs | | |
| Preview warn, delete allowed | Server-style | |

**User's choice:** Hard-block if envs exist
**Notes:** Matches recommendation.

### Preview mandatory?
| Option | Description | Selected |
|--------|-------------|----------|
| Strict — preview required | | |
| Optional/recommended | confirm is the gate | ✓ |
| Hybrid — missing confirm embeds preview | | |

**User's choice:** Optional
**Notes:** Phase 8 parity.

---

## Default-Environment bei Project-Create

### Default behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Accept API default silently | Recommended initially | |
| Always explicit `environment.create` | | |
| `with_default_env` flag | | |
| Ask user: production vs custom | | ✓ |

**User's choice:** Ask user when unspecified
**Notes:** User **overrode** silent-API recommendation — product intent.

### Enforcement
| Option | Description | Selected |
|--------|-------------|----------|
| Required `initial_environment` on create | Validation error + ask-user hint | ✓ |
| Soft description/hint only | | |
| Two-step notice after create | | |

**User's choice:** Required field
**Notes:** Matches recommendation.

### API auto-env conflict
| Option | Description | Selected |
|--------|-------------|----------|
| Idempotent sync, keep extras | | |
| Strict match / auto-delete extras | | |
| You decide after research | | ✓ |

**User's choice:** Claude discretion after live research
**Notes:** Soft constraint: never auto-delete unsolicited envs.

### Create response
| Option | Description | Selected |
|--------|-------------|----------|
| Project + initial environment | | ✓ |
| Minimal project UUID only | | |
| Full project.get projection | | |

**User's choice:** Project + initial env
**Notes:** Matches recommendation.

---

## Scoping / Name-Resolution

### Project parent for env actions
| Option | Description | Selected |
|--------|-------------|----------|
| `project_uuid` XOR `project_name` + ambiguity | Phase 5 pattern | ✓ |
| UUID only | | |
| UUID \| name \| fuzzy | Rejected (P4) | |

**User's choice:** uuid\|name + ambiguity
**Notes:** Matches recommendation.

### Environment identity
| Option | Description | Selected |
|--------|-------------|----------|
| uuid \| name in project scope | OpenAPI | ✓ |
| UUID only | | |
| Global env UUID without project | Needs research | |

**User's choice:** uuid\|name in scope
**Notes:** Matches recommendation.

### Project tool identity
| Option | Description | Selected |
|--------|-------------|----------|
| uuid \| name + ambiguity | | ✓ |
| UUID only for mutations | | |
| Asymmetric get vs mutate | | |

**User's choice:** uuid\|name + ambiguity
**Notes:** Matches recommendation.

### Duplicate env name
| Option | Description | Selected |
|--------|-------------|----------|
| `COOLIFY_409` + recovery hint | | ✓ |
| `COOLIFY_422` | | |
| Idempotent return existing | | |

**User's choice:** COOLIFY_409
**Notes:** Matches recommendation; no overwrite.

---

## Claude's Discretion

- Live Coolify auto-environment-on-project-create behavior and safe sync strategy (within no-auto-delete constraint)
- Exact Zod XOR / resolver wiring details
- Client-side emptiness pre-check vs API error mapping for 409

## Deferred Ideas

- Custom Skills pro IDE für Coolify
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten
- MCP Server für Coolify Cloud erweitern
- Standard-Setup Tool für neue Coolify-Projekte
- Force/cascade delete
- Environment update (no API)
- Multi-instance
