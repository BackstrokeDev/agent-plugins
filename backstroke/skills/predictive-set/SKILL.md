---
name: predictive-set
description: >-
  Use when a marketer asks for a predictive set, a Creative Loop, or finished heroes
  with their headline on them, scored for every cohort against their control.
  Makes a draft, has Backstroke make the set, lets the person pick heroes by number,
  adds the set on a yes and builds the email; or comes back to see their heroes
  ("show my heroes"). Not for a plain "make me an email" prompt: that is
  create-campaign.
hosts: [all]
allowed-tools:
  - get_brand_config
  - find_products
  - list_audiences
  - create_campaign
  - start_predictive_set
  - add_set_to_campaign
  - get_campaign_status
---

# Playbook: a predictive set for a campaign

A predictive set is finished heroes, with the campaign's headline on them, each scored
for every cohort against the person's control. Backstroke keeps the ones predicted to
do best and sends each cohort its best hero. Take the person from their ask to a built
email with the set on it. Making a set takes minutes and uses one of the brand's
predictive sets for the day, so it starts only when the person asked for it.

**Words.** Say "predictive set", "cohort" and "control group". Never say "Creative
Loop", "loop", "run" (as a noun) or "holdout" to the person. Show each hero's
`set_label` exactly as given ("Predicted winner" or "Backstroke's pick"). Explain one
only when asked, and only in these words: a Predicted winner is a hero Backstroke
predicts does better than the control across the whole list; a Backstroke's pick is
the hero Backstroke picked for the cohorts it goes to (make no other claim). Never say a pick beats the control, never state
a lift, and give a number only when a tool returned it.

**You cannot see the images.** Name heroes only by their number and labels. Never
describe one, and never guess which hero the person means by a description.

## How every write works
`create_campaign` and `add_set_to_campaign` are each **one tool called twice**: first
without `fingerprint` (a preview that writes nothing and returns a `fingerprint`), then
with the same arguments plus that `fingerprint`. `stale_preview` means something
changed: preview again. Every refusal's message says the next step: follow it; do not
guess or retry blindly.

## Goals, in order

