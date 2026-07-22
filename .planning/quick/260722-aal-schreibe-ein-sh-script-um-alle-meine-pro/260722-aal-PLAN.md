---
phase: quick-260722-aal
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/npm-to-pnpm.sh
autonomous: true
requirements:
  - Q-260722-aal-01
user_setup: []
must_haves:
  truths:
    - "Running `scripts/npm-to-pnpm.sh` with no args prints a German banner, scans default roots, and lists npm projects it would migrate — without mutating anything"
    - "Running with `--apply` performs pnpm import → rm node_modules + package-lock.json → pnpm install per project and prints a summary table of results"
    - "Already-pnpm projects, node_modules, and junk paths (.Trash, caches, Library, iCloud) are skipped"
    - "Missing pnpm binary is detected and a Corepack/brew hint is printed before any work"
    - "npm workspaces projects get a minimal pnpm-workspace.yaml generated before pnpm import when one is missing"
  artifacts:
    - "scripts/npm-to-pnpm.sh (executable, pure bash + tput/ANSI, no node deps)"
  key_links:
    - "arg parser → root scanner → project detector → migrator → summary table"
---

<objective>
Deliver one beautiful, self-contained bash script at `scripts/npm-to-pnpm.sh` that scans configurable MacBook project roots, detects npm projects, and migrates each to pnpm using the official `pnpm import` → clean → `pnpm install` path — dry-run by default, `--apply` to mutate, with an ANSI/Tput TUI (banner, colors, per-project progress, final summary table).

Purpose: User wants a reusable local Mac utility to convert all their projects from npm to pnpm with a polished terminal UX and safe defaults.
Output: `scripts/npm-to-pnpm.sh` (executable). No changes to awesome-coolify's own package manager — script is the deliverable, not a migration of this repo.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260722-aal-schreibe-ein-sh-script-um-alle-meine-pro/260722-aal-RESEARCH.md
@scripts/setup-kodiak.sh
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Write scripts/npm-to-pnpm.sh with ANSI TUI, arg parsing, detection, and migration logic</name>
  <files>scripts/npm-to-pnpm.sh</files>
  <action>
Create `scripts/npm-to-pnpm.sh` as a pure bash script (shebang `#!/usr/bin/env bash`, `set -euo pipefail`). No node/npm runtime deps for the script itself — only `tput`/ANSI escapes + standard POSIX tools (find, rm, mkdir, test). Use German strings for user-facing UI (banner, status lines, summary headers); keep code identifiers/comments English.

Header comment block: usage examples mirroring RESEARCH "Recommended CLI surface":
`npm-to-pnpm.sh [--root DIR]... [--dry-run|--apply] [--depth N] [--skip-install] [--force] [--help]`
plus short description that this is a local Mac utility, not part of awesome-coolify runtime.

Implement, in order:

1. **Color/ANSI helpers** — detect `tput colors` and `NO_COLOR` env; define `c_bold`, `c_dim`, `c_red`, `c_green`, `c_yellow`, `c_blue`, `c_magenta`, `c_reset`, plus `c_clear` (clear screen) and a `tput cup` wrapper. Provide `die()` (print red to stderr, exit 1) and `log_info/log_warn/log_ok/log_err` prefixed helpers. Provide `spinner` not needed — use a simple indented status line per project instead (more robust in dry-run logs).

2. **Banner** — `print_banner()` clears screen, prints an ASCII/Unicode banner (e.g. boxed "npm → pnpm Migration" with `c_magenta`/`c_cyan`), then a one-line German subtitle: "Scanne Projekte und migriere zu pnpm — Trockenlauf standardmäßig, --apply zum Ausführen."

3. **Arg parser** — `while [[ $# -gt 0 ]]` loop:
   - `--root DIR` → push to `ROOTS[]` array (default if none: `~/Desktop`, `~/Projects`, `~/Developer`, `~/code`, `~/src`, `~/repos` — only those that exist).
   - `--dry-run` (default) / `--apply` → `MODE=apply` mutates.
   - `--depth N` → `MAX_DEPTH` (default 4).
   - `--skip-install` → `SKIP_INSTALL=1` (run import + clean, skip final `pnpm install`).
   - `--force` → `FORCE=1` (migrate even when both `package-lock.json` and `pnpm-lock.yaml` exist).
   - `--help|-h` → print header comment block, exit 0.
   - unknown → `die "Unbekanntes Argument: $1"`.
   Reject `--apply` if `--skip-install` AND `--force` combos that make no sense is not required — keep simple.

