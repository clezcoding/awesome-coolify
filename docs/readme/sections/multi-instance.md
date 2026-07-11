---

## 🌐 Multi-instance

All instances live in **`~/.coolify-mcp/instances.json`** — portable across MCP clients.

<details>
<summary><b>⚙️ View Configuration Example (`instances.json`)</b></summary>

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

</details>

<details>
<summary><b>🛠️ View Available Instance Actions</b></summary>

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

</details>

> [!TIP]
> Per-request **token override** is supported — the override never touches disk.

---

### 🔗 Quick Links
[⚡ Quick Start](#quick-start) · [🛠 Features](#features) · [📐 Architecture](#architecture) · [🔐 Security](#security)

