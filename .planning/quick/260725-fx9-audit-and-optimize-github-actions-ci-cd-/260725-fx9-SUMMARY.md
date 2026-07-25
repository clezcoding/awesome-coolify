---
phase: quick-260725-fx9
plan: 01
subsystem: infra
tags: [github-actions, changesets, kodiak, ci-cd]

requires: []
provides:
  - Path-filtered CodeQL and Dependency Review for non-code PRs
  - Milestone-only changeset default on gsd-ship-post with --with-changeset opt-in
  - Ship/ready automerge without needs-changeset blocker
  - CONTRIBUTING milestone npm release documentation
affects: [gsd-ship, branch-protection, kodiak]

tech-stack:
  added: []
  patterns:
    - "Path-filter non-required workflows only; required ci.yml always runs"
    - "Accumulate-at-milestone Changesets; phase ship skips fragments"

key-files:
  created: []
  modified:
    - .github/workflows/codeql.yml
    - .github/workflows/dependency-review.yml
    - scripts/gsd-ship-post.sh
    - scripts/gsd-pr-labels.sh
    - .cursor/rules/gsd-ship-labels.mdc
    - CONTRIBUTING.md

key-decisions:
  - "CodeQL + Dependency Review path-gated; ci.yml required checks untouched"
  - "Default gsd-ship-post skips changeset; --with-changeset for hotfixes"
  - "Ship/ready clears needs-changeset and always sets automerge unless --no-automerge"
  - "release.yml OIDC publish path unchanged"

patterns-established:
  - "Non-required workflow path filters for docs/planning PR cost savings"
  - "Milestone-close npm release via Version Packages merge"

requirements-completed: [QUICK-260725-fx9]

coverage:
  - id: D1
    description: "CodeQL concurrency + path filters; Dependency Review path-gated"
    requirement: QUICK-260725-fx9
    verification:
      - kind: other
        ref: "grep cancel-in-progress/paths on codeql.yml + dependency-review.yml; ci.yml has no paths key"
        status: pass
    human_judgment: false
  - id: D2
    description: "Default ship-post skips changeset; ship clears needs-changeset + automerge"
    requirement: QUICK-260725-fx9
    verification:
      - kind: other
        ref: "bash -n gsd-ship-post.sh gsd-pr-labels.sh; --with-changeset in --help"
        status: pass
    human_judgment: false
  - id: D3
    description: "CONTRIBUTING documents milestone npm release path"
    requirement: QUICK-260725-fx9
    verification:
      - kind: other
        ref: "grep Milestone npm release, Version Packages, release.yml in CONTRIBUTING.md"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-25
status: complete
---

# Quick 260725-fx9 Plan 01 Summary

**CI speedups via non-required workflow path filters; milestone-only npm via opt-in changesets on ship-post**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-25T09:31:00Z
- **Completed:** 2026-07-25T09:39:00Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- CodeQL: concurrency cancel-in-progress + path filters on push/PR (weekly schedule unchanged)
- Dependency Review: limited to `package.json`, `pnpm-lock.yaml`, workflow self-path
- Follow-up: removed `needs-changeset` from Kodiak `blocking_labels`; ci sync won't re-add when `automerge`/`gsd: ship` present
- Required `ci.yml` untouched — Lint/Test/Build + MegaLinter still run every PR
- `gsd-ship-post.sh`: default skips changeset; `--with-changeset` restores create/commit/push
- `gsd-pr-labels.sh` ship/ready: always automerge (unless `--no-automerge`), clears `needs-changeset`
- CONTRIBUTING: Milestone npm release subsection + updated ship-post docs
- `release.yml` not modified

## Deviations from Plan

### Auto-fixed Issues

None.

### Incidental Commits

**1. Task 1 commit included pre-staged planning renames**
- **Found during:** Task 1 commit
- **Issue:** `.planning/HANDOFF.json` and `.planning/INBOX-TRIAGE.md` archive renames were already staged before workflow files were added
- **Impact:** Bundled into `b88c540` alongside workflow changes; no functional impact on CI/CD deliverables
- **Commit:** b88c540

## Self-Check: PASSED

- FOUND: .github/workflows/codeql.yml
- FOUND: .github/workflows/dependency-review.yml
- FOUND: scripts/gsd-ship-post.sh
- FOUND: scripts/gsd-pr-labels.sh
- FOUND: .cursor/rules/gsd-ship-labels.mdc
- FOUND: CONTRIBUTING.md
- FOUND: b88c540
- FOUND: ec39b0a
- FOUND: 5d39305
