# awesome-coolify-mcp in Cursor verwenden

Verbinde Cursor mit dem veröffentlichten Paket oder einem lokalen Build. Die
Konfiguration bleibt lokal, weil `.cursor/mcp.json` Coolify-Zugangsdaten enthalten kann.

## Voraussetzungen

- Cursor mit MCP-Unterstützung
- Node.js 24 oder neuer
- URL und API-Token für Coolify 4.1.x

Nutze einen Token mit möglichst wenigen Rechten. Committe ihn nie und füge ihn nicht in
Issues, Pull Requests oder Logs ein.

## Veröffentlichtes Paket

Lege `.cursor/mcp.json` im Projekt an:

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-coolify-mcp@1.1.4"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "<coolify-api-token>"
      }
    }
  }
}
```

Halte die Datei lokal. Wenn sie bereits andere Server enthält, ergänze nur den Eintrag
`awesome-coolify-mcp` unter `mcpServers`.

## Lokale Entwicklung

Baue zuerst das Repository:

```bash
corepack enable
corepack prepare pnpm@11.15.1 --activate
pnpm install
pnpm build
```

Ersetze danach den veröffentlichten Befehl durch den lokalen Build:

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "node",
      "args": ["/pfad/zu/awesome-coolify/dist/index.js"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "<coolify-api-token>"
      }
    }
  }
}
```

Baue nach Änderungen am Quellcode erneut.

## Neu laden und prüfen

Lade den MCP-Server in Cursors Einstellungen neu. Prüfe danach, ob **19 tools** und
**sechs Prompts** verfügbar sind. Beginne mit `system.health` und rufe anschließend
`system.version` für Coolify-Version und Capability-Flags auf.

Cursor zeigt eventuell einen Buchstaben statt des gelieferten MCP-Icons. Diese bekannte
Client-Einschränkung beeinflusst Tools und Prompts nicht.

## Empfohlene Abläufe

1. Nutze den Prompt `new-project` oder das Tool `setup` für Preflight, Wiring,
   Recipe-Auswahl, Env-Sync und optionales Deploy/Watch.
2. Nutze `recipe`, wenn Infrastruktur aus einem freigegebenen Recipe entstehen soll.
3. Nutze `deployment.watch` für zeitlich begrenzte Deployment-Überwachung.
4. Nutze `application.logs` für Application Runtime Logs oder Deployment Logs.
5. Nutze den Prompt `diagnose` oder `diagnose.logs` für anwendungsbezogene Diagnose.

Coolify 4.1.x bietet keine Service-/Database-Log-Endpunkte. Rate keine Aufrufe, sondern
prüfe `system.version.capabilities`.

## Fehlerbehebung

- **Server fehlt:** JSON prüfen, absoluten Pfad zu `dist/index.js` verwenden und Cursor
  neu laden.
- **Prozess endet:** `node --version` ausführen und Node.js 24 oder neuer bestätigen.
- **Authentifizierung schlägt fehl:** URL, Token-Rechte und TLS prüfen, ohne den Token
  auszugeben.
- **Altes Verhalten bleibt:** lokalen Build erneuern und MCP-Server neu starten.
- **Deployment hängt:** `deployment.watch`, danach Application- oder Deployment-Logs
  innerhalb der gemeldeten Capabilities prüfen.

## Weitere Anleitungen

- [Coolify Cloud](cloud.md)
- [Englischer Setup-Ablauf](../en/setup.md)
- [Sicherheitsrichtlinie](../../.github/SECURITY.md)
- [Mitwirken](../../.github/CONTRIBUTING.md)
