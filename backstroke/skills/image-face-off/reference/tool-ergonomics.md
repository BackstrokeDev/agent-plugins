# Tool ergonomics — Image Face-off

Exact signatures and the async contract for the Backstroke MCP tools this
skill uses. Inlined so the skill runs without guessing.

## `score_hero_generic`
- **Input:** `{ image_urls?: string[1–50] (public URLs), upload_id?: string }` — give
  `image_urls`, `upload_id`, or both (50 images in all).
- **Scores against the GLOBAL demographic panel** — does NOT use the account's
  cohorts. (For the account's own audience, use `score_hero_for_my_audience`.)
- **Output (completed):**
  ```
  { status: "completed",
    cohort_count: 5,
    share_basis: "audience" | "cohorts",
    winners: [ { input_url, image_url, win_count, share|null, top_cohort|null } ],
    best: { input_url, image_url } | null,
    images: [ { input_url, image_url, status: "scored"|"refused", code, message,
                retryable, behind?, behind_pct?, close? } ] }
  ```
- **`winners[]`** is ordered: most cohorts won first, then total winning score. Don't
  re-sort it. `top_cohort` is a demographic panel — e.g. "male / 45-60 / east /
  medium" — the one cohort that image wins by the most (may be null). It is a model
  descriptor, not a Klaviyo segment.
- **`share`** follows `share_basis`: `"audience"` = the part of the audience in the
  cohorts it wins; `"cohorts"` = `win_count / cohort_count`. Null → omit it.
- **`best`** = highest average score across all cohorts; the pick if you send one
  image to everyone. Can differ from the first winner; can be null.
- **`images[]`** — one entry per submitted image. `refused` entries carry `code` +
  `message` (tell the user; retry once only if `retryable`). Animated GIFs are
  refused (`animated_not_ranked`). A `scored` image that won nothing has `behind`
  (the `input_url` that beat it), `behind_pct`, `close`. **Images that won nothing
  are NOT ordered.** Say "its best audience prefers *behind*" when `close`, else "no
  audience picked this image over the others". Never quote `behind_pct` as a number.
- No per-cohort table is returned.
- **Async:** may return `status:"pending"` + `run_id` on a cold run → poll
  `get_hero_scores`. When it completes synchronously, the result is inline.
- Read-only.

## `get_hero_scores`
- **Input:** `{ run_id }` — the id a hero tool returned when `status` was `"pending"`.
- **Output:** the same winners shape once `status:"completed"`. `status:"failed"`
  returns `error`, `error_type`, `retryable`.
- **Poll** this repeatedly until `completed` or `failed`. Read-only.

## `request_image_upload` (optional)
- **Input:** none. **Output:** `{ upload_id, upload_url, curl_command, max_files,
  max_bytes, expires_at }`. `upload_url` carries a secret — share it only with the user.
- **Flow:** if you can run code, upload each file with `curl_command` (one curl per
  file; tell the user about any file that came back with a message). If a curl fails,
  or you can't run code, give the user `upload_url` and wait until they say they're
  done. Then pass `upload_id` to `score_hero_generic`. The link holds up to
  `max_files` images and closes at `expires_at`. Don't use it for images that
  already have a public link.

## The async contract (applies to all hero tools)
```
score_hero_* → status:"completed"  → use winners / best / images directly
             → status:"pending"    → run_id → get_hero_scores(run_id) → repeat
                                              until "completed" | "failed"
```
Treat `pending` as normal (a COLD run), not an error.

## Cross-skill note
This skill is the zero-setup subset of `hero-winner-picker`. The difference is
the scoring tool: `score_hero_generic` (global panel, here) vs.
`score_hero_for_my_audience` (the account's own audience, there — which can return
`NO_COHORTS` if subscribers aren't synced). Same async contract, same output
shape. Both report demographic **panels**, not Klaviyo segments.
