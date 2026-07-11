---

## Why Coolify MCP?

Three overlapping tools. One confused agent. Maintenance nightmare.

```mermaid
flowchart LR
    subgraph Today["Today"]
        CLI["Coolify CLI"]
        MCP1["user-coolify MCP"]
        MCP2["coolify-backup-mcp"]
    end

    subgraph Agent["AI Agent"]
        Cursor["Cursor / Claude"]
    end

    subgraph Future["Coolify MCP"]
        Unified["coolify-mcp<br/>action schema"]
    end

    Cursor --> CLI
    Cursor --> MCP1
    Cursor --> MCP2
    Cursor -.-> Unified

    style Unified fill:#9333EA,color:#fff,stroke:#6366F1
    style Today fill:#1e1b4b,color:#e9d5ff
```

| Problem today | Coolify MCP answer |
|---------------|-------------------|
| 60+ single-purpose MCP tools | Domain tools + `action` parameter |
| Multi-instance per MCP config entry | Central `instances.json` + switch |
| Unstructured API failures | `COOLIFY_*` codes + recovery hints |
| Secrets leak into context | Mask by default, `reveal` opt-in |
| Destructive ops without guardrails | `confirm: true` required |
| Three docs, three schemas | One README, one source of truth |

> **Design principle:** optimize for *agent recovery* and *context efficiency*, not API endpoint parity on day one.
