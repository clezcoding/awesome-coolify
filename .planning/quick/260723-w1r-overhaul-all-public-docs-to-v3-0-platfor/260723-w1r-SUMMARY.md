---
phase: quick-260723-w1r
plan: 01
subsystem: docs
tags: [readme, coolify-cloud, multi-instance, docs-parity, github-pages]

requires: []
provides:
  - v3.0 README EN/DE with 18 canonical H2 sections
  - docs-parity inventory for 16 tools / ≥70 actions
  - cloud.md EN/DE multi-instance + manifest depth
  - GitHub Pages v3.0 messaging
  - GitHub repo metadata (description, topics, homepage)
affects: [release, npm-publish]

tech-stack:
  added: []
  patterns: [create-readme GFM admonitions, EN/DE structural parity via docs-parity]

key-files:
  created: []
  modified:
    - tests/integration/docs-parity.test.ts
    - README.md
    - README.de.md
    - docs/en/cloud.md
    - docs/de/cloud.md
    - docs/index.html
    - docs/install.html

key-decisions:
  - "CANONICAL_SECTIONS stays 18 H2s — no structural README changes"
  - "Task 6 GitHub Release deferred to parent orchestrator after PR merge"
  - "shared.css unchanged — badge-row already flex-wraps on mobile"

requirements-completed: [DIST-01, DIST-02, DIST-03, CLD-01, CLD-02, CLD-03, BRND-01, BRND-02, BRND-03, MAN-01, MAN-02, MAN-03, MAN-04, UAT-01]

coverage:
  - id: D1
    description: docs-parity test expects 16 tools, ≥70 actions, 18 H2 sections
    requirement: DIST-01
    verification:
      - kind: integration
        ref: tests/integration/docs-parity.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: README EN/DE v3.0 content (instance, manifest, cloud-info, uat:live)
    requirement: DIST-02
    verification:
      - kind: integration
        ref: tests/integration/docs-parity.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: cloud.md EN/DE multi-instance + branding + manifest sections
    requirement: CLD-01
    verification:
      - kind: integration
        ref: tests/integration/docs-parity.test.ts
        status: pass
    human_judgment: true
    rationale: cloud.md depth not asserted by parity test alone — human spot-check recommended
  - id: D4
    description: GitHub Pages landing + configurator v3.0 badges
    requirement: DIST-03
    verification:
      - kind: other
        ref: grep 16 domain tools docs/index.html
        status: pass
    human_judgment: true
    rationale: Visual Pages check not automated in CI
  - id: D5
    description: GitHub repo metadata updated
    requirement: DIST-03
    verification:
      - kind: other
        ref: gh repo view clezcoding/awesome-coolify --json description,homepageUrl,repositoryTopics
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-23
status: complete
---

# Quick 260723-w1r Plan 01: v3.0 Public Docs Overhaul Summary

**Public docs aligned to v3.0 Platform Foundation — 16 tools, multi-instance registry, Coolify Cloud, local manifest, live UAT — with docs-parity green**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-23T21:07:00Z
- **Completed:** 2026-07-23T21:12:00Z
- **Tasks:** 5 completed / 6 skipped (Task 6 release deferred)
- **Files modified:** 8

## Accomplishments

- Expanded `docs-parity` inventory: `instance` + `manifest` actions, D-09 floor ≥70, regex fix for `.coolify-mcp/` registry path
- Overhauled `README.md` + `README.de.md` to v3.0 (16 tools · ~87 actions, GFM admonitions, instance/manifest/branding sections, live UAT link)
- Expanded `docs/en/cloud.md` + `docs/de/cloud.md` (multi-instance registry, cloud-info fields, branding, local manifest)
- Updated GitHub Pages `index.html` + `install.html` badges and Cloud setup note
- Updated GitHub repo description, homepage, topics via `gh repo edit`

## Task Commits

1. **Task 0+1: docs-parity inventory + README EN** — `c5aa0cd` (test)
2. **Task 2: README.de.md v3.0 parity** — `e38a64c` (docs)
3. **Task 3: cloud.md EN/DE** — `6d94753` (docs)
4. **Task 4: GitHub Pages polish** — `fac5da7` (docs)
5. **Task 5: GitHub repo metadata** — no git commit (repo config via `gh repo edit`)
6. **Task 6: GitHub Release v0.2.1** — **SKIPPED** (deferred to parent after PR merge)

## Verification Evidence

```text
pnpm exec vitest run tests/integration/docs-parity.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

**GitHub repo metadata (Task 5):**
```json
{
  "description": "One MCP server for every self-hosted Coolify instance you own — deploy, diagnose, and CRUD across your fleet. v3.0 Platform Foundation: multi-instance, Coolify Cloud, branding, local manifest.",
  "homepageUrl": "https://clezcoding.github.io/awesome-coolify/",
  "repositoryTopics": ["coolify","devops","mcp","model-context-protocol","self-hosted","typescript","claude","coolify-mcp","cursor","mcp-server","multi-instance"]
}
```

**Task 5 repo metadata:** Done — description mentions v3.0; homepage → GitHub Pages; topics include `multi-instance`, `mcp-server`, `cursor`, `claude`.

## Files Created/Modified

- `tests/integration/docs-parity.test.ts` — 16-tool inventory, ≥70 action floor, registry-path regex
- `README.md` — v3.0 EN overhaul (18 H2s unchanged)
- `README.de.md` — full DE parity
- `docs/en/cloud.md` — multi-instance, branding, manifest subsections
- `docs/de/cloud.md` — DE parity
- `docs/index.html` — 16 tools / ~87 actions badges, v3.0 meta
- `docs/install.html` — v3.0 meta + Cloud docs link

## Decisions Honored

- create-readme style: concise, GFM admonitions, hero via jsDelivr, no LICENSE/CONTRIBUTING body sections
- 18 canonical H2 sections unchanged (not 19)
- EN/DE parity via docs-parity test
- cloud.md depth over new pages
- Pages polish scope only — no full redesign; `shared.css` untouched
- Task 6 release deferred to parent orchestrator (OIDC publish after merge)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Stale-package regex blocked `.coolify-mcp/` registry path**
- **Found during:** Task 0
- **Issue:** D-14 regex flagged legitimate `~/.coolify-mcp/instances.json` references
- **Fix:** Extended lookbehind to `(?<![\w.-])` so `.coolify-mcp` directory paths pass
- **Files modified:** `tests/integration/docs-parity.test.ts`
- **Committed in:** `c5aa0cd`

**2. [Orchestrator override] Task 6 GitHub Release skipped**
- **Reason:** Parent will cut v0.2.1 release after PR merge to main
- **Impact:** npm Trusted Publishing deferred; docs-only PR can merge independently

---

**Total deviations:** 2 (1 auto-fix, 1 intentional skip)

## Deferred to Parent

- GitHub Release `v0.2.1` on main → triggers `publish.yml` OIDC npm publish
- Confirm `awesome-coolify-mcp@0.2.1` visible on npmjs.com after publish workflow completes

## Self-Check: PASSED

- FOUND: tests/integration/docs-parity.test.ts
- FOUND: README.md, README.de.md
- FOUND: docs/en/cloud.md, docs/de/cloud.md
- FOUND: docs/index.html, docs/install.html
- FOUND: c5aa0cd, e38a64c, 6d94753, fac5da7
- docs-parity: 6/6 passed

---
*Phase: quick-260723-w1r*
*Completed: 2026-07-23*
