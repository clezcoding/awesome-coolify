---

## Schnellstart

> [!NOTE]
> npm-Paket noch nicht veröffentlicht. Lokales Dev / `npm link` bis Phase 7.

### 1 · Installieren (bald)

```bash
npx -y @clezcoding/coolify-mcp
```

### 2 · Instanzen konfigurieren

`~/.coolify-mcp/instances.json` anlegen:

```json
{
  "default": "production",
  "instances": {
    "production": {
      "name": "Production",
      "url": "https://coolify.example.com",
      "token": "YOUR_COOLIFY_API_TOKEN",
      "verifySsl": true
    }
  }
}
```

Token holen: **Coolify UI → Keys & Tokens → Create API Token**.

### 3 · Mit MCP-Client verbinden

`~/.cursor/mcp.json` (Cursor):

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

Für Claude Desktop (macOS) denselben `mcpServers`-Block in
`~/Library/Application Support/Claude/claude_desktop_config.json` eintragen.

### 4 · Mit dem Agent reden

Client neu laden, dann fragen:

> *"Verifiziere meine Coolify-Verbindung und liste alle Applications auf Production."*

### Lokale Entwicklung

```json
{
  "mcpServers": {
    "coolify": {
      "command": "node",
      "args": ["/absoluter/pfad/zu/awesome-coolify/dist/index.js"],
      "env": { "NODE_ENV": "development" }
    }
  }
}
```
