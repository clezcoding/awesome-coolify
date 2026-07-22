#!/usr/bin/env bash
# npm-to-pnpm.sh — Scan Mac project roots and migrate npm projects to pnpm.
#
# Local Mac utility (not part of awesome-coolify runtime). Pure bash + tput/ANSI.
#
# Usage:
#   npm-to-pnpm.sh [--root DIR]... [--dry-run|--apply] [--depth N] [--skip-install] [--force] [--help]
#
# Examples:
#   ./scripts/npm-to-pnpm.sh                          # dry-run, default roots
#   ./scripts/npm-to-pnpm.sh --root ~/Projects        # dry-run, one root
#   ./scripts/npm-to-pnpm.sh --apply                  # migrate all detected npm projects
#   ./scripts/npm-to-pnpm.sh --apply --skip-install   # import + clean, skip pnpm install
#   ./scripts/npm-to-pnpm.sh --force --apply          # migrate even when both lockfiles exist
#
# Default roots (only existing dirs): ~/Desktop ~/Projects ~/Developer ~/code ~/src ~/repos
# Default mode: --dry-run (no filesystem changes). Use --apply to mutate.
# Pin pnpm via Corepack: corepack enable && corepack prepare pnpm@latest --activate

set -euo pipefail

# ── Color / ANSI helpers ──────────────────────────────────────────────────────

if [[ -n "${NO_COLOR:-}" ]] || ! tput colors &>/dev/null || [[ "$(tput colors 2>/dev/null || echo 0)" -lt 8 ]]; then
  c_bold='' c_dim='' c_red='' c_green='' c_yellow='' c_blue='' c_magenta='' c_cyan='' c_reset=''
else
  c_bold=$(tput bold)
  c_dim=$(tput dim 2>/dev/null || tput sgr0)
  c_red=$(tput setaf 1)
  c_green=$(tput setaf 2)
  c_yellow=$(tput setaf 3)
  c_blue=$(tput setaf 4)
  c_magenta=$(tput setaf 5)
  c_cyan=$(tput setaf 6)
  c_reset=$(tput sgr0)
fi

c_clear=$'\033[2J\033[H'

cup() {
  tput cup "$1" "$2" 2>/dev/null || true
}

die() {
  echo "${c_red}✗${c_reset} $*" >&2
  exit 1
}

die_pnpm_missing() {
  echo "${c_red}✗${c_reset} pnpm nicht gefunden. Installieren mit: 'brew install pnpm' oder 'corepack enable && corepack prepare pnpm@latest --activate'." >&2
  exit 2
}

log_info()  { echo "${c_blue}→${c_reset} $*"; }
log_warn()  { echo "${c_yellow}⚠${c_reset} $*"; }
log_ok()    { echo "${c_green}✓${c_reset} $*"; }
log_err()   { echo "${c_red}✗${c_reset} $*" >&2; }

# ── Globals ───────────────────────────────────────────────────────────────────

ROOTS=()
MODE="dry-run"
MAX_DEPTH=4
SKIP_INSTALL=0
FORCE=0

JUNK_DIRS=(.Trash node_modules .git Library Caches "Application Support" .cache "iCloud Drive" .npm .pnpm-store)

MIGRATE=()
MIGRATE_KIND=()
MIGRATE_NOTE=()
MIGRATE_STATUS=()
SKIP_PNPM=()
AMBIGUOUS=()
SEEN_DIRS=()

TOTAL_SCANNED=0
TOTAL_FAILED=0
TOTAL_INSTALL_FAILED=0

# ── Banner ────────────────────────────────────────────────────────────────────

print_banner() {
  printf '%b' "$c_clear"
  echo "${c_magenta}${c_bold}"
  cat <<'BANNER'
╔══════════════════════════════════════════════════════════╗
║           npm  →  pnpm   Migration                       ║
╚══════════════════════════════════════════════════════════╝
BANNER
  echo "${c_reset}"
  echo "${c_dim}Scanne Projekte und migriere zu pnpm — Trockenlauf standardmäßig, --apply zum Ausführen.${c_reset}"
  echo
}

# ── Arg parser ──────────────────────────────────────────────────────────────────

