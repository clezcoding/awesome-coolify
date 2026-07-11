---

## English

### What is Coolify MCP?

**Coolify MCP Server** is an open-source [Model Context Protocol](https://modelcontextprotocol.io/) server for self-hosted [Coolify](https://coolify.io/) instances (API **4.1.x**). It will replace **Coolify CLI**, **user-coolify MCP**, and **coolify-backup-mcp** with one well-documented implementation.

An AI agent manages **multiple** Coolify instances through **one** MCP server:

- Trigger and monitor deployments
- Read runtime and build logs
- Diagnose apps, servers, and services
- Run emergency and bulk operations

**v1** ships ops-ready tools. Create/delete and full parity land in **v2**.

### Why?

| Problem | Solution |
|---------|----------|
| Three overlapping tools | One server, one schema |
| 60+ tools overwhelm LLMs | Domain + `action` pattern |
| Multi-instance per config | Central `instances.json` |
| Unstructured failures | Error codes + recovery hints |
| Secret leakage | Mask by default |
| Unsafe destructive ops | `confirm: true` gate |

### MCP configuration (Cursor)

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

### Deliberately not in v1

| Feature | Reason |
|---------|--------|
| App/service/DB/server CRUD | v2 — faster ops MVP |
| Container exec | Coolify 4.1.x API gap |
| 60+ granular tools | Anti-pattern |

### Contributing

See [Contributing](#contributing). License: [MIT](LICENSE).
