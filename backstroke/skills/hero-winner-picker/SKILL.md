---
name: hero-winner-picker
description: >-
  Use when a marketer has several candidate hero images and wants the winner FOR
  THEIR audience — then, optionally, to build the email around it (Beefree MCP)
  and schedule the send (Cordial / Klaviyo MCP). Scores images against the
  account's own cohorts, names the winners and the best overall image, and hands
  the chosen image_url off to whatever other MCP the user has connected.
  ESP-agnostic — keys on image_url.
allowed-tools:
  - read_campaign_content
  - list_klaviyo_campaigns
  - request_image_upload
  - score_hero_for_my_audience
  - score_hero_generic
  - get_hero_scores
---

# Playbook: hero-winner picker (predict → hand off)

Answer "which hero wins **for my audience**?" — then feed the chosen image into the
rest of the job: build the email in Beefree, schedule the send in Cordial or
Klaviyo. Backstroke picks; the customer's own connectors act.

This is the **coexistence** recipe: Backstroke has zero Beefree/Cordial/Klaviyo
*send* tools, yet it composes with them cleanly because the whole hand-off keys
on a **portable `image_url`** — not a hidden internal id. Works today.

## When to use this
- "Which of these hero images should I use for my audience?"
- "Pick the best hero for my list, then build the email and schedule it."
- The images are in a Klaviyo campaign the user names (pull them first).
- The images are files on the user's machine or in the chat, not links (upload them first).

**When NOT to use this**
- No audience / just a quick general read → `image-face-off` (global demographic
  cohorts, zero setup).
- The user wants **subject lines** for a Klaviyo campaign, not hero images →
  `subject-line-ab-optimizer`.

## The tools this skill chains

| Step | Tool | Owner | Purpose |
|------|------|-------|---------|
| 1 | `read_campaign_content` *(optional)* | Backstroke | Pull `images[].src` from a named Klaviyo campaign. |
| 1 | `request_image_upload` *(optional)* | Backstroke | Get an upload link when the images are files, not links. |
| 2 | `score_hero_for_my_audience` | Backstroke | Score images against the account's audience (as demographic cohorts). |
| 2a | `get_hero_scores` | Backstroke | Poll if step 2 returns `status:"pending"`. |
| 3 | *(present winners + best overall; user picks)* | — | Confirm the image to move forward with. |
| 4 | build/send tools | **the customer's Beefree / Cordial / Klaviyo MCP** | Assemble the email + schedule — via *their* connector, not Backstroke. |

## Exact sequence

