---

## Deutsch

### Was ist Coolify MCP?

**Coolify MCP Server** ist ein Open-Source-MCP-Server für self-hosted Coolify-Instanzen (API **4.1.x**). Er ersetzt langfristig **Coolify CLI**, **user-coolify MCP** und **coolify-backup-mcp** durch eine einzige, gut dokumentierte Implementierung.

Ein AI-Agent kann über **einen** MCP-Server **mehrere** Coolify-Instanzen verwalten:

- Deployments auslösen und überwachen
- Runtime- und Build-Logs lesen
- Apps, Server und Services diagnostizieren
- Notfall- und Bulk-Operationen durchführen

**v1** liefert Ops-Tools (Deploy, Logs, Diagnose, Multi-Instance). Create/Delete und volle Feature-Parität folgen in **v2**.

### Warum?

| Problem | Lösung |
|---------|--------|
| Drei MCPs / CLI mit Duplikaten | Ein Server, eine Wahrheit |
| 60+ Einzeltools überfordern LLMs | Action-Schema pro Domäne |
| Multi-Instance nur pro Config | Zentrale `instances.json` |
| Unstrukturierte API-Fehler | Structured Error Codes + Hints |
| Secrets in Responses | Default-Maskierung, Reveal opt-in |
| Destructive Ops ohne Gate | `confirm: true` Pflicht |

### MCP-Konfiguration (Cursor)

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "npx",
      "args": ["-y", "@clezcoding/coolify-mcp"]
    }
  }
}
```

### Bewusst nicht in v1

| Feature | Grund |
|---------|-------|
| App/Service/DB/Server Create & Delete | v2 — schnelleres Ops-MVP |
| Execute Command in Container | API fehlt in Coolify 4.1.x |
| 60+ granulare Einzeltools | Anti-Pattern |

### Mitwirken

Siehe [Contributing](#contributing). Lizenz: [MIT](LICENSE).
