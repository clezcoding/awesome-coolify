# Contributing to awesome-coolify-mcp

Thank you for helping improve the community MCP server for self-hosted Coolify. Clone the repo, run `npm install`, `npm test`, and `npm run build` before opening a pull request.

## Repo layout

This project is developed across two repos:

- **`clezcoding/awesome-coolify-mcp`** (this repo, public) — source of truth for the npm package and the GitHub Pages install site (`docs/`). PRs and issues happen here.
- **`clezcoding/awesome-coolify-mcp-dev`** (private) — the maintainer's working repo: full planning history, spikes, research notes, and dev-only tooling. Nothing from it enters this repo's git history; a maintainer periodically syncs a clean snapshot over via `scripts/sync-public-repo.sh` (run from the dev repo).

External contributors only ever need this repo.

## Development

```bash
npm run dev      # watch build
npm test         # vitest
```

Logs go to **stderr** only (stdout is reserved for the MCP protocol).

## Publishing a release

Maintainer-only steps. Do not publish from a fork without npm publish rights on `awesome-coolify-mcp`.

### Prerequisites

- npm account with 2FA enabled and publish rights to `awesome-coolify-mcp` (member of the `clezcoding` org or equivalent)
- `npm login` completed on the machine used to publish
- Node.js **>= 20**
- `git remote -v` shows `https://github.com/clezcoding/awesome-coolify-mcp.git` as `origin`

### Release steps

1. **`npm run build`** — produces `dist/index.js` via tsup
2. **`npm pack --dry-run`** — confirm the tarball contains only:
   - `package.json`
   - `README.md`, `README.de.md`
   - `LICENSE`
   - `.env.example`
   - `dist/` (compiled output)
   
   It must **not** include source trees, dev scripts, tests, internal planning docs, editor config, or the docs site folder.
3. **`npm publish --access public`** — `prepublishOnly` runs `npm run build` automatically; `--access public` matches `publishConfig.access`. CI can also do this automatically: pushing a GitHub Release triggers `.github/workflows/publish.yml` (needs an `NPM_TOKEN` repo secret).
4. **Post-publish** — tag the release (`git tag v0.1.0 && git push --tags`), open a GitHub Release, and link the npm package URL

### GitHub Pages

`docs/` is deployed automatically to `https://clezcoding.github.io/awesome-coolify-mcp/` by `.github/workflows/pages.yml` on every push to `main` that touches `docs/`.

## Version bump policy

Follow semver in `package.json`:

- **Patch** — bug fixes, doc-only fixes that do not change tool contracts
- **Minor** — new tools or actions, backward-compatible schema additions
- **Major** — breaking changes to tool schemas, env contract, or response shapes

Bump `version` before publishing.

## Code of conduct

Be excellent to each other. Disagreement is fine; harassment is not.