4. **Preflight** — `command -v pnpm >/dev/null || die "pnpm nicht gefunden. Installieren mit: 'brew install pnpm' oder 'corepack enable && corepack prepare pnpm@latest --activate'."`. Print pnpm version via `pnpm --version` in a dim line.

5. **Junk-path filter** — define `JUNK_DIRS=(.Trash node_modules .git Library Caches Application Support .cache iCloud Drive .npm .pnpm-store)`. Build a `find` prune expression (or filter in loop with `case "$path"`) so scans skip these and symlinks into system dirs. Use `find "$root" -maxdepth "$MAX_DEPTH" -type d -name node_modules -prune -o -type f -name package.json -print` then derive project dir = dirname. Skip package.json inside `node_modules` (already pruned). Skip if `pnpm-lock.yaml` exists in same dir unless `FORCE=1`. Skip if path matches any junk dir substring.

6. **Project detection** — for each candidate dir, classify:
   - has `package.json` + `package-lock.json` and no `pnpm-lock.yaml` → "npm" (migrate).
   - has `package.json` + `pnpm-lock.yaml` → "pnpm" (skip, log dim "bereits pnpm").
   - has `package.json` only (no lockfile) → "npm-no-lock" (migrate without import, just `pnpm install`).
   - has both lockfiles and not `FORCE` → "ambiguous" (skip with warning).
   Collect into `MIGRATE[]`, `SKIP_PNPM[]`, `AMBIGUOUS[]` arrays.

7. **Workspace detection** — for each migrate candidate, `grep -q '"workspaces"' package.json` (use `python3 -c` only if needed; prefer `grep` for zero-dep). If workspaces present and no `pnpm-workspace.yaml`, generate minimal one in `--apply` mode from the `workspaces` array (use `python3 -c 'import json,sys; print("\n".join(json.load(open("package.json"))["workspaces"]))'` only if python3 exists; otherwise log a warning and skip workspace conversion). In dry-run, log "würde pnpm-workspace.yaml erzeugen".

8. **Migration per project** — `migrate_project()`:
   - Print project path in `c_bold` with a leading arrow.
   - If `MODE=apply`: run `pnpm import` (capture output, exit code). On failure, log err, increment `FAILED`, continue. On success: `rm -rf node_modules package-lock.json` then if `SKIP_INSTALL!=1` run `pnpm install` (capture output). On install failure, log err, increment `INSTALL_FAILED`.
   - If `MODE=dry-run`: print "  [DRY] pnpm import → rm node_modules package-lock.json → pnpm install" and what workspace yaml would be generated.
   - Use a small inline progress marker: `·` pending, `✓` ok (green), `✗` fail (red).

9. **Summary table** — `print_summary()`: print a boxed table with columns: Projekt | Status | Hinweis. Rows from `MIGRATE` results. Use `tput` column widths or simple `printf` padding (e.g. `%-40s %-12s %s`). Footer line: total scanned, total migrated, skipped (already pnpm), ambiguous, failed. In dry-run, footer says "Trockenlauf — keine Änderungen. Mit --apply ausführen."

10. **Exit code** — 0 if no failures, 1 if any migration or install failed, 2 if pnpm missing.

Keep the script under ~450 lines. Use functions, not a flat top-to-bottom script. Do NOT inline large heredocs except the banner ASCII art. Do NOT use `eval`. Quote all variable expansions. Use `[[ ]]` tests.
  </action>
  <verify>
    <automated>bash -n scripts/npm-to-pnpm.sh && test -x scripts/npm-to-pnpm.sh && command -v shellcheck >/dev/null && shellcheck -S warning scripts/npm-to-pnpm.sh || bash -n scripts/npm-to-pnpm.sh</automated>
  </verify>
  <done>
Script exists, is executable, passes `bash -n` syntax check, and (when available) `shellcheck -S warning` reports no warnings. Banner, arg parser, root scanner with junk pruning, project classifier, workspace handler, migrator with dry-run/apply modes, and summary table are all present.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Smoke-test dry-run on a temp fixture and verify --help and pnpm-missing path</name>
  <files>scripts/npm-to-pnpm.sh</files>
  <action>
Run three smoke checks against the script (do NOT modify the script in this task — only verify behavior; if a check fails, fix the script in this same task via Edit, not a rewrite):

