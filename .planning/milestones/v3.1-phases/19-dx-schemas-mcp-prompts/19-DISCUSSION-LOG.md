# Phase 19: DX Schemas & MCP Prompts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 19-DX Schemas & MCP Prompts
**Areas discussed:** Schema-Flattening-Strategie, Action-Katalog in Tool-Descriptions, MCP-Prompt Inhaltstiefe, Prompt-Argumente & Naming

---

## Todos (pre-discuss)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold none | Defer all 4 matching todos to later phases | ✓ |
| Fold individual todos | Skills / manifest / setup / OpenAPI | |

**User's choice:** A:1 — fold none
**Notes:** All matches scored 0.6 but belong to Phases 22/23 or existing v3.0 work.

---

## Schema-Flattening-Strategie

### Q1 — Flatten approach
| Option | Description | Selected |
|--------|-------------|----------|
| Voll-flat Zod + superRefine | No top-level oneOf | ✓ |
| Dual-layer adapter | Internal union, external flat JSON Schema | |
| Descriptions only | Keep oneOf | |

### Q2 — Scope
| Option | Description | Selected |
|--------|-------------|----------|
| All domain tools | Consistent surface | ✓ |
| High-action tools only | | |
| Staged pilot | | |

### Q3 — Call shape
| Option | Description | Selected |
|--------|-------------|----------|
| Keep `{ action, … }` | Non-breaking | ✓ |
| Breaking rename | | |
| Alias period | | |

### Q4 — Validation strictness
| Option | Description | Selected |
|--------|-------------|----------|
| Strict + recoveryHints | | ✓ |
| Loose ignore extras | | |
| You decide | | |

**User's choice:** 1,1,1,1 then Next area
**Notes:** Aligns with PITFALLS Pitfall 10 and research SUMMARY.

---

## Action-Katalog in Tool-Descriptions

### Q1 — Richness
| Option | Description | Selected |
|--------|-------------|----------|
| Compact catalog (actions + key params) | | ✓ |
| Action names only | | |
| Full field docs in description | | |

### Q2 — Source
| Option | Description | Selected |
|--------|-------------|----------|
| Hand-maintained | | ✓ |
| Generated from Zod | | |
| Hybrid generator | | |

### Q3 — Location
| Option | Description | Selected |
|--------|-------------|----------|
| Co-located in tool module | | ✓ |
| Central map file | | |
| Only server.ts | | |

### Q4 — Safety footer
| Option | Description | Selected |
|--------|-------------|----------|
| Short footer (confirm / instance / reveal) | | ✓ |
| No footer | | |
| Long safety block | | |

**User's choice:** 1,1,1,1 then Next area (user replied `3` interpreted as Area 3)
**Notes:** —

---

## MCP-Prompt Inhaltstiefe

### Q1 — Depth
| Option | Description | Selected |
|--------|-------------|----------|
| Parameterized step guidance | | ✓ |
| Checklist only | | |
| Long playbooks | | |

### Q2 — Manifest
| Option | Description | Selected |
|--------|-------------|----------|
| Soft-context fallback hints | | ✓ |
| Hard-resolve in handler | | |
| No manifest | | |

### Q3 — deploy + watch
| Option | Description | Selected |
|--------|-------------|----------|
| Forward-ref watch + poll fallback | | ✓ |
| Current tools only | | |
| Defer prompt until Phase 21 | | |

### Q4 — Language
| Option | Description | Selected |
|--------|-------------|----------|
| English | | ✓ |
| German | | |
| Bilingual | | |

**User's choice:** 1,1,1,1 then Next area
**Notes:** —

---

## Prompt-Argumente & Naming

### Q1 — Names
| Option | Description | Selected |
|--------|-------------|----------|
| Exact REQUIREMENTS names | deploy, diagnose, new-project, incident | ✓ |
| Longer names | | |
| Namespaced | | |

### Q2 — Requiredness
| Option | Description | Selected |
|--------|-------------|----------|
| All args optional | | ✓ |
| Core required | | |
| Mixed | | |

### Q3 — Arg sets
| Option | Description | Selected |
|--------|-------------|----------|
| Shared instance? + minimal per-prompt | | ✓ |
| Only uuid? + instance? | | |
| Fat optional flags | | |

### Q4 — Code org
| Option | Description | Selected |
|--------|-------------|----------|
| src/mcp/prompts.ts + registerCoolifyPrompts | | ✓ |
| One file per prompt | | |
| Inline server.ts | | |

**User's choice:** 1,1,1,1 then Ready for context
**Notes:** ARCHITECTURE `diagnose-incident` example superseded by exact names.

---

## Claude's Discretion

- Exact catalog/prompt copy wording
- Shared flat-schema helper design
- Whether non-union tools (meta/docs) need a flattening pass

## Deferred Ideas

- IDE skills, setup wizard, OpenAPI coverage (todos + Phases 22–23)
- deployment.watch implementation (Phase 21)
- Recipes / list-types (Phase 20)
