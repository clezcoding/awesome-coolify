# API Coverage — Phase 15 Multi-Instance Registry & Routing

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 15 does **not** integrate a new external API. It (a) wraps the existing
Coolify REST API surface already covered by Phases 1–13 with an optional
`instance` routing parameter, and (b) introduces a new **local-filesystem**
registry API (`~/.coolify-mcp/instances.json`) exposed via the new `instance`
tool. The Coolify HTTP client (`createCoolifyClient`) is reused unchanged; no
new Coolify endpoints are called.

The local registry is not an external API — it is a file owned by this process.
The API-Coverage gate fires on the term "api" in the plan body, so this matrix
is produced defensively to record the decision.

## Capability surface

| capability | decision | reason |
|---|---|---|
| instance.list | INTEGRATE | |
| instance.get | INTEGRATE | |
| instance.add | INTEGRATE | |
| instance.update | INTEGRATE | |
| instance.delete | INTEGRATE | |
| instance.set-default | INTEGRATE | |
| instance.import-env | INTEGRATE | |
| instance.verify (live ping on add) | OPT-OUT | not needed yet — D-02 marks verify as optional; deferred to a later phase if user demand surfaces |
| instance.switch (session sticky active) | OPT-OUT | explicitly rejected by D-02 — default is persisted in registry only (D-14) |
| 12 API-calling tools with `instance` param | INTEGRATE | CTX-06 core requirement |
| meta.version with `instance` param | OPT-OUT | meta makes no Coolify API call — no creds needed |
| docs.search with `instance` param | OPT-OUT | docs uses a static index, no Coolify API call |
| fan-out query across all instances | OPT-OUT | explicitly out of scope per REQUIREMENTS.md — rate limits, token cost, security |

---

*Authored: 2026-07-21 — Phase 15 planning*
*Fixed: 2026-07-22 — single table (parser skips only first header row)*
