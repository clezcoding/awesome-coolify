# Phase 8: Keys & Server CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 8-Keys & Server CRUD
**Areas discussed:** PEM-Eingabe & Masking, Validate nach Server-Create, List-/Discover-Oberfläche, Delete- & Dependency-UX

---

## PEM-Eingabe & Masking

### PEM source
| Option | Description | Selected |
|--------|-------------|----------|
| Inline only | PEM string in tool args | |
| File only | `key_file` path read by MCP | |
| Both XOR | Exactly one of inline or path | ✓ |

**User's choice:** Both XOR
**Notes:** Matches recommendation.

### Get PEM policy
| Option | Description | Selected |
|--------|-------------|----------|
| Metadata only, no reveal | | |
| Metadata + reveal:true | | |
| Never PEM via MCP | Including no reveal path | ✓ |

**User's choice:** Never PEM
**Notes:** Matches recommendation; stricter than SAF-04 for app secrets.

### Update scope
| Option | Description | Selected |
|--------|-------------|----------|
| Metadata only | | |
| Metadata + PEM rotation | | |
| You decide | Claude discretion after API check | ✓ |

**User's choice:** You decide
**Notes:** Preference noted: rotation if API supports.

### Create response
| Option | Description | Selected |
|--------|-------------|----------|
| Minimal uuid+name | | |
| With fingerprint | | ✓ |
| Full metadata projection | | |

**User's choice:** With fingerprint
**Notes:** Matches recommendation.

---

## Validate nach Server-Create

### After-create behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Blocking until done | | |
| Fire-and-forget (D-10 style) | | |
| Auto-validate with timeout | | ✓ |

**User's choice:** Timeout
**Notes:** Matches recommendation.

### Opt-out flag
| Option | Description | Selected |
|--------|-------------|----------|
| Always validate | | |
| skip_validate | | |
| validate default true | | ✓ |

**User's choice:** `validate` default true
**Notes:** Matches recommendation.

### Unreachable after create
| Option | Description | Selected |
|--------|-------------|----------|
| Hard error | | |
| Soft success + hints | Keep UUID | ✓ |
| Hard error + auto-rollback | | |

**User's choice:** Soft success
**Notes:** Matches recommendation; COOLIFY_SSH_UNREACHABLE mapping TBD by research.

### On-demand validate
| Option | Description | Selected |
|--------|-------------|----------|
| Wait like create | | ✓ |
| Fire-and-forget D-10 | | |
| Dual wait flag | | |

**User's choice:** Wait like create
**Notes:** Matches recommendation; diagnose D-10 stays separate.

---

## List-/Discover-Oberfläche

### Where list private keys
| Option | Description | Selected |
|--------|-------------|----------|
| private_key.list | | ✓ |
| resource only | | |
| Both | | |

**User's choice:** private_key.list
**Notes:** Matches recommendation; keys not in resource.

### Where list servers
| Option | Description | Selected |
|--------|-------------|----------|
| server.list | | |
| resource only (+ list type=server) | | ✓ |
| Both | | |

**User's choice:** resource only
**Notes:** Matches recommendation.

### private_key.list read params
| Option | Description | Selected |
|--------|-------------|----------|
| Full shared incl reveal | | |
| Shared without reveal | | ✓ |
| Minimal page only | | |

**User's choice:** Shared without reveal
**Notes:** Matches recommendation; reveal → COOLIFY_422.

### server.get vs diagnose
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated server.get | | ✓ |
| No get — use diagnose | | |
| Thin get | | |

**User's choice:** Dedicated server.get
**Notes:** Matches recommendation; no validate side-effect on get.

---

## Delete- & Dependency-UX

### Confirm preview style
| Option | Description | Selected |
|--------|-------------|----------|
| Emergency-style inline preview | Recommended | |
| Minimal confirm only | | |
| Two-stage delete_preview action | | ✓ |

**User's choice:** Two-stage preview action
**Notes:** User **overrode** recommendation (emergency-style).

### Key referenced by servers
| Option | Description | Selected |
|--------|-------------|----------|
| Hard 409 only | | |
| 409 + force | | |
| Preview blocks + 409 | | ✓ |

**User's choice:** Preview shows blockers; delete fails with 409 if deps > 0
**Notes:** Matches recommendation; no force in Phase 8.

### Server delete children
| Option | Description | Selected |
|--------|-------------|----------|
| Safe defaults only | | |
| Preview children as warning | | ✓ |
| Hard-block if children | | |

**User's choice:** Preview children warn; delete still allowed
**Notes:** Matches recommendation; delete_volumes default false.

### Preview mandatory?
| Option | Description | Selected |
|--------|-------------|----------|
| Strict — preview required before delete | | |
| Optional/recommended | confirm:true is the gate | ✓ |
| Hybrid — missing confirm embeds preview | | |

**User's choice:** Optional/recommended
**Notes:** Matches recommendation.

---

## Claude's Discretion

- private_key.update: metadata + PEM rotation if API supports, else metadata-only
- Validate timeout duration / poll strategy
- Exact wiring of COOLIFY_SSH_UNREACHABLE and COOLIFY_409 envelopes

## Deferred Ideas

- Custom Skills pro IDE für Coolify
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten
- MCP Server für Coolify Cloud erweitern
- Standard-Setup Tool für neue Coolify-Projekte
- Force-delete of in-use keys
- Hard-block server delete when children exist
- Multi-instance