1. **Get candidate images.** Either the user supplies 1–50 **public** image URLs,
   or they have image **files** (not links) → call `request_image_upload` (no
   input), upload each file with the `curl_command` it returns (one curl per file,
   one at a time, in the order the user added them) — or, if you can't run code,
   give the user the `upload_url` and wait for them to say they're done — then pass
   its `upload_id` to the scorer. (`image_urls` and `upload_id` can be combined, 50
   images in all; the link closes soon after it's made.)
   Or they name a Klaviyo campaign → call `read_campaign_content(campaign_id,
   "lean")` (get the id from `list_klaviyo_campaigns` first) and take `images[].src`.
   - **Filter to real hero candidates first.** `images[]` also contains the brand
     logo, social-media icons, and footer graphics. Use each image's `alt` to keep
     the actual product/hero shots and drop logos/icons/footer — otherwise you'll
     rank a Facebook icon as a hero. If unsure which are heroes, show the user the
     `alt` list and let them pick.

2. **Score for their audience.** Call `score_hero_for_my_audience` with
   `image_urls: [...]` (the filtered heroes) and/or `upload_id`. The scorer assigns
   each cohort one winning image, so the result is a set of **winners**, not a
   leaderboard. A winner's `top_cohort` (e.g. "male / 45-60 / east / medium") names a
   **demographic cohort** — not a Klaviyo list or segment, and not a Cluster. No
   named-segment pick comes back; don't promise one.
   - **`NO_COHORTS`** does **not** mean "no audiences." It means this account's
     subscribers aren't synced into the demographic cohorts the audience scorer needs
     (a data/sync state) — an account can have Klaviyo segments *and* still return
     NO_COHORTS. Fall back to `score_hero_generic` (global demographic cohorts), tell the user the
     result isn't audience-tailored, or point them at `image-face-off`.

3. **Handle the async path.** If `status` is `"pending"`, poll
   `get_hero_scores(run_id)` until `"completed"` (or `"failed"` → report + stop).

4. **Present the winners + best overall; confirm the pick.** Every submitted image
   has a result in `images[]` — report each `refused` one with its `message`
   (retry once only if `retryable` is true; animated GIFs are refused with
   `animated_not_ranked`).
   - **Name each image the way the user knows it.** For uploaded files, `input_url`
     and `behind` are stored CDN URLs, not file names. From curl, match each URL to
     the `image_url` in that file's curl result and use its `name`. From the browser
     link, the slot is the number before the extension in the URL (`…/2.png` is slot
     2), never a number in the user's own file name. Slots count only the files the
     page added, from 0 in the order they were added; a refused file takes no slot,
     so the files after it shift. If any file failed, say "the 2nd image that
     uploaded" or ask the user which is which.
   - **Winners** — `winners[]` is already ordered, most cohorts won first. For each:
     `win_count` of `cohort_count` cohorts, its `share`, and `top_cohort` (the one
     cohort it wins by the most; may be null). Say what `share` is from `share_basis`:
     `"audience"` → the % of subscribers in the cohorts it wins; `"cohorts"` → just
     the fraction of cohorts it wins (no subscriber counts were available). `share` can
     be null — then leave it out.
   - **Best overall** — `best` is the winner with the highest average score across
     all cohorts: the pick if they send **one** image to everyone. It can differ from
     the first winner; say so when it does. `best` can be null.
   - **Images that won nothing** have **no order** — never rank them. For each scored
     image that isn't a winner (match on `image_url`: one picture sent under two links
     is still one winner): if `close`, say "its best demographic cohort prefers *(the
     `behind` image)*"; otherwise, or with no `behind`, "no demographic cohort picked this image
     over the others". Never quote `behind_pct` as a number.
   Recommend `best` for a send to everyone (e.g. "#3 wins the most cohorts, but #1 is
   the best single image for everyone"), then confirm which image the user wants.

5. **Hand off (to the customer's OTHER MCP).** With the chosen `image_url`
   (`winners[].image_url` or `best.image_url`), drive the *user's own* connectors:
   - **Beefree MCP** → build/assemble the email around the chosen image.
   - **Cordial / Klaviyo MCP** → schedule the send. Send broadly: the scorer returns
     no named segment to target (the demographic cohort is a model descriptor, not a
     Klaviyo list or segment). Send `best` unless the user picked another image.
   These are **write** actions on the user's account → get explicit approval of
   what's being built/sent before calling them, same rule as any write.
   - If the user has **no** other MCP connected, stop at the recommendation and
     tell them the chosen `image_url` to use manually.

## Traps
1. **`image_url` is the join key — that's why this composes.** Pass the winning
   URL straight to the other MCP; don't try to translate it into a Backstroke id.
   This portability is the whole reason the hand-off works today.
2. **Demographic cohorts are not audiences.** The hero scorer's `top_cohort` is a
   **demographic cohort** (e.g. "female / 30-44 / south / medium"), not a Klaviyo list
   or segment and not a Cluster. Don't cross-reference them, and don't promise
   the user a targetable segment — the hero tools return no named-segment pick.
3. **`NO_COHORTS` ≠ "no audiences."** It's a data-sync state (subscribers not mapped
   into demographic cohorts), independent of whether the account has Klaviyo segments or whether
   per-Cluster subject lines work. Fall back to `score_hero_generic` and say the
   result is global.
4. **Filter `images[]` before scoring** — it includes logo/social/footer graphics;
   score only real heroes (use `alt`).
5. **Pending is normal** on a cold run — poll `get_hero_scores`, don't treat it as
   a failure.
6. **The hand-off writes.** Building/scheduling in Beefree/Cordial/Klaviyo mutates
   the user's account — approve the exact creative/send first.
7. **Public URLs only.** Auth-gated/expiring image URLs come back `refused`; tell the
   user which, and score the rest. For files, use `request_image_upload` instead.
8. **Don't invent an order.** Only winners are ordered. Images that won nothing are
   unranked; `best` is a separate pick, not "#1".
9. **No per-cohort table.** The scorer doesn't return per-cohort scores. If asked
   for a full breakdown, say it isn't available.

## Example run
> **User:** "I'm on Cordial. Which of these 4 heroes wins for my audience — then
> build it in Beefree and schedule it."

1. Take the 4 image URLs (already just heroes here — no campaign to filter).
2. `score_hero_for_my_audience({ image_urls:[4] })` → `status:"completed"`,
   `cohort_count: 5`, `share_basis:"audience"`. Winners: #3 wins 3 cohorts (62% of
   subscribers, strongest in "female / 30-44 / south / medium"); #1 wins 2 (38%).
   `best` is #1. #2 and #4 won nothing: #2 is `close`, so "its best demographic cohort prefers
   #3"; for #4, "no demographic cohort picked it over the others".
3. Show the winners + best overall: "#3 wins the most cohorts, but #1 is the best
   single image for everyone" → user confirms #1.
4. **[Beefree MCP]** assemble the email with image #1 → user approves the draft.
5. **[Cordial MCP]** schedule the send (broadly — no segment pick comes back) →
   user approves → sent.

## Hand-offs
- Zero-setup / global read instead of audience-tailored → `image-face-off`.
- Subject lines for the same campaign → `subject-line-ab-optimizer`.
- Not connected / 401 → run `setup` first.

See `reference/tool-ergonomics.md` for exact signatures, the async contract, and
the composability notes.
