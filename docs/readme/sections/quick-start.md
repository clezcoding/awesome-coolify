---

## 🚀 Quick Start

> [!NOTE]
> npm package not published yet. Use local dev / `npm link` until Phase 7.

### 1️⃣ Install (soon)

```bash
npx -y @clezcoding/coolify-mcp
```

### 2️⃣ Configure instances

<details>
<summary><b>⚙️ Click to expand configuration instructions (`instances.json`)</b></summary>

Create the configuration file at `~/.coolify-mcp/instances.json`:

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

Get your token: **Coolify UI → Keys & Tokens → Create API Token**.

</details>

### 3️⃣ Connect your MCP client

<details>
<summary><b>🔌 Click to expand client setup guides (Cursor, Claude Desktop, etc.)</b></summary>

#### Cursor Setup
Add this to `~/.cursor/mcp.json` (Cursor):

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

#### Claude Desktop Setup
For Claude Desktop on macOS, drop the same `mcpServers` block into:
`~/Library/Application Support/Claude/claude_desktop_config.json`

</details>

### 4️⃣ Talk to your agent

Reload your client, then ask your agent:

> 💬 *"Verify my Coolify connection and list all applications on production."*

<details>
<summary><b>🛠️ Local development & manual setup</b></summary>

```json
{
  "mcpServers": {
    "coolify": {
      "command": "node",
      "args": ["/absolute/path/to/awesome-coolify/dist/index.js"],
      "env": { "NODE_ENV": "development" }
    }
  }
}
```

</details>

---

### 🔗 Quick Links
[🛠 Features](#features) · [📐 Architecture](#architecture) · [🌐 Multi-instance](#multi-instance) · [🔐 Security](#security)

