---
name: surge
description: >-
  Use when a marketer has their own hero images (or a draft Klaviyo campaign)
  and wants each demographic cohort to get its best image through one Klaviyo
  universal block, scored against a control. Backstroke scores the images,
  builds the block in the Klaviyo library, and the person drags it into the
  email. Needs Surge turned on for the account.
allowed-tools:
  - create_surge
  - get_campaign_status
  - list_klaviyo_campaigns
  - list_audiences
  - request_image_upload
---

# Playbook: Surge (one block, each cohort its best hero)

Take the person's hero images and give each demographic cohort the one it is
predicted to click, through one Klaviyo universal block. The block is scored
against a **control** (the image that would go out without Surge). Surge writes a
block to the Klaviyo library; it never sends anything.

## When to use this
- "Here are 4 heroes. Make each cohort get its best one in Klaviyo."
- "Use the heroes in my draft campaign and route them per cohort."
- The person has a control image and wants to see whether the candidates beat it.

**When NOT to use this**
- The person only wants to know which hero wins, with no block → `hero-winner-picker`
  (their audience) or `image-face-off` (zero setup).
- The person wants a whole campaign made from a prompt → `create-campaign`.

## How the write works
`create_surge` is **one tool called twice**:

1. Call it **without** `fingerprint`. This is the preview: it writes nothing.
2. Call it again with the **same arguments** plus the preview's `fingerprint`, only
   after the person says yes. This applies exactly what the preview showed.

## Steps

1. **Gather what is missing.** Ask only for what you do not have, in one message:
   - `hero_image_urls`: 1-10 public image URLs. For image files, call
     `request_image_upload` and upload as its text says, then use the image URLs it
     returns. With a draft campaign and no `control_image_url`, the control is the
     campaign email's current hero.
   - `link_url`: the page the hero links to. Required. Suggest a page; use it only
     after the person says yes.
   - **A draft Klaviyo campaign or audiences, not both.** For a campaign, find its id
     with `list_klaviyo_campaigns` and pass `klaviyo_campaign_id`; the campaign brings
     its own audience, so pass no `audiences`. With no campaign, call `list_audiences`
     and let the person pick `audiences` (and `exclude_audiences`) by name or id.
   - Optional: `control_image_url` (the image to beat) and `name`.

2. **Preview.** Call `create_surge` without `fingerprint`. Show the person, in plain
   words:
   - the **control** and where it came from (`control_source`): `email` is the
     campaign email's current hero, `named` is the `control_image_url` they gave,
     `first_image` is the first image they gave;
   - the **candidates**;
   - the **audience**;
   - the **block name** (the stem, "Surge: <campaign name>" or "Surge: MCP block";
     Backstroke adds a run number);
   - **how many cohorts** will be scored.
   Name each image that failed to load and was left out.

3. **Apply on an explicit yes.** Call `create_surge` again with the same arguments and
   the `fingerprint`. Do not apply on a maybe, a question, or silence. If the person
   changes anything, preview again.

4. **Poll.** Call `get_campaign_status` with the `surge_run_id` from the apply (the
   `next_check` gives the arguments). While it runs, tell the person the phase:
   `audience` (Klaviyo is loading the list; a large list takes up to about 15 minutes),
   `images` (reading the images), or `scoring`. Say it again only when the phase
   changes. Offer `open_app` with `surge_run_id` if the person wants to see the run.

5. **Report the outcome in plain words.**
   - `routed`: the block is in the Klaviyo library. Give its name and tell the person
     to drag it into the email. Each cohort gets its winning image; everyone else gets
     the block's default image. Cohort tags sync to Klaviyo later.
   - `no_winner`: the control stays best. No block was made.
   - `control_unscored`: the control could not be scored, so there is nothing to
     compare against. Say so and offer a different control.
   - `empty_audience`: nobody in the audience is in a scored cohort. No block was made. Offer another audience.
   - `push_failed`: the block is saved in Backstroke but the Klaviyo push failed. Say
     so; do not call it done.
   - `cancelled`: the run was cancelled.
   - `failed`: give the reason. If `retryable` is true (for example
     `audience_unavailable` or an audience timeout), say to try again later.

## Refusals
Every refusal says its next step. Follow it. Handle these in plain words:
- `CAPABILITY_NOT_ENABLED`, or `create_surge` is not in your tool list: Surge is not on for this account yet. Say so and stop.
- `invalid_request`: a missing link means ask the person for the link; missing
  audiences means ask which audiences.
- `audiences_with_campaign`: a campaign brings its own audience. Drop the audiences.
- `unknown_audience` / `ambiguous_audience`: ask which one they mean.
- `campaign_not_draft`: the campaign is sent or archived. Ask for a draft campaign.
- `no_images`: no image could be used. Ask for other images.
- `cohorts_not_ready`: the account's cohorts are not ready yet. Say so.
- `klaviyo_unavailable`: try again later.
- `klaviyo_disconnected`: ask the person to reconnect Klaviyo.
- `not_found`: the campaign or run is not found. Check the id.

## The one rule
`create_surge` writes a block to the person's Klaviyo account. Apply **only after the
person says yes** to the preview. Preview freely; never write silently.

## Hand-offs
- Not connected / 401 → run `setup` first.
