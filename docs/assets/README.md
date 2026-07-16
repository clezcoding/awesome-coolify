# Brand Assets

Official branding for **awesome-coolify-mcp**. Mascot **Hex Robot Helper** (winner).

## Primary assets

| File | Use |
|------|-----|
| `logo.png` | Main logo — README header, npm, GitHub avatar |
| `logo-transparent.png` | Cutout mascot (transparent background) |
| `favicon-512.png` | High-res icon source |
| `favicon-192.png` | PWA / apple-touch size |
| `favicon-32.png` | Small favicon |
| `social-preview.png` | GitHub Settings → Social preview (16:9) |
| `hero-banner.png` | README header banner — mascot + fleet/terminal/deploy/safety dashboard scene, no baked-in text |
| `architecture.png` | README architecture diagram (MCP clients → tools → Coolify API) |
| `features.png` | README feature showcase (action tools, safety, diagnose, deploy/logs) |
| `coming-soon.png` | README "Coming soon" roadmap banner — mascot sketching upcoming features |

## Generation notes (2026-07-16)

Hero banner / architecture / features / coming-soon generated with **Higgsfield Nano Banana Pro** (`nano_banana_pro`, 2K, 16:9), using `logo.png` as an `image`-role reference so the mascot stays visually consistent across assets. Legacy assets kept as `*.legacy.png`.

### CDN (jsDelivr)

README images load from the public repo via [jsDelivr GitHub CDN](https://www.jsdelivr.com/?docs=gh):

```
https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify-mcp@main/docs/assets/<file>
```

Both `awesome-coolify-mcp-dev` (private) and `awesome-coolify-mcp` (public) READMEs use this base — assets must be synced to the public repo (`scripts/sync-public-repo.sh`) before CDN URLs resolve. Pin `@main` for rolling updates or a commit SHA / release tag for immutable cache keys.

## Mascot variants (Round 2)

| File | Status |
|------|--------|
| `mascot-d2-robot-hex.png` | **Winner** → copied to `logo.png` |
| `mascot-d1-cloud-plug.png` | Alternate |
| `mascot-d3-droplet-box.png` | Alternate |

## Legacy (Round 1 — abstract icons)

`logo-variant-a-nodes.png`, `logo-variant-b-plug.png`, `logo-variant-c-c-sparkle.png` — superseded.

## Brand tokens

| Token | Hex |
|-------|-----|
| Primary violet | `#6b16ed` |
| Canvas | `#101010` |
| Surface | `#181818` |
| Accent | `#fcd34d` |

Compare early logo variants: `.planning/sketches/001-logo-mark/index.html`
