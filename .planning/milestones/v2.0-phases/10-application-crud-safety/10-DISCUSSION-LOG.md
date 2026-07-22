# Phase 10: Application CRUD & Safety - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 10-application-crud-safety
**Areas discussed:** Create source-type surface, instant_deploy wait model, Domain conflict / force_domain_override, Update + HTTP basic-auth shape

---

## Create source-type surface

### Q1 — Create surface

| Option | Description | Selected |
|--------|-------------|----------|
| One create + source_type discriminator | Single action; Zod discriminatedUnion on source_type; 5 POSTs internally | ✓ |
| Five create_* actions | Flatter schemas; more literals on large application tool | |
| You decide | Planner discretion | |

**User's choice:** One create + source_type discriminator
**Notes:** Accepted recommendation

### Q2 — Project/environment scoping

| Option | Description | Selected |
|--------|-------------|----------|
| Both project and environment required | Validation error + ask-human hint; no silent production default | ✓ |
| Project required; env defaults to production | Convenient, riskier multi-env | |
| You decide | | |

**User's choice:** Both required
**Notes:** Accepted recommendation

### Q3 — Private git refs

| Option | Description | Selected |
|--------|-------------|----------|
| UUID only | No name lookup in Phase 10 | ✓ |
| UUID or name with lookup | Ambiguity errors on multi-match | |
| You decide | | |

**User's choice:** UUID only
**Notes:** Accepted recommendation

### Q4 — Payload breadth / dockercompose

| Option | Description | Selected |
|--------|-------------|----------|
| Curated fields; reject dockercompose | Validation error + hint to service.create | ✓ |
| Near-full OpenAPI passthrough; still reject dockercompose | Large schema | |
| You decide | | |

**User's choice:** Curated + reject dockercompose
**Notes:** Accepted recommendation

---

## instant_deploy wait model

### Q1 — Default

| Option | Description | Selected |
|--------|-------------|----------|
| default false | Safe; mirrors deploy.wait default | ✓ |
| default true | Create = ready to run | |
| You decide | | |

**User's choice:** default false
**Notes:** Accepted recommendation

### Q2 — Wait when instant_deploy true

| Option | Description | Selected |
|--------|-------------|----------|
| Fire-and-forget | UUID + queued; agent polls separately | ✓ |
| Optional wait on create | Like application.deploy wait | |
| Always wait | Block create until terminal | |

**User's choice:** Fire-and-forget
**Notes:** Accepted recommendation

### Q3 — Follow-up hints

| Option | Description | Selected |
|--------|-------------|----------|
| Follow-up hints (logs + wait) | P4/P5 parity | ✓ |
| Data only, no hints | | |
| You decide | | |

**User's choice:** Follow-up hints
**Notes:** Accepted recommendation

### Q4 — Partial failure

| Option | Description | Selected |
|--------|-------------|----------|
| Soft success, no rollback | Keep app UUID; deploy failed_to_queue | ✓ |
| Hard error for whole create | Inconsistent if app exists | |
| Auto-rollback delete app | | |

**User's choice:** Soft success, no rollback
**Notes:** Accepted recommendation

---

## Domain conflict / force_domain_override

### Q1 — Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Map Coolify 409 only | No MCP preflight | ✓ |
| MCP preflight + map 409 | Extra latency / race | |
| You decide | | |

**User's choice:** Map Coolify 409 only
**Notes:** Accepted recommendation

### Q2 — Where flag applies

| Option | Description | Selected |
|--------|-------------|----------|
| create + update | Same field; default false | ✓ |
| create only in Phase 10 | | |
| You decide | | |

**User's choice:** create + update
**Notes:** Accepted recommendation

### Q3 — Extra confirm

| Option | Description | Selected |
|--------|-------------|----------|
| force_domain_override only | confirm stays delete-only | ✓ |
| force_domain_override + confirm | | |
| You decide | | |

**User's choice:** force_domain_override only
**Notes:** Accepted recommendation

### Q4 — 409 payload

| Option | Description | Selected |
|--------|-------------|----------|
| Same COOLIFY_409 with domain hints + conflicts | Distinguish via conflicts vs dependent_uuids | ✓ |
| New COOLIFY_DOMAIN_CONFLICT code | | |
| You decide | | |

**User's choice:** Same COOLIFY_409 + conflicts
**Notes:** Accepted recommendation

---

## Update + HTTP basic-auth shape

### Q1 — Update field surface

| Option | Description | Selected |
|--------|-------------|----------|
| Curated update set | Roadmap fields + neighbors | ✓ |
| Near-full PATCH passthrough | | |
| You decide | | |

**User's choice:** Curated update set
**Notes:** Accepted recommendation

### Q2 — Basic-auth form

| Option | Description | Selected |
|--------|-------------|----------|
| Part of update | Coolify PATCH parity | ✓ |
| Dedicated basic_auth action | | |
| You decide | | |

**User's choice:** Part of update
**Notes:** Accepted recommendation

### Q3 — Credential source

| Option | Description | Selected |
|--------|-------------|----------|
| Caller-supplied only | No MCP generate | ✓ |
| Optional generate_password | | |
| You decide | | |

**User's choice:** Caller-supplied only
**Notes:** Accepted recommendation

### Q4 — Masking / reveal

| Option | Description | Selected |
|--------|-------------|----------|
| Always mask unless reveal true | SAF-04 | ✓ |
| Echo plaintext once on create/update | | |
| You decide | | |

**User's choice:** Always mask unless reveal true (`^` = accept recommendation)
**Notes:** User replied `^` meaning accept marked recommendation

---

## Claude's Discretion

- Curated field allowlists (exact OpenAPI subset)
- server_uuid vs server name resolution on create
- Delete/delete_preview for running apps (area 5 not selected — inherit Phase 8 server warn-and-allow)
- deployment_uuid extraction from create+instant_deploy responses
- Shared safety helper extraction vs copy patterns

## Deferred Ideas

- Todos reviewed not folded: Coolify Cloud MCP, custom IDE skills, local manifest, standard-setup tool, OpenAPI specs integration
- Phase 11/12/V2-GH items as listed in CONTEXT.md deferred section
