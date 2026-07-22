# Quick Task 260722-aal — Research (npm → pnpm Mac migration script)

**Gathered:** 2026-07-22  
**Sources:** Context7 `/websites/pnpm_io`, pnpm.io/cli/import, web (llmbestpractices, antfu/skills, OpenReplay, Rostand MIGAN)

## Official migration path (pnpm)

1. **Prefer lockfile import:** `pnpm import` reads `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` → writes `pnpm-lock.yaml` (preserves resolved versions).
2. **Workspaces:** declare packages in `pnpm-workspace.yaml` *before* `pnpm import` if the project uses workspaces.
3. **Clean npm artifacts:** after successful import → `rm -rf node_modules package-lock.json` (pnpm ignores npm lockfiles; layouts incompatible).
4. **Install:** `pnpm install` (or `--frozen-lockfile` after lockfile committed / CI).
5. **Pin version:** Corepack `packageManager` field via `corepack use pnpm@latest-11` (or set field manually).

## Script product requirements (from task)

- Scan MacBook project roots (configurable roots: `~/Desktop`, `~/Projects`, `~/Developer`, `~/code`, etc.).
- Detect npm projects: `package.json` + `package-lock.json` (or npm-only without pnpm lock).
- Skip: already-pnpm (`pnpm-lock.yaml`), nested `node_modules`, obvious junk (`.Trash`, caches).
- Per project: optional dry-run, import → clean → install; report success/fail.
- **Grafisch schön:** ANSI TUI — banner, colors, progress bar/spinner, summary table; no heavy deps (pure bash + tput/ANSI).

## Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| Phantom deps (npm hoisting) | Install may fail; report clear error, don't auto-edit package.json |
| npm workspaces → pnpm | Detect `workspaces` in package.json; generate minimal `pnpm-workspace.yaml` if missing |
| Destructive delete | Default `--dry-run`; require `--apply` (or confirm) for writes |
| Huge trees / iCloud / Time Machine | Exclude common noise paths; depth limit; skip symlinks into system dirs |
| pnpm missing | Check `command -v pnpm`; offer Corepack enable / brew install hint |
| Concurrent package managers | Skip if both lockfiles present without `--force` |

## Recommended CLI surface

```text
npm-to-pnpm.sh [--root DIR]... [--dry-run|--apply] [--depth N] [--skip-install] [--force]
```

## Placement

Ship script under `scripts/npm-to-pnpm.sh` (executable), short usage in script header comment. Not tied to Coolify MCP runtime — local Mac utility for the user.

## Out of scope

- Rewriting CI/Docker files across all repos
- Auto-fixing phantom dependencies
- Migrating Yarn Berry PnP projects (optional skip/detect only)
