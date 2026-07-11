---

## Multi-instance

All instances live in **`~/.coolify-mcp/instances.json`** — portable across MCP clients.

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

### Instance actions

| Action | Description |
|--------|-------------|
| `add` | Register new instance |
| `list` | List all instances |
| `get` | Instance details |
| `update` | Change URL, token, or name |
| `delete` | Remove instance |
| `set-default` | Set default instance |
| `switch` / `use` | Switch active instance |
| `verify` | Test connection + API version |

Per-request **token override** supported — never persisted to disk.
