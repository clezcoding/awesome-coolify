# Root Overview Audit — GitHub-visible entries

**Audit date:** 2026-08-08  
**HEAD ref:** `git ls-tree --name-only HEAD`  
**Root entry count:** 32

## Summary counts

| Class | Count | Share of root entries |
|-------|------:|----------------------:|
| **keep** | 29 | 91% |
| **keep-but-noisy** | 2 | 6% |
| **candidate-untrack** | 1 | 3% |

**Tracked file volume (selected dirs):** `.planning` 604 · `src` 105 · `docs` 43 · `scripts` 25 · `.github` 23 · `tests` 16 · `skills` 4 · `.cursor` 3 · `.changeset` 3 · `.husky` 2

## Policy anchors

1. **`commit_docs: true`** (`.planning/config.json`) — core `.planning/` artifacts (STATE, ROADMAP, phases/, quick/, milestones/, research/*.md) remain intentionally tracked for GSD workflow continuity. This audit does **not** change that policy.
2. **Quick 260727-4hd** — ephemeral `.planning` subpaths (`research/.cache/`, `forensics/`, `spikes/`, `sketches/`, `notes/`, `todos/`, `debug/`, `mcp_features.md`) and `dev-docs/` are gitignored; index was cleaned then.
3. **Quick 260729-7mc** — confirmed index ephemeral-free; local artifact purge only; no reversal of `commit_docs` or core `.planning` tracking.
4. **`.cursor/` selective tracking** — `.gitignore` ignores `.cursor/*` except shared ship automation (`hooks.json`, `hooks/**`, `rules/gsd-ship-labels.mdc`). Personal IDE rules stay local.

## Classification table

| Root entry | Class | Tracked files (approx) | Rationale | Impact if untracked / ignored |
|------------|-------|------------------------|-----------|-------------------------------|
| `.changeset` | keep | 3 | Changesets release workflow; required for milestone npm model | Release PRs / version bumps break |
| `.coolify-manifest.example.json` | keep | 1 | Public example for manifest sync feature (Phase 17) | Users lose onboarding template |
| `.cursor` | keep-but-noisy | 3 | Folder visible on GitHub root; only ship hooks + `gsd-ship-labels.mdc` tracked per 260727-4hd policy | Untracking breaks `afterShellExecution` gsd-ship-post hook + ship label rule; Kodiak automerge workflow degrades |
| `.editorconfig` | keep | 1 | Cross-editor formatting baseline | Inconsistent formatting across contributors |
| `.env.example` | keep | 1 | Documented env template; npm `files` allowlist | Install/docs drift; secrets guidance lost |
| `.github` | keep | 23 | CI, workflows, labels, Dependabot, CODEOWNERS | CI/CD, security scans, and PR automation stop |
| `.gitignore` | keep | 1 | Defines public vs local boundary | Cannot maintain hygiene policy |
| `.husky` | keep | 2 | Pre-commit (lint-staged, tests) | Quality gates bypassed locally |
| `.kodiak.toml` | keep | 1 | Automerge queue config; paired with ship labels | PR merge automation misconfigured |
| `.markdownlint.json` | keep | 1 | MegaLinter / markdown CI gate | CI lint failures or rule drift |
| `.mega-linter.yml` | keep | 1 | Primary repo-wide linter orchestration | MegaLinter CI job fails or runs wrong rules |
| `.planning` | keep-but-noisy | 604 | GSD state, roadmap, phase history — **required while `commit_docs: true`** | GSD agents lose STATE/ROADMAP/phases; ship traceability gone; new contributors see planning as product noise |
| `.yamllint.yml` | keep | 1 | YAML lint for workflows/configs | CI YAML quality gate weakens |
| `CHANGELOG.md` | keep | 1 | Public release history | Release communication gap |
| `CONTRIBUTING.md` | keep | 1 | Contributor + publish workflow docs | Onboarding friction |
| `LICENSE` | keep | 1 | Legal terms; npm pack | License ambiguity for npm consumers |
| `README.de.md` | keep | 1 | German public docs parity (DIST-02) | DE audience loses entry point |
| `README.md` | keep | 1 | Primary repo landing page | GitHub/npm discovery broken |
| `SECURITY.md` | keep | 1 | Security disclosure policy | GitHub security tab incomplete |
| `commitlint.config.js` | keep | 1 | Conventional commits via husky | Commit message CI/hook failures |
| `docs` | keep | 43 | GitHub Pages + user guides (19 tools, prompts) | Public documentation site breaks |
| `lint-staged.config.mjs` | keep | 1 | Pre-commit scoped test/lint | Husky pre-commit misroutes |
| `package.json` | keep | 1 | npm package manifest | Package unusable |
| `pnpm-lock.yaml` | keep | 1 | Reproducible installs | CI/dev install drift |
| `pnpm-workspace.yaml` | keep | 1 | Monorepo workspace (docs/readme) | Workspace install breaks |
| `scripts` | keep | 25 | Build, coverage, UAT, gsd-ship helpers | Build/test/release scripts missing |
| `skills` | candidate-untrack | 4 | Agent skill runbooks; useful for contributors using Cursor but not runtime MCP | Skills still work locally if kept; untrack reduces root clutter — agents lose repo-shipped skill templates until re-added or documented elsewhere |
| `src` | keep | 105 | MCP server product code | Product gone |
| `tests` | keep | 16 | Vitest suite | No automated quality signal |
| `tsconfig.json` | keep | 1 | TypeScript compile config | `tsc` / IDE breaks |
| `tsup.config.ts` | keep | 1 | Bundle entry for npm `dist/` | Build fails |
| `vitest.config.ts` | keep | 1 | Test runner config | Tests won't run |

## Notes

- **`.planning` is keep-but-noisy, not candidate-untrack** in this task — `commit_docs: true` locks core planning artifacts as tracked; declutter requires explicit policy change (see Recommendations section, Task 3).
- **Tooling dotfiles** (`.markdownlint.json`, `.mega-linter.yml`, `.yamllint.yml`, `.kodiak.toml`) stay **keep** because MegaLinter/CI/husky depend on them at repo root; untracking would not meaningfully shrink GitHub folder list (files remain visible) but would break gates.
- **`.cursor`** folder name dominates visual clutter despite only 3 tracked blobs — widening ignore without losing ship hooks is a future policy tweak, not done here.
