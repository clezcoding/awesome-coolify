# Quick Task 260719-8ol: Install GitHub repo tooling - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Task Boundary

Install GitHub Actions / repo tooling for `clezcoding/awesome-coolify` per locked user answers.

</domain>

<decisions>
## Implementation Decisions

### 1. Comfy Publish To Registry (item 5)
- INSTALL anyway (user chose option 2) — add workflow using `Comfy-Org/publish-node-action`
- Document that this targets Comfy custom nodes; needs `REGISTRY_ACCESS_TOKEN` secret + `pyproject.toml` (repo may lack these — add stub workflow + clear comments/docs)

### 2. Publish MCP Server (items 6/9)
- Install once via `OtherVibes/mcp-publish-action@v1` (tag trigger `v*`, OIDC `id-token: write`)
- Duplicate listing ignored

### 3. npm publish
- KEEP existing OIDC Trusted Publishing `publish.yml`
- Do NOT add `JS-DevTools/npm-publish`

### 4. Release Drafter
- ADD alongside existing Changesets `release.yml` (do not replace Changesets)

### 5. setup-node
- Pin/update `actions/setup-node` across all workflows; keep Node 24 pin consistent

### 6. Kodiak
- Add `.kodiak.toml` + short docs for manual GitHub App install (cannot install App via code)

### 7. publint
- Add npm script + CI step

### 8. MegaLinter
- Narrow config only: TS/JS/YAML/Markdown/GitHub Actions (not full default)

### Docs
- Update `dev-docs/github-setup-overview.md` for all new pieces

### Claude's Discretion
- Workflow filenames, MegaLinter flavor/image, Release Drafter config categories, MCP registry `name`/`identifier` fields from package.json (`awesome-coolify-mcp`)
- Prefer pinned action versions (not `@main`) where marketplace tags exist
- setup-node already at v7 in existing workflows — verify consistency; bump only if newer stable exists

</decisions>

<specifics>
## Specific Ideas

User answer string: `2,1,1,1,1,1,1,2` mapped to questions 1–8 above.

Existing stack to preserve:
- `.github/workflows/ci.yml` — setup-node@v7, Node 24
- `.github/workflows/publish.yml` — OIDC npm publish
- `.github/workflows/release.yml` — Changesets
- `dev-docs/github-setup-overview.md` — update in place

</specifics>

<canonical_refs>
## Canonical References

- https://github.com/actions/setup-node
- https://github.com/marketplace/actions/publish-to-registry (Comfy-Org)
- https://github.com/marketplace/actions/publish-mcp-server (OtherVibes)
- https://github.com/publint/publint
- https://github.com/oxsecurity/megalinter
- Release Drafter: https://github.com/release-drafter/release-drafter
- Kodiak: https://kodiakhq.com /

</canonical_refs>
