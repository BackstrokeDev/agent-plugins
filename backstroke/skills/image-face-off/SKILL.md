---
name: image-face-off
description: >-
  Use when a marketer has a few candidate hero/creative images and just wants a
  fast "which one is stronger?" — zero account setup, no ESP, no write. Scores
  the images against Backstroke's global demographic panel and returns them
  ranked best-first, with the demographic each image over-indexes with. For a
  ranking tailored to the user's OWN audience, use hero-winner-picker instead.
allowed-tools:
  - score_hero_generic
  - get_hero_scores
---

# Playbook: image face-off (zero-setup)

The fastest way to answer "which of these images wins?" — paste 1–50 image URLs,
get them ranked. No account, no cohorts, no send. This is the first-run demo:
value in one tool call.

## When to use this
- "Which of these hero images is strongest?" with a handful of image URLs.
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
| 2 | `score_hero_generic` | Rank the images against the global demographic panel. |
| 2a | `get_hero_scores` | Poll if step 2 returns `status:"pending"`. |

## Exact sequence

1. **Collect candidate images.** Gather 1–50 **public** image URLs from the user.
   If they gave a page/asset rather than direct URLs, resolve to direct image
   URLs first. (Max 50; all must be publicly reachable.)

2. **Score.** Call `score_hero_generic` with `image_urls: [...]`. Add
   `include_breakdown: true` only if the user wants the per-cohort score for each
   image (otherwise just the cross-cohort ranking comes back — leaner).

3. **Handle the async path.** If the result's `status` is `"pending"`, it returns
   a `run_id` (a COLD run). Poll `get_hero_scores(run_id)` until `status` is
   `"completed"`. If it comes back `"failed"`, report the failure reason and stop.

4. **Report.** Present the images **ranked best-first**: the winner called out,
   each image's score, and the **demographic it over-indexes with**. If you asked
   for the breakdown, summarize per-cohort strengths compactly — don't dump every
   number. This is a read-only opinion; there's nothing to approve or send.

## Traps
1. **Global panel, not the user's audience.** These scores are against a *generic*
   demographic panel — they answer "which is broadly stronger," not "which wins
   for *my* list." If the user cares about their audience, switch to
   `hero-winner-picker`. Say which one you ran.
2. **URLs must be public.** A signed/expiring or auth-gated image URL will fail to
   score. If one image errors, note it and score the rest.
3. **Pending is normal on a cold run.** Don't treat `status:"pending"` as an
   error — poll `get_hero_scores` until it completes.
4. **Files aren't URLs.** The scorer takes hosted image *URLs* only — it can't
   accept an uploaded or dragged-in image file. If the user attaches a JPEG/PNG,
   ask them to share the hosted link (or point to where it already lives online).

## Example run
> **User:** "Which of these 4 banner images looks strongest?" (4 URLs)

1. Collect the 4 URLs.
2. `score_hero_generic({ image_urls: [4 urls] })` → `status:"completed"`, ranked.
3. Report: "#2 wins (0.84), over-indexes with **women 25–34**; #4 close behind
   (0.81); #1 and #3 trail." Offer: "Want this scored against *your* audience
   instead? → hero-winner-picker."

## Hand-offs
- Score for the user's **own** audience, or act on the winner downstream →
  `hero-winner-picker`.
- Not connected / 401 → run `setup` first.

See `reference/tool-ergonomics.md` for exact signatures and the async contract.
