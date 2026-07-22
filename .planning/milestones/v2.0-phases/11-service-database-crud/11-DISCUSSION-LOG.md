# Phase 11: Service & Database CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 11-Service & Database CRUD
**Areas discussed:** Service-Create-Oberfläche, Compose I/O, Database-Create-Oberfläche, Instant-Deploy & Public Access

---

## Service-Create-Oberfläche

### Q1: service.create shape
| Option | Description | Selected |
|--------|-------------|----------|
| Single create + discriminator | `type` XOR `compose`; one Coolify POST | ✓ |
| Two actions | `create_one_click` + `create_compose` | |
| You decide | Researcher/planner within Phase 10 patterns | |

**User's choice:** Single create with discriminator
**Notes:** Matches app `source_type` pattern

### Q2: One-click type constraint
| Option | Description | Selected |
|--------|-------------|----------|
| Free string + examples | Coolify list grows; API validates | |
| Curated Zod enum | Stricter; maintenance burden | |
| You decide | Researcher checks OpenAPI/live list | ✓ |

**User's choice:** Claude's discretion

### Q3: urls on create
| Option | Description | Selected |
|--------|-------------|----------|
| Optional urls[] | `{name,url}`; also via update | ✓ |
| Required on compose create | Validation error without URLs | |
| Update only | Create without URLs | |

**User's choice:** Optional urls[]

### Q4: Create scoping
| Option | Description | Selected |
|--------|-------------|----------|
| Like app Phase 10 | server_uuid + project XOR name + env; no silent production | ✓ |
| UUID-only | No name resolution | |
| You decide | Mirror or tighten resolver | |

**User's choice:** Like app Phase 10

---

## Compose I/O

### Q1: Compose input mode
| Option | Description | Selected |
|--------|-------------|----------|
| YAML + compose_file XOR | Like private_key PEM/key_file | ✓ |
| YAML string only | No file path | |
| File path only | Bad for chat agents | |

**User's choice:** YAML XOR compose_file

### Q2: Compose in responses
| Option | Description | Selected |
|--------|-------------|----------|
| Always decoded YAML | Agent never sees base64 | ✓ |
| Raw API passthrough | May include base64 | |
| Dual with raw flag | Default YAML + raw:true | |

**User's choice:** Always decoded YAML

### Q3: YAML validation before encode
| Option | Description | Selected |
|--------|-------------|----------|
| Light parse checks | non-empty + parseable; COOLIFY_VALIDATION_ERROR | ✓ |
| No validation | Encode only | |
| Strict compose schema | Overkill | |

**User's choice:** Light YAML parse checks

### Q4: MCP field name
| Option | Description | Selected |
|--------|-------------|----------|
| compose | API docker_compose_raw internal | ✓ |
| docker_compose_raw | Confusing "raw" name | |
| You decide | Planner naming | |

**User's choice:** compose

---

## Database-Create-Oberfläche

### Q1: database.create shape
| Option | Description | Selected |
|--------|-------------|----------|
| create + engine | Maps to 8 POST routes | ✓ |
| Eight actions | create_postgresql, … | |
| You decide | Within action-schema patterns | |

**User's choice:** create + engine discriminator

### Q2: Passwords / credentials
| Option | Description | Selected |
|--------|-------------|----------|
| Caller supplies | No MCP generate; mask unless reveal | ✓ |
| MCP generates if missing | One-time plaintext return | |
| Coolify auto defaults | API-dependent | |

**User's choice:** Caller-supplied only

### Q3: Engine-specific fields
| Option | Description | Selected |
|--------|-------------|----------|
| Curated per engine | Like app Phase 10 | |
| Near-full OpenAPI passthrough | Fat schemas | |
| You decide | Researcher allowlist from OpenAPI | ✓ |

**User's choice:** Claude's discretion

### Q4: Scoping + connection strings
| Option | Description | Selected |
|--------|-------------|----------|
| Like app/service + SAF-04 masking | reveal opt-in | ✓ |
| UUID-only scoping | Same masking | |
| Never return connection string | Stricter than SAF-04 | |

**User's choice:** Like app/service + SAF-04

---

## Instant-Deploy & Public Access

### Q1: instant_deploy default / wait
| Option | Description | Selected |
|--------|-------------|----------|
| Default false, fire-and-forget | Phase 10 app parity | |
| Default true, fire-and-forget | Start immediately; no poll | ✓ |
| Wait until running | Blocks MCP turn | |

**User's choice:** Default true (product override vs apps)
**Notes:** Wait model still fire-and-forget — no poll until running

### Q2: Public on database create
| Option | Description | Selected |
|--------|-------------|----------|
| Create+update, default private | No confirm | |
| Update only | Create always private | |
| Create public needs confirm:true | Security gate | ✓ |

**User's choice:** confirm required to create publicly exposed DB

### Q3: Public on database update
| Option | Description | Selected |
|--------|-------------|----------|
| Flag alone | Like force_domain_override | |
| confirm also on update enable | Mirror create | |
| You decide | Planner chooses | ✓ |

**User's choice:** Claude's discretion

### Q4: Partial failure create OK / start fail
| Option | Description | Selected |
|--------|-------------|----------|
| Soft success | UUID kept; failed_to_queue + hints | ✓ |
| Hard fail orphan | Error; resource remains | |
| Auto-rollback delete | Destructive | |

**User's choice:** Soft success

---

## Claude's Discretion

- One-click `type`: free string vs curated enum
- Per-engine / service-update field allowlists from OpenAPI
- Whether `is_public: true` on database **update** needs `confirm: true`
- Helper extraction vs copy for compose encode/decode and safety patterns
- Exact Coolify field mapping for DB instant start after create

## Deferred Ideas

- Reviewed todos (all five) explicitly not folded — see CONTEXT.md `<deferred>`
- Phase 12 env vars, Phase 13 backups, SVC-04 logs
