---
name: subject-line-ab-optimizer
description: >-
  Use when a marketer wants stronger, audience-tailored subject lines for an
  existing Klaviyo campaign and wants them set up as A/B variants. Reads a
  parent Klaviyo campaign, generates per-cohort subject+preheader ideas with
  Backstroke's predictive model, gets explicit human approval, then clones the
  parent into per-cohort variant campaigns in Klaviyo. Requires the Backstroke
  MCP connected to a Klaviyo-backed account.
allowed-tools:
  - list_klaviyo_campaigns
  - read_campaign_content
  - list_cohorts
  - predict_subject_lines_for_my_audience
  - push_subject_lines_to_klaviyo
---

# Playbook: subject-line A/B optimizer

Turn "my Friday campaign's subject line is weak" into a set of **per-cohort
subject-line variants, drafted in Klaviyo, ready to send** — in one run.

This skill orchestrates Backstroke's predictive tools end-to-end. Backstroke
tells you which subject line will win for each audience; Klaviyo is where the
variants land. **This skill writes to the user's Klaviyo account** at the final
step, so it is built around one hard rule: *nothing is pushed to Klaviyo until
the user has reviewed and approved the exact lines.*

## When to use this
- "Give me better subject lines for my [campaign] and set up an A/B test."
- "Write subject lines tailored to my top audiences for this campaign."
- The user names an existing Klaviyo campaign and wants variants created.

**When NOT to use this**
- The user just wants subject-line *ideas* to eyeball, no write → call
  `predict_subject_lines` directly, skip this skill.
- The email isn't in Klaviyo yet (draft copy in the chat) → run
  `predict_subject_lines` / `predict_subject_lines_for_my_audience` on the pasted
  content; there's nothing to clone.
- The user wants to **edit one campaign's subject in place** (not create A/B variants)
  → that's `push_subject_lines_to_klaviyo`'s **edit-in-place** mode, keyed on
  `klaviyo_campaign_id`. Still generate + get approval first, but skip the per-cohort
  clone flow below (Trap 3).

## The tools this skill chains (all Backstroke MCP)

| Step | Tool | Read/Write | Purpose |
|------|------|-----------|---------|
| 1 | `list_klaviyo_campaigns` | read | Find the parent campaign, get its Backstroke `id`. |
| 2 | `read_campaign_content` | read | Pull the parent's subject, body text, images. |
| 3 | `list_cohorts` | read | Get the account's audiences; find which are push-targetable. |
| 4 | `predict_subject_lines_for_my_audience` | read | Per-cohort ranked subject+preheader ideas. |
| 5 | *(human approval — no tool)* | — | User picks the exact line per cohort. **Mandatory.** |
| 6 | `push_subject_lines_to_klaviyo` | **write** | Clone parent → one variant campaign per cohort. |

## Exact sequence

1. **Find the parent campaign.** Call `list_klaviyo_campaigns` (most-recent-first,
   25 by default; raise `limit` only if the target is older). Show the user the
   names/statuses and let them pick. Keep the campaign's `id` — needed for steps 2
   and 6. **Never ask the user to type a raw id.**

2. **Read the campaign.** Call `read_campaign_content(campaign_id, format:"lean")`.
   `lean` returns subject, preview, `images[].src`, links, and body text — enough
   to generate from. Use `format:"raw"` only if you truly need exact template
   markup (100–300 KB). Use the returned body text as `email_text` (or
   `email_html`) for step 4.

3. **List the audiences.** Call `list_cohorts`. Show the user the cohort names and
   descriptions and ask which audience(s) to tailor for. **Filter for push:** only
   cohorts with `targetable: true` can be pushed back to Klaviyo in step 6. If the
   user picks a non-targetable cohort, you can still generate ideas, but warn it
   can't be pushed — offer to just show those lines.

4. **Generate per cohort.** For each chosen cohort, call
   `predict_subject_lines_for_my_audience` with:
   - `segment_id`: the cohort id from step 3 (not a name the user typed),
   - exactly one of `email_text` / `email_html` / `rendered_image_url` from step 2,
   - optional `controls.count` (default 5) and `controls.tone`,
   - optional `brand_context` if the user gave brand-voice notes.
   Collect the ranked ideas (subject + preheader) per cohort.

