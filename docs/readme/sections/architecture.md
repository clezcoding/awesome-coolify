---

## 📐 Architecture

Detailed overview of the inner workings of Coolify MCP.

```mermaid
flowchart TB
    subgraph Clients["MCP Clients"]
        direction LR
        C1["Cursor IDE"]
        C2["Claude Desktop"]
        C3["Other MCP hosts"]
    end

    subgraph Server["Coolify MCP Server"]
        direction TB
        P["MCP Protocol<br/><code>@modelcontextprotocol/sdk</code>"]
        R["Action Router<br/><code>domain + action</code>"]
        X["Context Manager<br/><code>~/.coolify-mcp/instances.json</code>"]
        H["Coolify HTTP Client<br/>retry · auth · errors"]
        F["Formatters<br/>mask · paginate · max_chars"]
    end

    subgraph Remote["Self-hosted Coolify 4.1.x"]
        direction LR
        A["Instance A"]
        B["Instance B"]
        N["Instance N…"]
    end

    Clients --> P --> R
    R --> X & H --> F --> P
    H --> A & B & N
    X -.->|URL + token| A & B

    classDef accent fill:#9333EA,color:#fff,stroke:#6366F1
    class P,R accent
```

### 🧠 Architecture Mindmap

<img src="assets/architecture-mindmap.png" alt="Coolify MCP Server Architecture Mindmap" width="100%" />

<details>
<summary><b>🗂️ View Layer Responsibilities Table</b></summary>

### Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Protocol** | JSON-RPC over stdio, tool registration |
| **Router** | `application({ action: 'deploy' })` → handler |
| **Context** | Multi-instance registry, default, active switch |
| **HTTP client** | Token injection, exponential backoff |
| **Formatters** | Summary/full projection, secret masking |

</details>

<details>
<summary><b>⚙️ View Technical Tech Stack Details</b></summary>

### Tech stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript 5.x |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Validation | Zod |
| Transport | stdio |
| Distribution | npm (`npx @clezcoding/coolify-mcp`) |

</details>

---

### 🔗 Quick Links
[🧬 Tool Schema](#tool-schema) · [🌐 Multi-instance](#multi-instance) · [🔐 Security](#security) · [📅 Roadmap](#roadmap)

