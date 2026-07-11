---

## Multi-Instance

Alle Instanzen leben in **`~/.coolify-mcp/instances.json`** — portabel über alle MCP-Clients.

```json
{
  "default": "production",
  "instances": {
    "production": {
      "name": "Production",
      "url": "https://coolify.example.com",
      "token": "YOUR_TOKEN",
      "verifySsl": true
    },
    "staging": {
      "name": "Staging",
      "url": "https://staging-coolify.example.com",
      "token": "YOUR_STAGING_TOKEN",
      "verifySsl": true
    },
    "homelab": {
      "name": "Homelab",
      "url": "http://192.168.1.50:8000",
      "token": "YOUR_HOMELAB_TOKEN",
      "verifySsl": false
    }
  }
}
```

### Instance-Actions

| Action | Beschreibung |
|--------|--------------|
| `add` | Neue Instanz registrieren |
| `list` | Alle Instanzen auflisten |
| `get` | Instanz-Details |
| `update` | URL, Token oder Name ändern |
| `delete` | Instanz entfernen |
| `set-default` | Default-Instanz setzen |
| `switch` / `use` | Aktive Instanz wechseln |
| `verify` | Verbindung + API-Version testen |

> [!TIP]
> **Token-Override** pro Request ist unterstützt — der Override wird nie auf Platte geschrieben.
