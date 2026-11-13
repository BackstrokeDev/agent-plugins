---
hosts: [claude-plugin]
name: backstroke
description: >-
  Entry point for Backstroke's marketing tools. Use when the user wants to make
  a campaign from a prompt, or improve, score, or A/B a marketing email —
  subject lines, hero images, or per-Cluster variants — and route the result
  into their ESP (Klaviyo, Cordial, Beefree). Picks the right Backstroke recipe
  and hands off.
---

# Backstroke

Backstroke is the **prediction layer** for email marketing: it tells you which
subject line will win per Cluster, and which hero image will win per demographic cohort. It plugs into the ESP you
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
| Get stronger, Cluster-tailored subject lines for an existing Klaviyo campaign, set up as A/B variants | **`subject-line-ab-optimizer`** | Yes — Klaviyo (gated) |
| Just see subject-line ideas for pasted email copy (no campaign, no write) | call `generate_subject_lines` with the copy | No |
| Pick the winning hero image among candidates and build/send it in another tool | **`hero-winner-picker`** | No (hand-off is a write — gated) |
| Quickly find the winning image among a few candidates, zero account setup | **`image-face-off`** | No |

**Planned — not yet available**
- **Predictive hero A/B test** — A/B test the *per-demographic-cohort* predictive hero (each demographic cohort
  sees its own winning hero) against a static control, in Klaviyo. Blocked: needs the
  demographic-cohort-id **dynamic-string generator exposed as an MCP tool**, plus a template-insert
  path.

## The tool surface (what Backstroke exposes)

**Predictive core — ESP-agnostic, composes with any other MCP today:**
`generate_subject_lines`, `score_hero_generic`, `score_hero_for_my_audience`,
`get_hero_scores`, `get_brand_config`.

**Klaviyo cluster — Backstroke's own Klaviyo round-trip:**
`list_klaviyo_campaigns`, `read_campaign_content`, `list_clusters`, `list_audiences`, `push_subject_lines`.

**Campaign flow:** `create_campaign` → `get_campaign_status` → `generate_subject_lines`
→ `push_campaign_to_klaviyo` → `schedule_campaign`. Without the `campaign_id`, call
`get_campaign_status` with the campaign's `name`.

Every write (`create_campaign`, `push_subject_lines`, `push_campaign_to_klaviyo`,
`schedule_campaign`) is one tool called twice: first without `fingerprint` (a preview
that writes nothing), then with that `fingerprint`. `create_campaign` makes a
Backstroke draft and applies without asking; the other three apply only after the
user says yes.

## The one rule
Any tool that **pushes to or sends from** a marketing account (`push_subject_lines`,
`push_campaign_to_klaviyo`, `schedule_campaign`, or a hand-off to another MCP's
send/schedule tool)
runs **only after the user has reviewed and approved the exact content**.
`schedule_campaign` sends to real people and can't be undone: apply it only after an
explicit yes to the send time and audiences in its preview. Predict freely; never
send silently.
