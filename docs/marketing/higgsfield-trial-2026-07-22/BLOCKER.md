# Higgsfield trial blocker (2026-07-22)

## What happened

Account shows **Plan: plus**, **Credits: 10**. User reported a **1-day unlimited free trial**.

MCP `generate_*` calls return:

```text
403 only_website_usage_on_trial_is_available
```

Confirmed for:

- `generate_audio` / `seed_audio`
- `generate_video` / `kling3_0_turbo`
- `generate_video` / `marketing_studio_video` (also generic "Something went wrong")
- `generate_image` / `nano_banana_pro` (generic error; same trial window)

`get_cost` still works (e.g. nano_banana_pro = 2 credits). Media upload + confirm works.

## Meaning

Trial unlocks **higgsfield.ai website / in-product usage**, not the **MCP generation API**.

To burn the trial today: generate in the **Higgsfield web UI** (or wait until MCP generation is allowed / credits unlocked for agents).

## Seeded refs already in Higgsfield (media_ids)

| Asset | media_id |
|-------|----------|
| mascot-d1-cloud-plug.png | `264f2ed4-5189-4738-9f97-442933c57186` |
| mascot-d2-robot-hex.png | `bc64083d-ce45-438c-ba16-39a684d22bb0` |
| mascot-d3-droplet-box.png | `b7ad9d08-c0e7-4712-8414-20365e5cbfa9` |
| hero-banner.png | `450a04dc-2f41-4b47-9b9f-e48df2f20bdc` |
| social-preview.png | `e92b1133-a3bc-4f0d-a900-d72bdbe40170` |
| mcp-icon-192.png | `bda70de2-5368-4c97-9bf3-93982b03cabd` |

## Product URLs for Marketing Studio

- Repo: https://github.com/clezcoding/awesome-coolify
- Docs: https://clezcoding.github.io/awesome-coolify/
- Install: https://clezcoding.github.io/awesome-coolify/install.html

## Unblock paths

1. **Today (trial):** Use [higgsfield.ai](https://higgsfield.ai) + `WEB-BLAST-PROMPT-PACK.md` — fire as many jobs as the trial allows.
2. **MCP resume:** When API allows generation, re-run `/gsd-quick resume maximize-higgsfield-1-day-unlimited-free` or ask agent to execute PLAN with seeded media_ids.
3. **Credits:** Top-up / auto-refill via Higgsfield billing if trial is web-only by design.
