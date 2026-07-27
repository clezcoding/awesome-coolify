# Phase 22: Setup Wizard & IDE Skills - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 22-Setup Wizard & IDE Skills
**Areas discussed:** Setup surface, gh pause/resume, Wizard depth, Skill pack structure (Vercel skills)

---

## Folded / Reviewed Todos

| Todo | Action |
|------|--------|
| Custom Skills pro IDE für Coolify | Folded |
| Standard-Setup Tool für neue Coolify-Projekte | Folded |
| Lokale Projekt-Manifest-Datei | Reviewed — Phase 17 done |
| Integrate official Coolify OpenAPI specs | Reviewed — Phase 23 |

---

## Setup surface

| Option | Description | Selected |
|--------|-------------|----------|
| MCP tool `setup` | Agent-callable; headless-safe | ✓ |
| CLI only | Research sketch `setup-wizard.ts` | |
| Both | CLI + MCP dual surface | |

**User's choice:** 1a — MCP tool `setup`
**Notes:** CLI wrapper optional later under Claude discretion.

---

## gh pause/resume

| Option | Description | Selected |
|--------|-------------|----------|
| Soft-pause + resume | Structured needs_human; re-call resume | ✓ |
| Poll-loop in tool | Wait for gh auth with timeout | |
| Docs only | No resume action | |

**User's choice:** 2a — Soft-pause + resume
**Notes:** Never TTY-hang / indefinite stdin wait.

---

## Wizard depth

| Option | Description | Selected |
|--------|-------------|----------|
| Linkage only | project/env/server + manifest | |
| Linkage + gh repo create | No recipes in wizard | |
| Full greenfield | repo + app + recipes | ✓ (batch1 3c) |
| Maximal + domains/env/deploy+watch | Extended greenfield | ✓ (batch2 1c) |

**Follow-ups:**

| Option | Description | Selected |
|--------|-------------|----------|
| Optional flags; core = linkage+app+recipe+manifest | Defaults off for domains/env/deploy+watch | ✓ |
| Everything mandatory | Fail if skip | |
| Mode tiers minimal/standard/full | | |
| Modes greenfield \| link-existing | | ✓ |
| Never auto-push | Suggest git push only | ✓ |
| Deploy+watch: fire deploy + steer/call watch bounded | No forever-block | ✓ |

**User's choice:** Full greenfield maximal available; optional flags default off; modes greenfield|link-existing; never auto-push; bounded deploy+watch.
**Notes:** Overrides initial ★ linkage-only recommendation.

---

## Skill pack structure

| Option | Description | Selected |
|--------|-------------|----------|
| Shared source + IDE adapters | Hand-rolled | |
| 3 independent copies | Drift risk | |
| Vercel `npx skills` | skills.sh / vercel-labs/skills | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| `skills/coolify-*/SKILL.md` | Repo-local discoverable source | ✓ |
| `.agents/skills/` only | | |
| Separate skills repo | | |
| Workflow skills (setup/deploy/diagnose/incident) | | ✓ |
| One mega skill | | |
| Docs: `-a cursor -a claude-code -a codex` | | ✓ |
| Symlink vs copy | Claude discretion | ✓ |

**User's choice:** Vercel Skills CLI; path `skills/coolify-*`; four workflow skills; install docs for three agents; symlink/copy = discretion.
**Notes:** User explicitly rejected prior shared-adapter proposal in favor of `npx skills`.

---

## Claude's Discretion

- Exact setup action / flag names
- In-process watch call vs UUID + steer (within bounded/no-forever)
- Symlink vs `--copy` docs wording
- Optional CLI wrapper in this phase
- SKILL.md prose / frontmatter details

## Deferred Ideas

- Windsurf / extra IDE targets
- OpenAPI coverage (Phase 23)
- npm Release publish (Phase 23)
- Auto-push unfinished git (REQUIREMENTS out of scope)
