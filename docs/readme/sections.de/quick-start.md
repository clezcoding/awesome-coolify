---

## 🚀 Schnellstart

> [!NOTE]
> npm-Paket noch nicht veröffentlicht. Lokales Dev / `npm link` bis Phase 7.

### 1️⃣ Installieren (bald)

```bash
npx -y @clezcoding/coolify-mcp
```

### 2️⃣ Instanzen konfigurieren

<details>
<summary><b>⚙️ Klicken, um Konfigurationsanweisungen anzuzeigen (`instances.json`)</b></summary>

Erstelle die Konfigurationsdatei unter `~/.coolify-mcp/instances.json`:

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

</details>

### 3️⃣ Mit MCP-Client verbinden

<details>
<summary><b>🔌 Klicken, um Client-Installationsanleitungen anzuzeigen (Cursor, Claude Desktop, etc.)</b></summary>

#### Einrichtung in Cursor
Füge dies zu `~/.cursor/mcp.json` (Cursor) hinzu:

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

#### Einrichtung in Claude Desktop
Für Claude Desktop (macOS) denselben `mcpServers`-Block in:
`~/Library/Application Support/Claude/claude_desktop_config.json` eintragen.

</details>

### 4️⃣ Mit dem Agent reden

Client neu laden, dann fragen:

> 💬 *"Verifiziere meine Coolify-Verbindung und liste alle Applications auf Production."*

<details>
<summary><b>🛠️ Lokale Entwicklung & manuelles Setup</b></summary>

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

</details>

---

### 🔗 Quick Links
[🛠 Features](#features) · [📐 Architektur](#architektur) · [🌐 Multi-Instance](#multi-instance) · [🔐 Sicherheit](#sicherheit)

