---
name: hero-winner-picker
description: >-
  Use when a marketer has several candidate hero images and wants the winner FOR
  THEIR audience — then, optionally, to build the email around it (Beefree MCP)
  and schedule the send (Cordial / Klaviyo MCP). Scores images against the
  account's own cohorts, ranks them, and hands the winning image_url off to
  whatever other MCP the user has connected. ESP-agnostic — keys on image_url.
allowed-tools:
  - read_campaign_content
  - list_klaviyo_campaigns
  - score_hero_for_my_audience
  - score_hero_generic
  - get_hero_scores
---

# Playbook: hero-winner picker (predict → hand off)

Answer "which hero wins **for my audience**?" — then feed the winner into the
rest of the job: build the email in Beefree, schedule the send in Cordial or
Klaviyo. Backstroke picks; the customer's own connectors act.

This is the **coexistence** recipe: Backstroke has zero Beefree/Cordial/Klaviyo
*send* tools, yet it composes with them cleanly because the whole hand-off keys
on a **portable `image_url`** — not a hidden internal id. Works today.

## When to use this
- "Which of these hero images should I use for my audience?"
- "Pick the best hero for my list, then build the email and schedule it."
- The images are in a Klaviyo campaign the user names (pull them first).

**When NOT to use this**
- No audience / just a quick general read → `image-face-off` (global panel, zero
  setup).
- The user wants **subject lines** for a Klaviyo campaign, not hero images →
  `subject-line-ab-optimizer`.

## The tools this skill chains

| Step | Tool | Owner | Purpose |
|------|------|-------|---------|
| 1 | `read_campaign_content` *(optional)* | Backstroke | Pull `images[].src` from a named Klaviyo campaign. |
| 2 | `score_hero_for_my_audience` | Backstroke | Rank images against the account's audience (as demographic panels). |
| 2a | `get_hero_scores` | Backstroke | Poll if step 2 returns `status:"pending"`. |
| 3 | *(present + user picks winner)* | — | Confirm the winning image. |
| 4 | build/send tools | **the customer's Beefree / Cordial / Klaviyo MCP** | Assemble the email + schedule — via *their* connector, not Backstroke. |

## Exact sequence

1. **Get candidate images.** Either the user supplies 1–50 **public** image URLs,
   or they name a Klaviyo campaign → call `read_campaign_content(campaign_id,
   "lean")` (get the id from `list_klaviyo_campaigns` first) and take `images[].src`.
   - **Filter to real hero candidates first.** `images[]` also contains the brand
     logo, social-media icons, and footer graphics. Use each image's `alt` to keep
     the actual product/hero shots and drop logos/icons/footer — otherwise you'll
     rank a Facebook icon as a hero. If unsure which are heroes, show the user the
     `alt` list and let them pick.

2. **Score for their audience.** Call `score_hero_for_my_audience` with
   `image_urls: [...]` (the filtered heroes). Add `include_breakdown: true` for the
   per-panel detail. Note the ranking keys images to **demographic panels**
   (`top_cohort_name`, e.g. "male / 45-60 / east / medium") — these are the model's
   panels, **not** the named Klaviyo segments from `list_cohorts` (that's a different
   "cohort"). A `per_segment` bridge to named segments appears only when the account
   has that data synced; it is often `null`.
   - **`NO_COHORTS`** does **not** mean "no audiences." It means this account's
     subscribers aren't synced into the demographic panels the audience scorer needs
     (a data/sync state) — an account can have Klaviyo segments *and* still return
     NO_COHORTS. Fall back to `score_hero_generic` (global panel), tell the user the
     ranking isn't audience-tailored, or point them at `image-face-off`.

3. **Handle the async path.** If `status` is `"pending"`, poll
   `get_hero_scores(run_id)` until `"completed"` (or `"failed"` → report + stop).

4. **Present the ranked board + confirm the winner.** Show images best-first: the
   winner highlighted, its `score`, and the **demographic panel** it over-indexes
   with (`top_cohort_name`). Confirm which image the user wants to move forward with.

5. **Hand off (to the customer's OTHER MCP).** With the winning `image_url` (and, if
   `per_segment` is populated, the named-segment target), drive the *user's own*
   connectors:
   - **Beefree MCP** → build/assemble the email around the winning image.
   - **Cordial / Klaviyo MCP** → schedule the send. Target a named segment only if
     `per_segment` gave you one; otherwise send broadly (the demographic panel is a
     model descriptor, not a Klaviyo segment you can target).
   These are **write** actions on the user's account → get explicit approval of
   what's being built/sent before calling them, same rule as any write.
   - If the user has **no** other MCP connected, stop at the ranked recommendation
     and tell them the winning `image_url` to use manually.

## Traps
1. **`image_url` is the join key — that's why this composes.** Pass the winning
   URL straight to the other MCP; don't try to translate it into a Backstroke id.
   This portability is the whole reason the hand-off works today.
2. **Two different "cohort"s.** The hero scorer's `top_cohort_*` / `per_cohort` are
   **demographic panels** (e.g. "female / 30-44 / south / medium"), *not* the named
   Klaviyo segments `list_cohorts` returns. Don't cross-reference their ids, and don't
   promise the user a targetable segment from a panel name — only `per_segment` gives
   a real segment, and it's often `null`.
3. **`NO_COHORTS` ≠ "no audiences."** It's a data-sync state (subscribers not mapped
   into panels), independent of whether the account has Klaviyo segments or whether
   `predict_subject_lines_for_my_audience` works. Fall back to `score_hero_generic`
   and say the ranking is global.
4. **Filter `images[]` before scoring** — it includes logo/social/footer graphics;
   score only real heroes (use `alt`).
5. **Pending is normal** on a cold run — poll `get_hero_scores`, don't treat it as
   a failure.
6. **The hand-off writes.** Building/scheduling in Beefree/Cordial/Klaviyo mutates
   the user's account — approve the exact creative/send first.
7. **Public URLs only.** Auth-gated/expiring image URLs won't score; note and skip.

## Example run
> **User:** "I'm on Cordial. Which of these 4 heroes wins for my audience — then
> build it in Beefree and schedule it."

1. Take the 4 image URLs (already just heroes here — no campaign to filter).
2. `score_hero_for_my_audience({ image_urls:[4], include_breakdown:true })` →
   `status:"completed"`; #3 wins (0.86), over-indexes with the panel
   "female / 30-44 / south / medium". `per_segment` is null → no named segment to target.
3. Show the board → user confirms #3.
4. **[Beefree MCP]** assemble the email with image #3 → user approves the draft.
5. **[Cordial MCP]** schedule the send (broadly — no targetable segment came back) →
   user approves → sent.

## Hand-offs
- Zero-setup / global ranking instead of audience-tailored → `image-face-off`.
- Subject lines for the same campaign → `subject-line-ab-optimizer`.
- Not connected / 401 → run `setup` first.

See `reference/tool-ergonomics.md` for exact signatures, the async contract, and
the composability notes.
