# Phase 18: Live UAT Harness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 18-live-uat-harness
**Areas discussed:** Lauf-Modus, Ziel-Isolation, Schreib-/Destructive-Coverage, Coverage-Matrix, Report & CI

---

## Lauf-Modus

### Q1 Tool-Anbindung
| Option | Description | Selected |
|--------|-------------|----------|
| MCP-stdio-Child | Spawn dist, full client path | |
| In-Process Handler | Direct handlers, miss transport | |
| Hybrid | Stdio smoke/critical + in-process mass | ✓ |

**User's choice:** Hybrid

### Q2 Entry-Point
| Option | Description | Selected |
|--------|-------------|----------|
| npm run uat:live | Discoverable package script | ✓ |
| Nur node scripts/… | No package.json script | |
| Zwei Scripts | Smoke vs full split | |

**User's choice:** `npm run uat:live`
**Notes:** Script must NEVER be deployed or published (npm). Clarified later as tracked-in-repo + npm exclude.

### Q3 Repo vs publish
| Option | Description | Selected |
|--------|-------------|----------|
| Gitignored + example template | Like old test-mcp-stdio | |
| Completely local only | No committed harness | |
| Tracked + npm exclude | In git, not in package | ✓ |

**User's choice:** Tracked + npm exclude

### Q4 Stdio boundary
| Option | Description | Selected |
|--------|-------------|----------|
| Stdio: list + 1 read/tool + v3; rest in-process | ✓ | ✓ |
| Stdio handshake only | | |
| Stdio default with --fast opt-out | | |

**User's choice:** Stdio smoke + v3 paths required

---

## Ziel-Isolation

### Q1 Target resources
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated UAT project | Refuse mismatch | ✓ |
| Any instance + filters | | |
| --safe / --any modes | | |

**User's choice:** Dedicated UAT project

### Q2 Project creation
| Option | Description | Selected |
|--------|-------------|----------|
| Manual prerequisite | CONTRIBUTING + env | ✓ |
| Optional --setup | | |
| Always auto-create | | |

**User's choice:** Manual

### Q3 Cleanup
| Option | Description | Selected |
|--------|-------------|----------|
| No auto-cleanup | ✓ | ✓ |
| Opt-in --cleanup | | |
| Always cleanup after writes | | |

**User's choice:** No auto-cleanup

### Q4 Identity
| Option | Description | Selected |
|--------|-------------|----------|
| UAT_PROJECT_UUID only | Exact match or abort | ✓ |
| Name convention | | |
| UUID + optional name check | | |

**User's choice:** UUID only

---

## Schreib-/Destructive-Coverage

### Q1 Default run
| Option | Description | Selected |
|--------|-------------|----------|
| Read-only default | ✓ | ✓ |
| Read + mild writes | | |
| Full suite default | | |

**User's choice:** Read-only

### Q2 Flags
| Option | Description | Selected |
|--------|-------------|----------|
| --write + --confirm-destructive | Two-tier | ✓ |
| Single --confirm-destructive | | |
| --write covers deletes | | |

**User's choice:** Two-tier

### Q3 Destructive definition
| Option | Description | Selected |
|--------|-------------|----------|
| Deletes + emergency bulk + manifest prune | ✓ | ✓ |
| All mutating | | |
| Irreversible deletes only | | |

**User's choice:** Deletes + emergency + prune

### Q4 Missing flag
| Option | Description | Selected |
|--------|-------------|----------|
| Skip with skipped status | | |
| Fail hard | | |
| Dry-run preview (planned) | ✓ | ✓ |

**User's choice:** Dry-run preview

---

## Coverage-Matrix

### Q1 Depth
| Option | Description | Selected |
|--------|-------------|----------|
| Representatives + --full | ✓ | ✓ |
| Every action default | | |
| v3 tools only default | | |

**User's choice:** Representatives + `--full`

### Q2 v3 minimum
| Option | Description | Selected |
|--------|-------------|----------|
| Fixed list (instance/cloud/manifest) | ✓ | ✓ |
| tools/list presence only | | |
| Full CRUD default | | |

**User's choice:** Fixed list

### Q3 Missing preconditions
| Option | Description | Selected |
|--------|-------------|----------|
| Skip + v3_gaps | ✓ | ✓ |
| Fail hard | | |
| Warn stderr only | | |

**User's choice:** Skip + v3_gaps

### Q4 Matrix location
| Option | Description | Selected |
|--------|-------------|----------|
| Declarative committed file | ✓ | ✓ |
| Hardcoded in script | | |
| Docs-only table | | |

**User's choice:** Declarative file

---

## Report & CI

### Q1 Report destination
| Option | Description | Selected |
|--------|-------------|----------|
| Stdout + optional --out | ✓ | ✓ |
| Always file under .coolify/ | | |
| Stdout only | | |

**User's choice:** Stdout + `--out`

### Q2 Report form
| Option | Description | Selected |
|--------|-------------|----------|
| JSON + stderr summary | | |
| JSON only | | |
| JSON + Markdown | ✓ | ✓ |

**User's choice:** JSON + Markdown

### Q3 CI
| Option | Description | Selected |
|--------|-------------|----------|
| No CI job | ✓ | ✓ |
| workflow_dispatch with secrets | | |
| PR required check | | |

**User's choice:** No CI
**Notes:** Explicit: **Keine Secrets auf Github oder sonst wo.**

### Q4 Exit codes
| Option | Description | Selected |
|--------|-------------|----------|
| 0 / 1 / 2 (fail / setup abort) | ✓ | ✓ |
| Nonzero on v3_gaps | | |
| Always 0 | | |

**User's choice:** 0 / 1 / 2

---

## Claude's Discretion

- Matrix filename shape; MD output pairing; exact stdio read-per-tool mapping; fold of milestone-optional script; optional stderr summary beside MD.

## Deferred Ideas

- Custom IDE Skills (v3.1)
- Setup wizard tool (v3.1)
- Official OpenAPI specs integration
- Manifest todo (already Phase 17)
