---
name: backstroke
description: >-
  Entry point for Backstroke's marketing tools. Use when the user wants to make
  a campaign from a prompt, or improve, score, or A/B a marketing email —
  subject lines, hero images, or per-audience variants — and route the result
  into their ESP (Klaviyo, Cordial, Beefree). Picks the right Backstroke recipe
  and hands off.
---

# Backstroke

Backstroke is the **prediction layer** for email marketing: it tells you which
subject line or hero image will win, per audience. It plugs into the ESP you
already use: you call Backstroke to *predict*, then act through your own Klaviyo /
Cordial / Beefree connector or Backstroke's built-in Klaviyo writes. Backstroke can
also make, build, push and schedule a whole campaign.

This skill routes you to the right recipe. Read the table, pick the match, and
follow that skill like a runbook.

## First time here?
If the Backstroke MCP isn't connected yet (no `backstroke` tools available, or
tool calls 401), run the **`setup`** skill first — it installs, authorizes, and
verifies the connection.

## Housekeeping
To update the plugin, or to check whether the installed recipes are still in sync
with the live Backstroke MCP, run the **`update`** skill.

## Pick a recipe

| The user wants to… | Use skill | Writes? |
|---|---|---|
| Make a new campaign from a prompt — brief, build, subject lines, push, schedule | **`create-campaign`** | Yes — Backstroke + Klaviyo (gated) |
| Get stronger, audience-tailored subject lines for an existing Klaviyo campaign, set up as A/B variants | **`subject-line-ab-optimizer`** | Yes — Klaviyo (gated) |
| Just see subject-line ideas for pasted email copy (no campaign, no write) | call `generate_subject_lines` with the copy | No |
| Pick the winning hero image among candidates and build/send it in another tool | **`hero-winner-picker`** | No (hand-off is a write — gated) |
| Quickly find the winning image among a few candidates, zero account setup | **`image-face-off`** | No |

**Planned — not yet available**
- **Predictive hero A/B test** — A/B test the *per-cohort* predictive hero (each cohort
  sees its own winning hero) against a static control, in Klaviyo. Blocked: needs the
  cohort-id **dynamic-string generator exposed as an MCP tool**, plus a template-insert
  path.
- **Predictive heroes** — *generate* the hero image(s) most likely to win for a
  campaign, not just rank existing ones. Recipe lands with its tool; `update` will
  announce it when it ships.

## The tool surface (what Backstroke exposes)

**Predictive core — ESP-agnostic, composes with any other MCP today:**
`generate_subject_lines`, `score_hero_generic`, `score_hero_for_my_audience`,
`get_hero_scores`, `get_brand_config`.

**Klaviyo cluster — Backstroke's own Klaviyo round-trip:**
`list_klaviyo_campaigns`, `read_campaign_content`, `list_cohorts`, `push_subject_lines`.

**Campaign flow:** `create_campaign` → `get_campaign_status` → `generate_subject_lines`
→ `push_campaign_to_klaviyo` → `schedule_campaign`.

Every write (`create_campaign`, `push_subject_lines`, `push_campaign_to_klaviyo`,
`schedule_campaign`) is one tool called twice: first without `fingerprint` (a preview
that writes nothing), then, after the user says yes, with that `fingerprint`.

## The one rule
Any tool that **writes** to a marketing account (the four writes above, or a
hand-off to another MCP's send/schedule tool)
runs **only after the user has reviewed and approved the exact content**.
`schedule_campaign` sends to real people and can't be undone: apply it only after an
explicit yes to the send time and audiences in its preview. Predict freely; never
send silently.