1. **Start only on an explicit ask.** Make a set when the person asked for a predictive
   set (or a Creative Loop), or said yes after hearing the time and that it uses 1 of
   today's sets. Never make one for a plain "make me an email" prompt: that goes to
   `create-campaign` with hero options. When they ask for hero images and name neither
   path ("build me some hero images"), ask the one question exactly as the
   `start_predictive_set` description words it, once, and only when that tool is
   available (without it, never mention predictive sets). If you can't see that
   description, ask whether they want hero options or a predictive set, which takes
   several minutes and uses one of today's sets. Their answer is the ask. Hero options
   → hand off to `create-campaign`. If the person has not yet been asked whether they
   have their own hero images, ask that in the same message, not as a second question:
   their own images work with either path (they join the hero options, or one is the
   set's control as `control_image_url`).

2. **Make the draft, without a build.** Call `get_brand_config`. Pick products as
   `create-campaign` does (`find_products`; never out of stock), and write the brief
   and `hero_copy` (headline, subheadline, button text); the person's own copy goes in
   word for word. The set needs a hero link and the draft needs an audience. Use what
   the person named; otherwise ask both in one message: suggest a page ("Link the
   heroes to [the featured product page], or another page?") and an audience from
   `list_audiences` (most used first) to confirm or change. Use them only after a yes.
   Preview `create_campaign` with `build: false`, `hero_copy`, `hero_link_url`,
   `audiences` and the rest, then apply. With an existing draft, pass its
   `campaign_id` and only what changes.

3. **Start the set.** Call `start_predictive_set` with the `campaign_id` (add
   `control_image_url` only when the person gives their own control image). It starts
   at once. Tell the person: the draft's name; the time from `estimate`
   (`low_minutes` to `high_minutes`); that it used 1 of their predictive sets for
   today, and how many are left from `sets_left_today`; that Backstroke emails them
   when the set is ready (the email's button opens the set in Backstroke); and that
   they can stay, or come back to chat and just say "show my heroes". Pass on any
   `warnings`. A refusal costs no set: do what it says.

4. **Check once or twice, then hand back.** Call `get_campaign_status` with the
   `campaign_id` and `wait_seconds` from `next_check`, once or twice. Still making it?
   Hand back: "Say 'show my heroes' when you get the email." When the status says to
   come back later, say so and stop. When the person comes back without the
   `campaign_id`, call `get_campaign_status` with the draft's `name`, or ask which
   campaign.

5. **Show the set by number.** When `predictive_set.status` is `ready`, lead with its
   `verdict_headline` when there is one, then follow the status text's next step. Show
   each hero in `heroes` as a numbered line: its `number`, `set_label`, `label` (its
   style), cohorts and people, and its `url` as a link. When `more_available` is above
   zero, offer them with that number ("3 more can be added to the set. Want to see
   them?"); on a yes, call `get_campaign_status` with `include: 'available'`. Their
   numbers continue the list. The person picks by number ("drop 4 and 6", "add 9"). If
   they describe a hero instead, say you can't see the images and ask for its number.
   "Looks good" means the set exactly as returned; it still goes to step 6's preview
   and needs a yes there. When `added` is true, the set is already the campaign's
   hero: go to step 7, and do not preview the add again.
   **Kept control** (`verdict_kind` is `keep_control`): the control stays the default
   send and the set is optional. Say the status's lines, then offer its two choices in
   its order: keep the control (`create_campaign` with `campaign_id`, the
   `hero_image_url` the status names, `build: true`, `only_given_heroes: true`, then on
   through steps 7 and 8), or add the set (step 6).
   Do not push the set.

6. **Preview the add, then wait for a yes.** Preview `add_set_to_campaign` with the
   `run_id`, `campaign_id` and `hero_ids`: the `hero_id` of each chosen number (at
   most 9). Then say, from the preview: its `verdict_headline`, and its opt-in line when
   there is one; each hero's number and label as it gives them, and how many; any hero
   `left_out` (it would get no cohort); its control line as given (where the control
   goes, or that every cohort gets a hero); the link; that it replaces the draft's own
   hero, when it says so; and the control group line exactly as given. End with "Add the
   set to [campaign]?" Apply with the `fingerprint` only on a yes given after this
   preview. A yes from before the preview, or to the set in step 5, is not that yes:
   show the preview and ask. If the person changes the picks, preview again. To turn
   the control group off, pass `control_group: false` on the build in step 7.

7. **Build.** As the result says, preview and apply `create_campaign` with the
   `campaign_id` and `build: true`. Check `get_campaign_status` as its text says until
   `step` is `built`, then give the `app_url`.

8. **Subject lines and push.** Continue with `create-campaign`'s Backstroke predictive
   subject lines, recap and push steps, then its schedule step. Skip its hero options
   step: the set is this email's heroes. The push and the schedule each need the
   person's yes, as that skill says. For the heroes in the recap, say what the status
   gives. If the first product changes after the set was added, the set shows the old
   product. Do not call `generate_hero_images` (it is refused while a set owns the
   hero). Offer a new draft with a new predictive set, or removing the set in
   Backstroke and then hero options through `create-campaign`.

## When it doesn't go as planned
- **`no_winner`, `emptied`, `expired` or `stopped`, or "I don't like these":** say what
  happened plainly, then offer three ways on: make another predictive set (needs a
  fresh yes; uses one of today's); switch to hero options (hand off to
  `create-campaign`); or keep the control: `create_campaign` with `campaign_id`, the
  `hero_image_url` the status names, `build: true`, `only_given_heroes: true`, then
  steps 7 and 8. For `emptied`, say the
  heroes the status counts can be added back in Backstroke.
- **`loop_pending`** on a build (or a hero-options refusal while a set is being made):
  wait for the set as in step 4. In chat, approving the set is steps 5 and 6
  (`add_set_to_campaign`), and hero options hand off to `create-campaign`. Pass
  `only_given_heroes: true` only when the person chooses to keep the control or build
  with just their own heroes.
- **Daily sets:** never start a predictive set to replace one the person did not ask to
  replace. When today's sets are used up, say so and offer hero options or tomorrow.
- Not connected / 401 → run `setup` (Claude Code) or reconnect Backstroke in your
  app's connector settings.
