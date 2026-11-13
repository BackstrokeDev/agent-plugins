# What's new

Marketer-facing changelog. Each entry pairs a capability with **what it does for
you** — not a dev diff. The `update` skill surfaces new entries after you update,
so every release is a chance to discover what you can now do (a new capability is
invisible until someone names it).

## Unreleased — on the way
- **Predictive hero A/B test** — prove it: A/B test the per-cohort predictive hero
  (each cohort sees its own winning hero) against a static control, in Klaviyo. Waiting
  on the cohort-id dynamic-string generator being exposed as an MCP tool.

## 0.4.0
- **Make a campaign from one prompt** — describe the email, the products and the
  audience. Backstroke picks products from your catalog, writes the brief and the hero
  copy, builds the email, and makes Backstroke hero options and Backstroke predictive
  subject lines without stopping to ask (on a brand with predictive heroes, each cohort
  gets the hero it is predicted to click). It asks you only for the audience, the hero
  link and your own hero image, in one message, and ends with one recap you can change.
  The push to Klaviyo and the schedule each wait for your yes to a preview; scheduling
  needs a yes to the exact send time and audiences. Run the new `create-campaign` recipe.
- **One subject-line tool** — `generate_subject_lines` writes ideas for a Backstroke
  campaign or for any email you paste, in your saved brand voice.
- **You choose where the hero links** — you are asked which page the hero image
  opens when clicked. Backstroke never guesses it.
- **Find a campaign by its name** — ask for a campaign's status by its name; no id
  needed.
- **Clear names for your groups** — the subject-line recipe calls your Backstroke
  groups **Clusters**, as the app does, and says they are not Klaviyo audiences. To
  pick an audience, Backstroke shows your Klaviyo list and segment names.
- **Set up on a claude.ai Team plan** — the `setup` steps now show how an Owner adds
  the connector and how each member connects to it.
- Reconnect once to approve two new permissions: making campaigns, and scheduling
  them to send.

## 0.3.0
- **See the push before it happens** — the subject-line push shows you exactly
  what it will write to Klaviyo, including that your original campaign is unscheduled
  once every variant lands, and writes only after you say yes. A retry after a timeout
  is safe: it never creates the variants twice.

## 0.2.0
- **Hero winners, not a leaderboard** — the hero skills now name the images that win
  for your audience (most cohorts won first), how much of your audience each one wins
  (or how many cohorts, when audience sizes aren't available), and the **best overall**
  image: the one to send if everyone gets the same hero. Images that won nothing are
  not ranked against each other; you hear whether any audience prefers another image.
- **Upload your own image files** — have images on your machine instead of links? The
  hero skills now get you an upload link and score them. No hosting step.
- **Changed:** no per-cohort table and no named-segment pick come back any more, and
  animated GIFs are declined. Send the best overall image broadly, or use your own
  segment.

## 0.1.0
- **Subject-line A/B optimizer** — stronger, per-audience subject lines for a Klaviyo
  campaign, set up as A/B variants. You approve every line before anything is written.
- **Hero winner picker** — find the hero image that wins for *your* audience, then
  hand it to your email builder / sender to run with.
- **Image face-off** — drop in a few images, get them ranked strongest-first, with the
  audience each one lands with. Zero setup.
- Plus **setup** (connect Backstroke in one step) and **update** (stay current, and
  see what's new).
