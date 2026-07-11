---

## 🧬 Tool-Schema

Statt **60+ granularer Tools** gruppt Coolify MCP Operationen nach **Domäne** mit einem **`action`**-Feld.

<details>
<summary><b>🔄 Legacy-Pattern vs. Coolify MCP Entwurfsmuster anzeigen</b></summary>

### Vorher vs nachher

<table>
<tr>
<th>❌ Legacy-Pattern</th>
<th>✅ Coolify MCP</th>
</tr>
<tr>
<td>

`get_application`<br/>
`deploy_application`<br/>
`list_application_logs`<br/>
`restart_application`<br/>
`get_application_envs`<br/>
… × 40 weitere

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

### Beispiele

<details>
<summary><strong>🚀 Deploy mit Wait-Mode</strong></summary>

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
<summary><strong>🔍 Diagnose nach Domäne</strong></summary>

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
<summary><strong>⚠️ Globaler Issue-Scan</strong></summary>

```json
{
  "tool": "system",
  "arguments": { "action": "issues" }
}
```

</details>

<details>
<summary><strong>🧱 Strukturierte Error-Response</strong></summary>

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
[⚡ Schnellstart](#schnellstart) · [🛠 Features](#features) · [📐 Architektur](#architektur) · [🌐 Multi-Instance](#multi-instance)