usage() {
  sed -n '2,18p' "$0"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --root)
        [[ $# -lt 2 ]] && die "Option --root erfordert ein Verzeichnis"
        ROOTS+=("$2")
        shift 2
        ;;
      --dry-run)
        MODE="dry-run"
        shift
        ;;
      --apply)
        MODE="apply"
        shift
        ;;
      --depth)
        [[ $# -lt 2 ]] && die "Option --depth erfordert eine Zahl"
        MAX_DEPTH="$2"
        shift 2
        ;;
      --skip-install)
        SKIP_INSTALL=1
        shift
        ;;
      --force)
        FORCE=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unbekanntes Argument: $1"
        ;;
    esac
  done
}

resolve_root() {
  local dir="$1"
  local resolved
  if [[ "$dir" == *".."* ]]; then
    die "Ungültiger Pfad (.. nicht erlaubt): $dir"
  fi
  if [[ ! -d "$dir" ]]; then
    die "Verzeichnis existiert nicht: $dir"
  fi
  resolved="$(cd "$dir" && pwd)" || die "Pfad nicht lesbar: $dir"
  echo "$resolved"
}

init_default_roots() {
  if [[ ${#ROOTS[@]} -gt 0 ]]; then
    return
  fi
  local candidates=(~/Desktop ~/Projects ~/Developer ~/code ~/src ~/repos)
  local c expanded
  for c in "${candidates[@]}"; do
    expanded="${c/#\~/$HOME}"
    if [[ -d "$expanded" ]]; then
      ROOTS+=("$expanded")
    fi
  done
  if [[ ${#ROOTS[@]} -eq 0 ]]; then
    die "Keine Standard-Projektverzeichnisse gefunden. Nutze --root DIR."
  fi
}

# ── Preflight ─────────────────────────────────────────────────────────────────

preflight() {
  if ! command -v pnpm >/dev/null 2>&1; then
    die_pnpm_missing
  fi
  echo "${c_dim}pnpm $(pnpm --version 2>/dev/null || echo '?')${c_reset}"
  echo
}

# ── Junk-path filter ────────────────────────────────────────────────────────────

is_junk_path() {
  local path="$1"
  local junk
  for junk in "${JUNK_DIRS[@]}"; do
    if [[ "$path" == *"/${junk}/"* || "$path" == *"/${junk}" ]]; then
      return 0
    fi
  done
  return 1
}

# ── Project detection ─────────────────────────────────────────────────────────

classify_project() {
  local dir="$1"
  local has_pkg=0 has_npm_lock=0 has_pnpm_lock=0

  [[ -f "$dir/package.json" ]] && has_pkg=1
  [[ -f "$dir/package-lock.json" ]] && has_npm_lock=1
  [[ -f "$dir/pnpm-lock.yaml" ]] && has_pnpm_lock=1

  if [[ $has_pkg -eq 0 ]]; then
    return 1
  fi

  if [[ $has_pnpm_lock -eq 1 && $has_npm_lock -eq 1 && $FORCE -eq 0 ]]; then
    AMBIGUOUS+=("$dir")
    echo "${c_dim}  · übersprungen (beide Lockfiles, --force nötig): ${dir}${c_reset}"
    return 0
  fi

  if [[ $has_pnpm_lock -eq 1 && $FORCE -eq 0 ]]; then
    SKIP_PNPM+=("$dir")
    echo "${c_dim}  · bereits pnpm: ${dir}${c_reset}"
    return 0
  fi

  if [[ $has_npm_lock -eq 1 || ($has_npm_lock -eq 0 && $has_pnpm_lock -eq 0) ]]; then
    MIGRATE+=("$dir")
    if [[ $has_npm_lock -eq 1 ]]; then
      MIGRATE_KIND+=("npm")
      MIGRATE_NOTE+=("package-lock.json → pnpm import")
    else
      MIGRATE_KIND+=("npm-no-lock")
      MIGRATE_NOTE+=("kein Lockfile, direkt pnpm install")
    fi
    MIGRATE_STATUS+=("pending")
    return 0
  fi

  return 0
}

dir_already_seen() {
  local target="$1" s
  for s in "${SEEN_DIRS[@]}"; do
    [[ "$s" == "$target" ]] && return 0
  done
  return 1
}

scan_roots() {
  local root dir
  SEEN_DIRS=()

  for root in "${ROOTS[@]}"; do
    root="$(resolve_root "$root")"
    log_info "Scanne: ${c_bold}${root}${c_reset} (Tiefe ${MAX_DEPTH})"

    while IFS= read -r -d '' pkg; do
      dir="$(dirname "$pkg")"

      if is_junk_path "$dir"; then
        continue
      fi

      if dir_already_seen "$dir"; then
        continue
      fi
      SEEN_DIRS+=("$dir")

      TOTAL_SCANNED=$((TOTAL_SCANNED + 1))
      classify_project "$dir" || true
    done < <(find "$root" -maxdepth "$MAX_DEPTH" \
      \( -type d -name node_modules -prune \) -o \
      \( -type f -name package.json -print0 \) 2>/dev/null)
  done
  echo
}

# ── Workspace detection ───────────────────────────────────────────────────────

has_npm_workspaces() {
  local dir="$1"
  grep -q '"workspaces"' "$dir/package.json" 2>/dev/null
}

needs_workspace_yaml() {
  local dir="$1"
  has_npm_workspaces "$dir" && [[ ! -f "$dir/pnpm-workspace.yaml" ]]
}

generate_workspace_yaml() {
  local dir="$1"
  if ! command -v python3 >/dev/null 2>&1; then
    log_warn "  python3 fehlt — pnpm-workspace.yaml kann nicht erzeugt werden für: $dir"
    return 1
  fi
  python3 -c '
import json, sys
path = sys.argv[1]
with open(path + "/package.json") as f:
    data = json.load(f)
workspaces = data.get("workspaces", [])
if isinstance(workspaces, dict):
    workspaces = workspaces.get("packages", [])
lines = ["packages:"]
for w in workspaces:
    lines.append(f"  - \"{w}\"")
with open(path + "/pnpm-workspace.yaml", "w") as out:
    out.write("\n".join(lines) + "\n")
' "$dir"
}

handle_workspace() {
  local dir="$1"
  if ! needs_workspace_yaml "$dir"; then
    return 0
  fi
  if [[ "$MODE" == "dry-run" ]]; then
    echo "  ${c_dim}[DRY] würde pnpm-workspace.yaml erzeugen${c_reset}"
    return 0
  fi
  if generate_workspace_yaml "$dir"; then
    log_ok "  pnpm-workspace.yaml erzeugt"
    return 0
  fi
  return 1
}

# ── Migration ───────────────────────────────────────────────────────────────────

migrate_project() {
  local dir="$1"
  local idx="$2"
  local kind="${MIGRATE_KIND[$idx]}"
  local status="ok"
  local note="${MIGRATE_NOTE[$idx]}"

  echo "${c_bold}→ ${dir}${c_reset}"

  if needs_workspace_yaml "$dir"; then
    if ! handle_workspace "$dir"; then
      MIGRATE_STATUS[$idx]="fail"
      MIGRATE_NOTE[$idx]="workspace-yaml fehlgeschlagen"
      TOTAL_FAILED=$((TOTAL_FAILED + 1))
      echo "  ${c_red}✗${c_reset} workspace-yaml fehlgeschlagen"
      return
    fi
  fi

  if [[ "$MODE" == "dry-run" ]]; then
    if [[ "$kind" == "npm" ]]; then
      echo "  ${c_dim}[DRY] pnpm import → rm node_modules package-lock.json → pnpm install${c_reset}"
    else
      echo "  ${c_dim}[DRY] rm node_modules (falls vorhanden) → pnpm install${c_reset}"
    fi
    if needs_workspace_yaml "$dir"; then
      echo "  ${c_dim}[DRY] würde pnpm-workspace.yaml erzeugen${c_reset}"
    fi
    echo "  ${c_green}✓${c_reset} Trockenlauf"
    MIGRATE_STATUS[$idx]="dry-run"
    return
  fi

  # apply mode
  if [[ "$kind" == "npm" ]]; then
    echo "  · pnpm import …"
    if ! (cd "$dir" && pnpm import >/dev/null 2>&1); then
      log_err "  pnpm import fehlgeschlagen"
      MIGRATE_STATUS[$idx]="fail"
      MIGRATE_NOTE[$idx]="pnpm import fehlgeschlagen"
      TOTAL_FAILED=$((TOTAL_FAILED + 1))
      echo "  ${c_red}✗${c_reset} import fehlgeschlagen"
      return
    fi
    echo "  ${c_green}✓${c_reset} import"
  fi

  if [[ -d "$dir/node_modules" || -f "$dir/package-lock.json" ]]; then
    echo "  · entferne node_modules + package-lock.json …"
    rm -rf "$dir/node_modules" "$dir/package-lock.json"
    echo "  ${c_green}✓${c_reset} bereinigt"
  fi

  if [[ $SKIP_INSTALL -eq 1 ]]; then
    MIGRATE_STATUS[$idx]="ok"
    MIGRATE_NOTE[$idx]="import+bereinigt (--skip-install)"
    echo "  ${c_green}✓${c_reset} fertig (--skip-install)"
    return
  fi

  echo "  · pnpm install …"
  if ! (cd "$dir" && pnpm install >/dev/null 2>&1); then
    log_err "  pnpm install fehlgeschlagen"
    MIGRATE_STATUS[$idx]="install-fail"
    MIGRATE_NOTE[$idx]="pnpm install fehlgeschlagen"
    TOTAL_INSTALL_FAILED=$((TOTAL_INSTALL_FAILED + 1))
    echo "  ${c_red}✗${c_reset} install fehlgeschlagen"
    return
  fi

  MIGRATE_STATUS[$idx]="ok"
  MIGRATE_NOTE[$idx]="migriert"
  echo "  ${c_green}✓${c_reset} migriert"
}

run_migrations() {
  local i
  if [[ ${#MIGRATE[@]} -eq 0 ]]; then
    log_info "Keine npm-Projekte zum Migrieren gefunden."
    return
  fi
  log_info "Migriere ${#MIGRATE[@]} Projekt(e) …"
  echo
  for i in "${!MIGRATE[@]}"; do
    migrate_project "${MIGRATE[$i]}" "$i"
    echo
  done
}

# ── Summary table ───────────────────────────────────────────────────────────────

print_summary() {
  local i path status note col_status
  local width=42

  echo "${c_magenta}${c_bold}╔════════════════════════════════════════════════════════════════════════════╗${c_reset}"
  echo "${c_magenta}${c_bold}║  Zusammenfassung                                                           ║${c_reset}"
  echo "${c_magenta}${c_bold}╠════════════════════════════════════════════════════════════════════════════╣${c_reset}"
  printf "${c_bold}  %-${width}s %-12s %s${c_reset}\n" "Projekt" "Status" "Hinweis"
  echo "${c_dim}  $(printf '%.0s─' {1..74})${c_reset}"

  for i in "${!MIGRATE[@]}"; do
    path="${MIGRATE[$i]}"
    status="${MIGRATE_STATUS[$i]:-pending}"
    note="${MIGRATE_NOTE[$i]:-}"

    case "$status" in
      ok)        col_status="${c_green}ok${c_reset}" ;;
      dry-run)   col_status="${c_yellow}dry-run${c_reset}" ;;
      fail|install-fail) col_status="${c_red}${status}${c_reset}" ;;
      *)         col_status="$status" ;;
    esac

    # truncate long paths for table
    if [[ ${#path} -gt $width ]]; then
      path="…${path: -$((width - 1))}"
    fi
    printf "  %-${width}s %-12b %s\n" "$path" "$col_status" "$note"
  done

  echo "${c_magenta}${c_bold}╚════════════════════════════════════════════════════════════════════════════╝${c_reset}"
  echo
  echo "${c_dim}Gescannt: ${TOTAL_SCANNED} | Migrieren: ${#MIGRATE[@]} | Bereits pnpm: ${#SKIP_PNPM[@]} | Mehrdeutig: ${#AMBIGUOUS[@]} | Fehler: $((TOTAL_FAILED + TOTAL_INSTALL_FAILED))${c_reset}"

  if [[ "$MODE" == "dry-run" ]]; then
    echo "${c_yellow}Trockenlauf — keine Änderungen. Mit --apply ausführen.${c_reset}"
  fi
}

# ── Main ────────────────────────────────────────────────────────────────────────

main() {
  parse_args "$@"
  init_default_roots
  print_banner
  preflight
  scan_roots
  run_migrations
  print_summary

  if [[ $TOTAL_FAILED -gt 0 || $TOTAL_INSTALL_FAILED -gt 0 ]]; then
    exit 1
  fi
  exit 0
}

main "$@"
