# Brand Assets

Public asset catalog for **awesome-coolify-mcp**. Use the smallest suitable file and
describe what the image communicates, not its filename.

## Primary assets (README)

| File | Use |
|------|-----|
| `logo.png` | npm, GitHub avatar, favicon source |
| `logo-transparent.png` | Cutout mascot (transparent background) |
| `favicon-512.png` | High-res icon source |
| `favicon-192.png` | PWA / apple-touch size |
| `mcp-icon-192.png` | MCP server list icon (serverInfo.icons) |
| `favicon-32.png` | Small favicon |
| `social-preview.png` | GitHub Settings → Social preview (16:9) |
| `hero-banner.png` | README header banner — mascot + fleet/terminal/deploy/safety dashboard |
| `architecture.png` | README architecture diagram |
| `features.png` | README feature showcase |
| `coming-soon.png` | README roadmap banner |

## GitHub Pages install assets

| File | Use |
|------|-----|
| `install-hero.png` | `docs/index.html` landing hero (21:9, mascot + install paths) |
| `install-configurator-hero.png` | `docs/install.html` configurator hero (21:9) |
| `install-deeplink-card.png` | Landing bento card art for one-click deeplinks |

Generated 2026-07-16 with **Higgsfield Nano Banana Pro**, using `logo.png` + `hero-banner.png` as references for mascot/style consistency.

### CDN (jsDelivr)

README images:

```text
https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/<file>
```

MCP server list icon (`serverInfo.icons`):

- **Primary:** build-time embedded PNG data URI from `mcp-icon-192.png` (shipped in npm tarball via `src/mcp/mcp-icon-data.ts`)
- **CDN:** jsDelivr multi-size entries — `mcp-icon-192.png` (192×192) and `favicon-32.png` (32×32)

```text
https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png
```

GitHub Pages serves install assets from `docs/assets/` on the same origin.

jsDelivr `@main` URLs can remain cached after a replacement. Prefer a release tag or
commit SHA when consumers need immutable bytes; change filenames when an immediate cache
refresh matters.

### GitHub Pages

- Landing: `https://clezcoding.github.io/awesome-coolify/`
- Configurator: `https://clezcoding.github.io/awesome-coolify/install.html`

## Mascot variants (Round 2)

| File | Status |
|------|--------|
| `mascot-d2-robot-hex.png` | **Winner** → copied to `logo.png` |
| `mascot-d1-cloud-plug.png` | Alternate |
| `mascot-d3-droplet-box.png` | Alternate |

## Selection and alt text

- Use `mcp-icon-192.png` for MCP metadata; use favicons only at their intended sizes.
- Use `hero-banner.png` for the repository overview and `social-preview.png` for GitHub
  social metadata.
- Use transparent assets when the surrounding background is unknown.
- Decorative images should use empty alt text. Informative images need concise purpose,
  for example: `Architecture: Cursor calls the MCP server, which routes requests to Coolify`.

The MCP icon source order is embedded 192×192 PNG, CDN 32×32 PNG, then CDN 192×192
PNG. Cursor may display a letter fallback despite valid metadata; see the
[verification record](cursor-icon-verify.md).

## Brand tokens

| Token | Hex |
|-------|-----|
| Primary violet | `#6b16ed` |
| Canvas | `#101010` |
| Surface | `#181818` |
| Accent | `#fcd34d` |