5. **Show, then get explicit approval — the gate.** Present the ideas grouped by
   cohort, best-first. Ask the user to confirm **one subject + preheader per
   cohort**. Do not proceed on a vague "looks good" — get a specific selection per
   cohort. This is a write to their Klaviyo account.

6. **Push (write).** Call `push_subject_lines_to_klaviyo` once, with:
   - `campaign_id`: the parent `id` from step 1,
   - `selections`: an array of `{ segment_id, subject, preheader }`, one per
     approved cohort.
   Report what was created: **these are new per-cohort variant draft campaigns
   cloned from the parent — the parent itself is untouched.** Tell the user to
   review/schedule them in Klaviyo.

## Traps (read before running)

1. **Two different "campaign id"s — use the right one.** The read tools return
   **both**: `id` (Backstroke's internal id) and `klaviyo_campaign_id` (the real
   Klaviyo ULID, alongside `klaviyo_message_id`).
   - `push_subject_lines_to_klaviyo` **clone mode** takes the *Backstroke* `id` as
     `campaign_id`; **edit-in-place mode** takes `klaviyo_campaign_id`.
   - Because the Klaviyo id is exposed, you **can** hand a campaign to a
     *separately-connected* Klaviyo MCP mid-flow — give it `klaviyo_campaign_id`,
     never the Backstroke `id`. Mixing them up is the easy mistake here.

2. **Only `targetable: true` cohorts are pushable.** A cohort without a mapped
   Klaviyo segment fails at push. Filter in step 3, not at step 6.
   (`list_cohorts` also returns `klaviyo_segment_id` — hand *that* to an external
   Klaviyo MCP to target a send.)

3. **Push has two modes — pick deliberately.** **Clone** creates *new* per-cohort
   variant campaigns and leaves the parent untouched (what this recipe uses).
   **Edit-in-place** overwrites an existing campaign's subject/preheader, keyed on
   `klaviyo_campaign_id`. If the user says "just update my campaign's subject," that's
   edit-in-place — confirm which they mean before writing.

4. **Never write without approval.** Step 5 is not optional. If the user says
   "just do it," still echo the exact lines you're about to push and get a yes.

5. **One content field only.** The predict tools take exactly one of
   `email_text` / `email_html` / `rendered_image_url`. Don't send two.

6. **Push isn't idempotent — never blind-retry.** If
   `push_subject_lines_to_klaviyo` times out or errors, the variant campaigns may
   **already** have been created. Don't just call it again — a blind retry
   duplicates campaigns in the user's Klaviyo. Check Klaviyo (or re-run
   `list_klaviyo_campaigns`) first, then push only what's missing. This is the one
   step in this recipe that can't be undone.

## Example run

> **User:** "Pull up my Father's Day campaign and give my top 2 audiences
> stronger subject lines — set them up as variants."

1. `list_klaviyo_campaigns` → user confirms "Father's Day Sale" (Backstroke id `#327`).
2. `read_campaign_content(#327, lean)` → body text + hero images.
3. `list_cohorts` → user picks "Lapsed buyers" and "VIP repeat" (both `targetable:true`).
4. `predict_subject_lines_for_my_audience` ×2 → 5 ranked ideas each.
5. Show grouped ideas → user picks one subject+preheader per cohort. **Approved.**
6. `push_subject_lines_to_klaviyo(#327, [ {lapsed…}, {vip…} ])` → 2 variant drafts
   created. "Both are drafts cloned from Father's Day Sale — review and schedule
   them in Klaviyo."

## Hand-offs
- Rank the campaign's **hero images** (not subject lines) → `hero-winner-picker`:
  pass `read_campaign_content`'s `images[].src` (filtered to real heroes) to the scorer.
- Route the winning lines through the customer's **own** Klaviyo MCP instead of
  Backstroke's push → supported: hand their connector the `klaviyo_campaign_id`
  (and `klaviyo_segment_id` to target a segment), not the Backstroke `id`.
- Not connected / 401 → run `setup` first.

See `reference/tool-ergonomics.md` for exact signatures and output shapes.
