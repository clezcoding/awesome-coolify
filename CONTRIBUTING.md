# Contributing to awesome-coolify-mcp

Thank you for helping improve the community MCP server for self-hosted Coolify. Clone the repo, run `npm install`, `npm test`, and `npm run build` before opening a pull request.

## Development

Run the MCP server locally over stdio:

```bash
npm run dev      # watch build
npm run start    # stdio MCP via scripts/run-mcp.mjs
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
3. **`npm publish --access public`** — `prepublishOnly` runs `npm run build` automatically; `--access public` matches `publishConfig.access`
4. **Post-publish** — tag the release (`git tag v0.1.0 && git push --tags`), open a GitHub Release, and link the npm package URL

## Version bump policy

Follow semver in `package.json`:

- **Patch** — bug fixes, doc-only fixes that do not change tool contracts
- **Minor** — new tools or actions, backward-compatible schema additions
- **Major** — breaking changes to tool schemas, env contract, or response shapes

Bump `version` before publishing.

## Code of conduct

Be excellent to each other. Disagreement is fine; harassment is not.
