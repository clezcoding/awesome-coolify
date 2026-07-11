---

## Contributing

Community OSS — contributions welcome.

1. **Fork** [github.com/clezcoding/awesome-coolify-mcp](https://github.com/clezcoding/awesome-coolify-mcp)
2. **Read** [`mcp_features.md`](mcp_features.md) and [`.planning/`](.planning/)
3. **Open** an issue or draft PR aligned with the current phase
4. **Stack:** TypeScript · `@modelcontextprotocol/sdk` · Zod
5. **Keep** the action-based schema — no new single-purpose tools per API endpoint

**v1 priority:** deploy, logs, diagnose, multi-instance — before CRUD.

### Regenerate README

```bash
npm run build --prefix docs/readme
```

This writes both `README.md` (English) and `README.de.md` (German).

### Assets

| File | Purpose | Source |
|------|---------|--------|
| `assets/logo.png` | Primary logo (1024×1024) | Higgsfield Recraft v4.1 → resvg |
| `assets/logo.svg` | Vector logo | Higgsfield Recraft v4.1 |
| `assets/hero-banner.png` | README hero banner (1920×640, 3:1) | Higgsfield GPT Image 2 |
| `assets/social-preview.png` | GitHub social preview (1280×640, 1.91:1) | Higgsfield GPT Image 2 |
| `assets/mascot.png` | Project mascot "Prism" (512×512) | Higgsfield GPT Image 2 |
| `assets/mascot-1024.png` | Hi-res mascot variant | Higgsfield GPT Image 2 |
| `assets/logo-legacy.png` | Previous hand-crafted logo (backup) | manual SVG → PNG |
| `assets/logo-legacy.svg` | Previous hand-crafted vector (backup) | manual |

Regenerate Higgsfield assets: see `scripts/fix-higgsfield.sh` and the `higgsfield-generate` skill.
