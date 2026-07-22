# Coolify Cloud

Nutze **awesome-coolify-mcp** mit [Coolify Cloud](https://app.coolify.io) — dieselben 14 Domänen-Tools und 55 Actions wie bei Self-Hosted, mit team-scoped Tokens und strukturierten Cloud-Fehlercodes.

> **Branding:** Das MCP-Serverlisten-Icon wird über jsDelivr ausgeliefert — siehe [`docs/assets/mcp-icon-192.png`](../assets/mcp-icon-192.png) und [`docs/assets/README.md`](../assets/README.md).

Zurück zur Haupt-Installationsanleitung: [README.de — Installation](../../README.de.md#-installation).

---

## Überblick

Coolify Cloud (`https://app.coolify.io`) ist Coolifys gehostetes SaaS. Dieser MCP-Server behandelt Cloud-Instanzen wie Self-Hosted für Day-2-Ops (Deploy, Logs, Diagnose, Resource-CRUD usw.), aber einige Infrastruktur-Endpunkte unterscheiden sich oder sind auf Cloud nicht verfügbar.

Nutze die `instance`-Action **`cloud-info`** für lokale/statische Discovery — sie liefert `isCloud`, aufgelöste URL, Credential-Quelle, Setup-Hinweise, bekannte Limits und einen Docs-Link. **Es erfolgt kein Coolify-API-Call.**

```js
instance({ action: "cloud-info" })
```

---

## Setup

Erzeuge ein **team-scoped** API-Token in [app.coolify.io](https://app.coolify.io) unter **Keys & Tokens**. Niemals echte Tokens committen — Platzhalter oder Umgebungsvariablen verwenden.

### Pfad 1 — `instance.add` (Registry)

Cloud in `~/.coolify-mcp/instances.json` registrieren:

```js
instance({
  action: "add",
  name: "cloud",
  url: "https://app.coolify.io",
  token: "<team-scoped-token>",
  type: "cloud",
})
```

### Pfad 2 — `import-env` (Prozess-Umgebung)

Env-Variablen in der MCP-Client-Config setzen (siehe [README.de — Installation](../../README.de.md#-installation)), dann importieren:

```json
{
  "COOLIFY_URL": "https://app.coolify.io",
  "COOLIFY_TOKEN": "<team-scoped-token>"
}
```

```js
instance({ action: "import-env" })
```

`import-env` kopiert `COOLIFY_URL` + `COOLIFY_TOKEN` aus der Prozess-Umgebung in die lokale Registry — nur opt-in.

### Optional — Token-Sanity-Check (curl)

Token vor dem MCP-Setup prüfen:

```bash
curl -H "Authorization: Bearer $COOLIFY_TOKEN" \
  https://app.coolify.io/api/v1/version
```

Bei Erfolg JSON-Version erwarten; `401` bedeutet Token neu erzeugen.

---

## Smoke-Test

Nach dem Connect diesen agent-first Pfad ausführen:

1. **Discovery (lokal, kein API-Call):**

   ```js
   instance({ action: "cloud-info" })
   ```

   Erwartet `isCloud: true`, `url: "https://app.coolify.io"` und `source` als `registry`, `env` oder `infer`.

2. **Connectivity:**

   ```js
   system({ action: "health" })
   meta({ action: "version" })
   ```

3. **Leichter Resource-Read** (eine bekannte UUID aus dem Cloud-Dashboard):

   ```js
   resource({ action: "list", per_page: 5 })
   // oder
   application({ action: "get", uuid: "<app-uuid>" })
   ```

---

## Bekannte Limits

| Limit | Detail |
|-------|--------|
| Server-CRUD via API | Cloud unterstützt **kein** Server-Create, -Validate oder -Delete über die REST-API — Server-Management über das Cloud-Dashboard. |
| Self-Hosted-only Endpunkte | Manche Self-Hosted-Endpunkte liefern auf Cloud **404** → strukturierter Code `COOLIFY_CLOUD_UNSUPPORTED`. |
| Team-scoped Tokens | Tokens sind team-gebunden — prüfen, ob das Token-Team die Ziel-Ressource besitzt. |
| Gleiche Tool-Oberfläche | Alle 14 MCP-Domänen-Tools bleiben verfügbar; Fehler als strukturierte Codes, keine stillen Stubs. |

`cloud-info` `knownLimits` spiegelt diese Liste lokal — kein Live-Capability-Probe.

---

## Fehlercodes

Cloud-spezifische strukturierte Codes greifen, wenn der Instanz-Hostname `*.coolify.io` ist (oder Registry-`type: cloud`):

### `COOLIFY_CLOUD_FORBIDDEN` (HTTP 403)

Token- oder Team-Berechtigungsproblem auf Cloud.

**Recovery-Hints:**

- Team-scoped Token in app.coolify.io unter Keys & Tokens neu erzeugen und benötigte Abilities prüfen.
- Cloud-Tokens sind team-scoped — prüfen, ob das Token zum Team der Ziel-Ressource gehört.

### `COOLIFY_CLOUD_UNSUPPORTED` (HTTP 404)

Endpunkt auf Coolify Cloud nicht verfügbar.

**Recovery-Hints:**

- Endpunkt auf Coolify Cloud nicht unterstützt oder nicht verfügbar — Self-Hosted-Alternative oder Cloud-Dashboard nutzen.
- Siehe dieses Doc für bekannte Cloud-unsupported Endpunkte.

Generische Codes (`COOLIFY_401`, `COOLIFY_404` usw.) gelten weiterhin als Fallback auf Nicht-Cloud-Hostnames.

---

## Links

- [README.de — Installation](../../README.de.md#-installation)
- [English parity — docs/en/cloud.md](../en/cloud.md)
- [MCP-Branding-Assets](../assets/README.md)
