# Phase 20: Recipes & Service List-Types - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 20-Recipes & Service List-Types
**Mode:** `--batch` (4 questions/batch), recommendations shown per question
**Areas discussed:** list-types Datenquelle, Recipe-Oberfläche, git-app Detection-Tiefe, app+db Wiring & Partial-Failure, Safety für Recipes

---

## Todos (cross-reference)

| Todo | Folded |
|------|--------|
| Custom Skills pro IDE für Coolify | No → Phase 22 |
| Lokale Projekt-Manifest-Datei | No → v3.0/manifest |
| Standard-Setup Tool für neue Coolify-Projekte | No → Phase 22 |
| Integrate official Coolify OpenAPI specs | No → Phase 23 |

**User's choice:** keine

---

## list-types Datenquelle

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Instance REST first | Coolify REST on instance | |
| 1b CDN ofetch | Official service-templates.json | ✓ |
| 1c Hybrid | Instance API then CDN | |
| 2a Always @main | Latest CDN | |
| 2b Version-pin | Pin to instance version, fallback latest | ✓ |
| 2c Discretion | Researcher decides | |
| 3a Hard fail | Error + recoveryHints, no bundled catalog | ✓ |
| 3b Bundled snapshot | Upstream JSON fallback in package | |
| 3c Empty list + warn | Soft degrade | |
| 4a IDs + labels | Slim response | ✓ |
| 4b IDs + categories | Filter metadata | |
| 4c Full payload | Include compose | |

**User's choice:** 1b; 2b; 3a; 4a
**Notes:** Rejected Claude hybrid (1c) and category metadata (4b) recommendations for 1 and 4.

---

## Recipe-Oberfläche

| Option | Description | Selected |
|--------|-------------|----------|
| 1a New `recipe` tool | Actions for three recipes | ✓ |
| 1b Prompts only | Agent orchestrates atomics | |
| 1c Both | Tool + prompt | |
| 2a Exact REQUIREMENTS names | git-app / app+db / one-click | |
| 2b Longer action names | create-* forms | ✓ |
| 2c Discretion | | |
| 3a Thin one-click wrapper | Validate type → service.create | ✓ |
| 3b Richer one-click | Domains/env presets | |
| 3c No recipe | Document service.create only | |
| 4a recipe.ts | Dedicated tool file | ✓ |
| 4b Under service/application | | |
| 4c Discretion | | |

**User's choice:** 1a; 2b; 3a; 4a
**Notes:** Action names locked as `create-git-app`, `create-app-db`, `create-one-click` (proposal accepted by silence through later areas).

---

## git-app Detection-Tiefe

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Heuristic only | | |
| 1b Explicit build_pack only | | |
| 1c Heuristic + override | | ✓ |
| 2a Minimal signals | Dockerfile → dockerfile else nixpacks | |
| 2b Rich signals | package.json etc. | |
| 2c Discretion | | ✓ → Claude chose 2a |
| 3a Local path only | | |
| 3b Remote clone | | |
| 3c Local detect + URL for create; no path → build_pack required | | ✓ |
| 4a Reject dockercompose | Hint to service path | ✓ |
| 4b Auto-reroute | | |
| 4c Discretion | | |

**User's choice:** 1c; 2c; 3c; 4a
**Notes:** Claude discretion on detection depth → minimal heuristics.

---

## app+db Wiring & Partial-Failure

| Option | Description | Selected |
|--------|-------------|----------|
| 1a Always DATABASE_URL | | |
| 1b Type-specific keys | | |
| 1c DATABASE_URL + env_key? | | ✓ |
| 2a Read-back from Coolify | | |
| 2b Construct from params | | |
| 2c Researcher verifies; prefer read-back | | ✓ |
| 3a No auto-rollback | UUIDs + errors | ✓ |
| 3b Best-effort rollback | | |
| 3c All-or-nothing | | |
| 4a instant_deploy true fixed | | |
| 4b false fixed | | |
| 4c instant_deploy? default true | | ✓ |

**User's choice:** 1c; 2c; 3a; 4c

---

## Safety für Recipes

| Option | Description | Selected |
|--------|-------------|----------|
| 1a confirm always on create | | |
| 1b No confirm on create | | ✓ |
| 1c confirm only app+db | | |
| 2a Dry-run / preview | | |
| 2b No dry-run Phase 20 | | ✓ |
| 2c Preflight tied to confirm | | |
| 3a Mask + reveal | | ✓ |
| 3b Once unmasked | | |
| 3c Never return connection string | | |
| 4a Soft instance/manifest | | ✓ |
| 4b Hard manifest required | | |
| 4c Discretion | | |

**User's choice:** 1b; 2b; 3a; 4a

---

## Claude's Discretion

- Detection signal set (minimal Dockerfile/nixpacks) — Area 3 Q2
- CDN URL / version-tag mapping details within D-01/D-02
- Internal helper reuse for create/wire paths
- Exact recoveryHints wording

## Deferred Ideas

- Phase 22: setup wizard, IDE skills, hard manifest
- Phase 21: deployment.watch
- Richer list-types categories/tags
- Dry-run / recipe preview
- Bundled offline catalog (explicitly rejected)
```
