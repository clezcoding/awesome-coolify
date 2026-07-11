---

## Mitwirken

Community-OSS — Beiträge willkommen.

1. **Forken** [github.com/clezcoding/awesome-coolify-mcp](https://github.com/clezcoding/awesome-coolify-mcp)
2. **Lesen** [`mcp_features.md`](mcp_features.md) und [`.planning/`](.planning/)
3. **Öffnen** eines Issues oder Draft-PRs passend zur aktuellen Phase
4. **Stack:** TypeScript · `@modelcontextprotocol/sdk` · Zod
5. **Beibehalten** des Action-Schemas — keine neuen Einzeltools pro API-Endpunkt

**v1-Priorität:** Deploy, Logs, Diagnose, Multi-Instance — vor CRUD.

### README regenerieren

```bash
npm run build --prefix docs/readme
```

Schreibt sowohl `README.md` (Englisch) als auch `README.de.md` (Deutsch).

### Assets

| Datei | Zweck | Quelle |
|-------|-------|--------|
| `assets/logo.png` | Primäres Logo (1024×1024) | Higgsfield Recraft v4.1 → resvg |
| `assets/logo.svg` | Vektor-Logo | Higgsfield Recraft v4.1 |
| `assets/hero-banner.png` | README-Hero-Banner (1920×640, 3:1) | Higgsfield GPT Image 2 |
| `assets/social-preview.png` | GitHub-Social-Preview (1280×640, 1.91:1) | Higgsfield GPT Image 2 |
| `assets/mascot.png` | Projekt-Maskottchen "Prism" (512×512) | Higgsfield GPT Image 2 |
| `assets/mascot-1024.png` | Hi-res Maskottchen-Variante | Higgsfield GPT Image 2 |
| `assets/logo-legacy.png` | Altes hand-crafted Logo (Backup) | manuelles SVG → PNG |
| `assets/logo-legacy.svg` | Alter hand-crafted Vektor (Backup) | manuell |

Higgsfield-Assets regenerieren: siehe `scripts/fix-higgsfield.sh` und den `higgsfield-generate`-Skill.
