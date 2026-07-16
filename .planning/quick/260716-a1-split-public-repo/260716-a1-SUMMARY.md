---
quick_id: 260716-a1
status: complete
---

# Quick Task 260716-a1: Summary

## What shipped

- `clezcoding/awesome-coolify-mcp` renamed to **`clezcoding/awesome-coolify-mcp-dev`** (private) — local `origin` remote updated to match; this workspace continues as the dev repo unchanged otherwise.
- New **public** repo **`clezcoding/awesome-coolify-mcp`** created and pushed with a fresh, single-commit git history containing only prod-relevant files (94 files: `src`, `tests`, `docs`, READMEs, `LICENSE`, `CONTRIBUTING.md`, packaging/config files, `.github/workflows/{ci,pages,publish}.yml`). No `.planning`, `.cursor`, `.claude`, `.agents`, `graphify-out`, `mcp_features.md`, or dev-only scripts (`run-mcp.mjs`, `mcp-spy.mjs`, `fix-higgsfield.sh`, `gsd-ensure-verification-fresh.mjs`) — and thus never in the public git history either, since it's a fresh init rather than a filtered clone.
- GitHub Pages enabled on the public repo (Actions build type) — `docs/` deploys to `https://clezcoding.github.io/awesome-coolify-mcp/` via `.github/workflows/pages.yml` on every push touching `docs/**`. Verified green.
- `.github/workflows/publish.yml` added — future `npm publish` runs automatically on GitHub Release (needs an `NPM_TOKEN` repo secret added by the maintainer).
- Fixed a latent packaging bug: `bin` path had a leading `./` that npm silently stripped from the published manifest (`npm publish` auto-correction warning) — fixed to `"awesome-coolify-mcp": "dist/index.js"` in both repos' `package.json`. `repository.url` normalized to `git+https://...` in both.
- `src/config/env.ts` — removed the `npm start` hint from `formatEnvLoadHint` (that script only exists in the dev repo) so `src/` is now byte-identical across both repos; updated the corresponding test in `src/config/env.test.ts`.
- Added `scripts/sync-public-repo.sh` (dev repo only) — repeatable, whitelist-based export that rebuilds a fresh public git history, strips dev-only npm scripts, verifies build+test green, and prints the force-push command. Ran once end-to-end to validate.
- `CONTRIBUTING.md` rewritten with a "Repo layout" section explaining the dev/public split and pointing at the sync script; publish steps now mention the `publish.yml` automation and the Pages workflow.
- `npm pack --dry-run` on the clean snapshot confirmed a 7-file, ~84 kB tarball with zero leakage of internal files.

## Deferred to user

- **`npm publish awesome-coolify-mcp@0.1.0`** — blocked non-interactively by npm's 2FA/OTP requirement (`403 Two-factor authentication ... required`). User chose to run this manually from `/tmp/awesome-coolify-mcp-public` (package.json bin/repository fixes already applied there; tarball verified clean).
- Adding the `NPM_TOKEN` secret to the public repo so `.github/workflows/publish.yml` can auto-publish future GitHub Releases.

## Key links

- Public repo: https://github.com/clezcoding/awesome-coolify-mcp
- Private dev repo: https://github.com/clezcoding/awesome-coolify-mcp-dev
- Pages site: https://clezcoding.github.io/awesome-coolify-mcp/
- Sync script: `scripts/sync-public-repo.sh` (dev repo)
