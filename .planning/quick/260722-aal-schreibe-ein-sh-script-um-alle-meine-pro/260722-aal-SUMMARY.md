---
phase: quick-260722-aal
plan: 01
subsystem: infra
tags: [bash, pnpm, npm, migration, mac, tui]

requires: []
provides:
  - scripts/npm-to-pnpm.sh — Mac utility to scan project roots and migrate npm → pnpm
affects: []

tech-stack:
  added: []
  patterns:
    - "Pure bash + tput/ANSI TUI with German user-facing strings"
    - "Dry-run default; --apply required for destructive migration"

key-files:
  created:
    - scripts/npm-to-pnpm.sh
  modified: []

key-decisions:
  - "Associative-array dedup replaced with SEEN_DIRS[] for macOS bash 3.2 compatibility"
  - "pnpm-missing exit code 2 via die_pnpm_missing(); migration failures exit 1"

patterns-established:
  - "Threat mitigations: resolve_root rejects ..; only rm node_modules + package-lock.json inside confirmed project dirs; no eval"

requirements-completed: [Q-260722-aal-01]

duration: 5min
completed: 2026-07-22
status: complete
---

# Quick 260722-aal: npm → pnpm Migration Script Summary

**Pure bash Mac utility with German ANSI TUI that scans configurable project roots, detects npm projects, and migrates via pnpm import → clean → install — dry-run by default.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments

- Created `scripts/npm-to-pnpm.sh` (472 lines, executable): banner, arg parser, junk-path pruning, project classifier, workspace yaml generation, migrator, summary table
- Default dry-run; `--apply` mutates; `--root`, `--depth`, `--skip-install`, `--force` supported
- German UI strings; English code identifiers/comments
- pnpm preflight with Corepack/brew install hint (exit 2)

## Smoke Test Results

### 1. Help path — PASS

```bash
./scripts/npm-to-pnpm.sh --help | grep -q -- '--apply'
./scripts/npm-to-pnpm.sh --help | grep -q -- '--root'
```

### 2. Dry-run fixture — PASS

Temp fixture with `package.json` + `package-lock.json`. Script listed `proj-a`, showed `[DRY] pnpm import → rm node_modules package-lock.json → pnpm install`, did not create `pnpm-lock.yaml`, left `package-lock.json` intact.

### 3. pnpm-missing path — SKIPPED

PATH filter could not hide pnpm on this machine (pnpm 11.15.1 still resolved). Guard logic present in `die_pnpm_missing()` with exit 2; manual verify: `env PATH=/usr/bin:/bin ./scripts/npm-to-pnpm.sh --help` after ensuring pnpm not in those dirs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] macOS bash 3.2 lacks associative arrays**
- **Found during:** Task 1 verification (`bash -n` context / portability)
- **Fix:** Replaced `local -A seen_map` with `SEEN_DIRS[]` + `dir_already_seen()`
- **Files modified:** scripts/npm-to-pnpm.sh
- **Commit:** 905c948

None otherwise — plan executed as written.

## Auth Gates

None.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/npm-to-pnpm.sh
- FOUND: commit 905c948 (feat quick-260722-aal-01 npm-to-pnpm migration script)
