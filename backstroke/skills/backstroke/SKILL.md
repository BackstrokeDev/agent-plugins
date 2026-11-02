---
name: backstroke
description: >-
  Entry point for Backstroke's predictive marketing tools. Use when the user
  wants to improve, score, or A/B a marketing email — subject lines, hero
  images, or per-audience variants — and route the result into their ESP
  (Klaviyo, Cordial, Beefree). Picks the right Backstroke recipe and hands off.
---

# Backstroke

Backstroke is the **prediction layer** for email marketing: it tells you which
subject line or hero image will win, per audience. It does **not** send email or
build templates — it plugs into the ESP you already use. You call Backstroke to
*predict*, then act through your own Klaviyo / Cordial / Beefree connector (or
Backstroke's built-in Klaviyo write).

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
| Get stronger, audience-tailored subject lines for an existing Klaviyo campaign, set up as A/B variants | **`subject-line-ab-optimizer`** | Yes — Klaviyo (gated) |
| Just see subject-line ideas for pasted email copy (no campaign, no write) | call `predict_subject_lines` directly | No |
| Pick the winning hero image among candidates and build/send it in another tool | **`hero-winner-picker`** | No (hand-off is a write — gated) |
| Quickly find the winning image among a few candidates, zero account setup | **`image-face-off`** | No |

**Planned — not yet available**
- **Predictive hero A/B test** — A/B test the *per-cohort* predictive hero (each cohort
  sees its own winning hero) against a static control, in Klaviyo. Blocked: needs the
  cohort-id **dynamic-string generator exposed as an MCP tool**, plus a template-insert
  path.
- **Predictive heroes** — *generate* the hero image(s) most likely to win for a
  campaign, not just rank existing ones. Recipe lands with the
  `generate_predictive_heroes` tool; `update` will announce it when it ships.

## The tool surface (what Backstroke exposes)

**Predictive core — ESP-agnostic, composes with any other MCP today:**
`predict_subject_lines`, `predict_subject_lines_for_my_audience`,
`score_hero_generic`, `score_hero_for_my_audience`, `get_hero_scores`.

**Klaviyo cluster — Backstroke's own Klaviyo round-trip:**
`list_klaviyo_campaigns`, `read_campaign_content`, `list_cohorts`,
`push_subject_lines_to_klaviyo` (the only write; always human-approved).

## The one rule
Any tool that **writes** to a marketing account (`push_subject_lines_to_klaviyo`,
or a hand-off to another MCP's send/schedule tool) runs **only after the user has
reviewed and approved the exact content**. Predict freely; never send silently.