1. **Help path:** `./scripts/npm-to-pnpm.sh --help` prints the usage block (contains `--apply` and `--root`) and exits 0.

2. **Dry-run fixture:** create a throwaway fixture outside the repo (e.g. `$(mktemp -d)/proj-a`) with a minimal `package.json` (`{"name":"proj-a","version":"1.0.0"}`) and a fake `package-lock.json` (`{"lockfileVersion":3,"packages":{}}`). Run `./scripts/npm-to-pnpm.sh --root "$TMPROOT" --dry-run` and confirm stdout (a) contains the banner, (b) lists `proj-a` as a migration candidate, (c) does NOT create `pnpm-lock.yaml`, (d) still has `package-lock.json` present afterward. Clean up the temp dir with `rm -rf`.

3. **pnpm-missing path (simulated):** run with `PATH` stripped of pnpm in a subshell: `env PATH="$(echo "$PATH" | tr ':' '\n' | grep -v -i 'pnpm\|corepack' | paste -sd: -)" ./scripts/npm-to-pnpm.sh --root "$TMPROOT" --dry-run` and confirm it dies with the German "pnpm nicht gefunden" message and exit code 2. (If pnpm is installed via a path that survives the filter, skip this check with a note in the SUMMARY — do not fail the plan over it.)

Capture the three commands' outputs into the SUMMARY. Do not commit any fixture files.
  </action>
  <verify>
    <automated>./scripts/npm-to-pnpm.sh --help | grep -q -- '--apply' && ./scripts/npm-to-pnpm.sh --help | grep -q -- '--root'</automated>
  </verify>
  <done>
`--help` works, dry-run on a temp fixture lists the project and mutates nothing, and the pnpm-missing guard exits 2 with the German hint (or the check is documented as skipped because pnpm could not be hidden on this machine).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user CLI args → script | Untrusted input via argv; parsed in tight `case` loop |
| filesystem scan → script state | Untrusted dir names from `find`; used in `rm -rf` paths |
| script → user filesystem (apply mode) | Destructive deletes of `node_modules` + `package-lock.json` per project |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-q260722-01 | Tampering | arg parser | medium | mitigate | Strict `case` parser; unknown args `die`; reject conflicting flags early |
| T-q260722-02 | Tampering | `--root DIR` paths | high | mitigate | Resolve with `cd "$DIR" && pwd`; reject paths containing `..` escapes into system dirs; never `eval` user input |
| T-q260722-03 | Repudiation | `--apply` destructive ops | high | mitigate | Default `--dry-run`; require explicit `--apply`; per-project log lines name every file removed; summary table records outcome |
| T-q260722-04 | Information disclosure | `pnpm install` output | low | accept | Forward stdout/stderr to user only; no remote logging |
| T-q260722-05 | DoS | huge trees / iCloud / Time Machine | medium | mitigate | `--depth` cap (default 4), prune `node_modules` + junk dirs, skip symlinks into system dirs |
| T-q260722-06 | Tampering | `rm -rf` target paths | critical | mitigate | Only delete `node_modules` and `package-lock.json` inside a confirmed project dir; never delete the project dir itself; refuse paths containing spaces-only or empty strings; quote all expansions |
| T-q260722-07 | Spoofing | pnpm binary on PATH | low | accept | User's own machine; document Corepack pinning in help text for reproducibility |
</threat_model>

<verification>
- `bash -n scripts/npm-to-pnpm.sh` clean
- `shellcheck -S warning scripts/npm-to-pnpm.sh` clean (when shellcheck available)
- `./scripts/npm-to-pnpm.sh --help` exits 0, mentions `--apply` and `--root`
- Dry-run on temp fixture lists project, mutates nothing
- pnpm-missing guard exits 2 with German hint (or skipped+documented)
</verification>

<success_criteria>
- `scripts/npm-to-pnpm.sh` exists, is executable, pure bash + tput/ANSI
- Default behavior is dry-run; `--apply` required for any mutation
- Banner + per-project status + summary table render with ANSI colors
- Junk paths, already-pnpm, and ambiguous projects skipped correctly
- npm workspaces → minimal `pnpm-workspace.yaml` generation in apply mode
- pnpm-missing detection prints German install hint and exits non-zero
- awesome-coolify repo's own package manager is NOT touched by executing the script
</success_criteria>

<output>
Create `.planning/quick/260722-aal-schreibe-ein-sh-script-um-alle-meine-pro/260722-aal-SUMMARY.md` when done
</output>
