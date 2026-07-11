---

## 🧬 Tool schema

Instead of **60+ granular tools**, Coolify MCP groups operations by **domain** with an **`action`** field.

<details>
<summary><b>🔄 View Legacy Pattern vs. Coolify MCP Design Pattern</b></summary>

### Before vs after

<table>
<tr>
<th>❌ Legacy pattern</th>
<th>✅ Coolify MCP</th>
</tr>
<tr>
<td>

`get_application`<br/>
`deploy_application`<br/>
`list_application_logs`<br/>
`restart_application`<br/>
`get_application_envs`<br/>
… × 40 more

</td>
<td>

```json
{
  "tool": "application",
  "arguments": {
    "action": "deploy",
    "identifier": "my-app",
    "wait": true
  }
}
```

</td>
</tr>
</table>

</details>

### Examples

<details>
<summary><strong>🚀 Deploy with wait-mode</strong></summary>

```json
{
  "tool": "application",
  "arguments": {
    "action": "deploy",
    "identifier": "my-nextjs-app",
    "forceRebuild": false,
    "wait": true,
    "timeoutSeconds": 600
  }
}
```

</details>

<details>
<summary><strong>🔍 Diagnose by domain</strong></summary>

```json
{
  "tool": "application",
  "arguments": {
    "action": "diagnose",
    "identifier": "api.example.com",
    "projection": "summary"
  }
}
```

</details>

<details>
<summary><strong>⚠️ Global issue scan</strong></summary>

```json
{
  "tool": "system",
  "arguments": { "action": "issues" }
}
```

</details>

<details>
<summary><strong>🧱 Structured error response</strong></summary>

```json
{
  "error": {
    "code": "COOLIFY_UNAUTHORIZED",
    "httpStatus": 401,
    "message": "API token invalid or expired",
    "recoveryHints": [
      "Verify token in Coolify UI → Keys & Tokens",
      "Run instance action 'verify'",
      "Check instance id or switch instance"
    ]
  }
}
```

</details>

---

### 🔗 Quick Links
[⚡ Quick Start](#quick-start) · [🛠 Features](#features) · [📐 Architecture](#architecture) · [🌐 Multi-instance](#multi-instance)

