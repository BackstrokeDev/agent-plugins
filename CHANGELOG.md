# What's new

Marketer-facing changelog. Each entry pairs a capability with **what it does for
you** — not a dev diff. The `update` skill surfaces new entries after you update,
so every release is a chance to discover what you can now do (a new capability is
invisible until someone names it).

## Unreleased — on the way
- **Predictive hero A/B test** — prove it: A/B test the per-cohort predictive hero
  (each cohort sees its own winning hero) against a static control, in Klaviyo. Waiting
  on the cohort-id dynamic-string generator being exposed as an MCP tool.
- **Predictive heroes** — *generate* the hero image(s) most likely to win for a
  campaign, instead of only ranking the ones you already have. A whole new move:
  "make me a winning hero for this campaign." Recipe lands when its tool ships.

## 0.4.0
- **Make a campaign from one prompt** — describe the email, the products and the
  audience; Backstroke writes the brief, builds the email, offers subject lines,
  pushes it to Klaviyo and schedules the send. You see a preview of every step and
  say yes before anything is written; scheduling needs a yes to the exact send time
  and audiences. Run the new `create-campaign` recipe.
- **One subject-line tool** — `generate_subject_lines` writes ideas for a Backstroke
  campaign or for any email you paste, in your saved brand voice.
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
