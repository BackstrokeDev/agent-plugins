---
name: image-face-off
description: >-
  Use when a marketer has a few candidate hero/creative images and just wants a
  fast "which one is stronger?" — zero account setup, no ESP, no write. Scores
  the images against Backstroke's global demographic panel and returns the
  winners (most cohorts won first), the best overall image, and the demographic
  each winner is strongest with. For a result tailored to the user's OWN
  audience, use hero-winner-picker instead.
allowed-tools:
  - score_hero_generic
  - request_image_upload
  - get_hero_scores
---

# Playbook: image face-off (zero-setup)

The fastest way to answer "which of these images wins?" — paste 1–50 image URLs
(or upload image files), get the winners. No account, no cohorts, no send. This is the first-run demo:
value in one tool call.

## When to use this
- "Which of these hero images is strongest?" with a handful of image URLs or files.
- The user has no Backstroke audience set up, or explicitly wants a general read.
- A quick gut-check before committing to a campaign image.

**When NOT to use this**
- The user wants the winner **for their specific audience** → `hero-winner-picker`
  (uses the account's cohorts, and can hand the winner downstream).
- The images live in a Klaviyo campaign the user names → `hero-winner-picker`
  pulls them via `read_campaign_content` first.

## The tools this skill chains (all Backstroke MCP)

| Step | Tool | Purpose |
|------|------|---------|
| 1 | *(collect image URLs)* | From the user, or a page/campaign they point to. |
| 1 | `request_image_upload` *(optional)* | Upload link for image files the user has instead of links. |
| 2 | `score_hero_generic` | Score the images against the global demographic panel. |
| 2a | `get_hero_scores` | Poll if step 2 returns `status:"pending"`. |

## Exact sequence

1. **Collect candidate images.** Gather 1–50 **public** image URLs from the user.
   If they gave a page/asset rather than direct URLs, resolve to direct image
   URLs first. (Max 50; all must be publicly reachable.) If they have image
   **files** instead, call `request_image_upload` (no input), upload each file with
   the returned `curl_command` (one curl per file, one at a time, in the order the
   user added them) — or, if you can't run code, give the user the `upload_url` and
   wait for them to say they're done — then pass the
   `upload_id` in step 2. (`image_urls` and `upload_id` can be combined, 50 in all.)

2. **Score.** Call `score_hero_generic` with `image_urls: [...]` and/or `upload_id`.
   Each cohort in the panel gets one winning image, so you get a set of winners, not
   a leaderboard.

3. **Handle the async path.** If the result's `status` is `"pending"`, it returns
   a `run_id` (a COLD run). Poll `get_hero_scores(run_id)` until `status` is
   `"completed"`. If it comes back `"failed"`, report the failure reason and stop.

4. **Report.** Every submitted image has a result in `images[]` — report each
   `refused` one with its `message` (retry once only if `retryable` is true; animated
   GIFs are refused with `animated_not_ranked`). Then:
   - **Name each image the way the user knows it.** For uploaded files, `input_url`
     and `behind` are stored CDN URLs, not file names. From curl, match each URL to
     the `image_url` in that file's curl result and use its `name`. From the browser
     link, the slot is the number before the extension in the URL (`…/2.png` is slot
     2), never a number in the user's own file name. Slots count only the files the
     page added, from 0 in the order they were added; a refused file takes no slot,
     so the files after it shift. If any file failed, say "the 2nd image that
     uploaded" or ask the user which is which.
   - **Winners** — `winners[]` is already ordered, most cohorts won first. Give each
     one's `win_count` of `cohort_count` cohorts, its `share` (the fraction of
     cohorts it wins: `score_hero_generic` always returns `share_basis: "cohorts"`;
     omit a null `share`) and `top_cohort`, the demographic it wins
     by the most.
   - **Best overall** — `best`: the winner with the highest average score across
     all cohorts, the pick if they send one image to everyone. It can differ from the
     first winner; say so.
   - **Images that won nothing** have no order — never rank them. For each scored
     image that isn't a winner (match on `image_url`: one picture sent under two links
     is still one winner): if `close`, "its best audience prefers *(the `behind`
     image)*"; otherwise, or with no `behind`, "no audience picked this image over the
     others". Never quote `behind_pct` as a number.
   This is a read-only opinion; there's nothing to approve or send.

## Traps
1. **Global panel, not the user's audience.** These scores are against a *generic*
   demographic panel — they answer "which is broadly stronger," not "which wins
   for *my* list." If the user cares about their audience, switch to
   `hero-winner-picker`. Say which one you ran.
2. **URLs must be public.** A signed/expiring or auth-gated image URL will fail to
   score. If one image errors, note it and score the rest.
3. **Pending is normal on a cold run.** Don't treat `status:"pending"` as an
   error — poll `get_hero_scores` until it completes.
4. **Files aren't URLs.** The scorer reads hosted image URLs or an `upload_id`.
   If the user attaches a JPEG/PNG, call `request_image_upload` and score by
   `upload_id` — don't ask them to host it first.
5. **Don't invent an order.** Only winners are ordered; `best` is a separate pick.
   There's no per-cohort table to share — if asked, say it isn't available.

## Example run
> **User:** "Which of these 4 banner images looks strongest?" (4 URLs)

1. Collect the 4 URLs.
2. `score_hero_generic({ image_urls: [4 urls] })` → `status:"completed"`.
3. Report: "#2 wins 4 of 6 cohorts, strongest with **women 25–34**; #4 wins the other 2.
   #2 is also the best overall — the one to send everyone. #1 and #3 won nothing:
   #1's best audience prefers #2; no audience picked #3 over the others." Offer:
   "Want this scored against *your* audience instead? → hero-winner-picker."

## Hand-offs
- Score for the user's **own** audience, or act on the winner downstream →
  `hero-winner-picker`.
- Not connected / 401 → run `setup` first.

See `reference/tool-ergonomics.md` for exact signatures and the async contract.
