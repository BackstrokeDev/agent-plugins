---
name: surge
description: >-
  Use when a marketer has their own hero images and a link, plus a draft Klaviyo
  campaign or an audience, and wants each demographic cohort routed to an image
  through one Klaviyo universal block, scored against a control. Backstroke
  scores the images, builds the block in the Klaviyo library, and the person
  drags it in place of the control. Needs Surge turned on for the account.
allowed-tools:
  - create_surge
  - get_campaign_status
  - list_klaviyo_campaigns
  - list_audiences
  - request_image_upload
---

# Playbook: Surge (one block, each cohort its best hero)

Take the person's hero images and route each demographic cohort to the image
Backstroke scores highest for it, through one Klaviyo universal block. The block is
scored against a **control** (the image that would go out without Surge). Surge
writes a block to the Klaviyo library; it never sends anything.

## When to use this
- "Here are 4 heroes. Make each cohort get its best one in Klaviyo."
- The person has a control image and wants to see whether the candidates clear the
  bar against it.

**When NOT to use this**
- The person only wants to know which hero scores highest, with no block → `hero-winner-picker`
  (their audience) or `image-face-off` (zero setup).
- The person wants a whole campaign made from a prompt → `create-campaign`.
- The campaign was made in Backstroke → `create-campaign` (its hero gate).
  `create_surge` refuses it. The deciding question is whether the email is already
  built in Klaviyo.

## How the write works
`create_surge` is **one tool called twice**:

1. Call it **without** `fingerprint`. This is the preview: it writes nothing.
2. Call it again with the **same arguments** plus the preview's `fingerprint`, only
   after the person says yes. This applies exactly what the preview showed.

## Steps

1. **Gather what is missing.** Ask only for what you do not have, in one message:
   - The images, at least 2 and up to 10, unless a draft campaign or a named control
     gives the control: public URLs in `hero_image_urls`, or image files through
     `request_image_upload`. Upload as its text says, then pass its `upload_id` in
     `upload_ids`. Do not score the files to get their URLs. The uploaded images come
     first, in upload order. With no `control_image_url` and no draft campaign, the
     first image is the control. With a draft campaign, the control is the campaign
     email's current hero (the default). A control the person names takes priority over it. A
     draft campaign gives the audience and the control, never the candidates.
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
   - the **block name**: show `diff.block_name` as it is. Only when
     `diff.block_numbered` is true, say that Backstroke adds the run number. With a
     Klaviyo campaign there is one block per campaign, updated on each run;
   - **how many cohorts** will be scored.
   If the audience is a large Klaviyo list, say up front that the first load takes
   about 15 minutes.

3. **Apply on an explicit yes.** Call `create_surge` again with the same arguments and
   the `fingerprint`. Do not apply on a maybe, a question, or silence. If the person
   changes anything, preview again. Name each image in `left_out` (it failed to load)
   after the apply.

4. **Poll.** Call `get_campaign_status` with the `surge_run_id` from the apply (the
   `next_check` gives the arguments). While it runs, tell the person the phase:
   `audience` (Klaviyo is loading the list; the first load of a large list takes about
   15 minutes),
   `images` (reading the images), or `scoring`. Say it again only when the phase
   changes.

   In a host that shows apps, the `create_surge` result opens the Backstroke view, and
   the view follows the run by itself. Do not call `open_app` after `create_surge`:
   it opens a second view. Call `open_app` with `surge_run_id` only when the person
   asks to see the view again.

5. **Report the outcome in plain words.**
   - `routed`: the block is in the Klaviyo library. Give its name and its Klaviyo
     link, and tell the person to drag it in place of the control (the current hero). If
     they leave the old hero in, the email has two heroes. Say "B goes to 3 cohorts",
     with a count per image. Do not list cohort names. Everyone else gets the block's
     default image. Cohort tags sync to Klaviyo later.
   - `no_winner`: lead with what they got: "None of these images cleared the bar
     against your control, so keep the control." No block was made. Offer to try other
     images.
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
- `CAPABILITY_NOT_ENABLED`, or `create_surge` is not in your tool list: Surge is not
  showing on this connection. If Backstroke turned it on for you, reconnect Backstroke
  (or restart) and try again. If not, ask Backstroke to turn it on. Offer
  `hero-winner-picker` to do today.
- `invalid_request`: a missing link means ask the person for the link; missing
  audiences means ask which audiences.
- A message that says a campaign brings its own audience (arrives as `invalid_request`):
  drop the audiences.
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
