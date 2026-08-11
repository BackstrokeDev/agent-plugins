# Tool ergonomics — Image Face-off

Exact signatures and the async contract for the two Backstroke MCP tools this
skill uses. Inlined so the skill runs without guessing.

## `score_hero_generic`
- **Input:** `{ image_urls: string[1–50] (public URLs), include_breakdown?: boolean }`.
- **Scores against the GLOBAL demographic panel** — does NOT use the account's
  cohorts. (For the account's own audience, use `score_hero_for_my_audience`.)
- **Output (observed):**
  ```
  { status: "completed",
    ranked: [ { image_url, score, top_cohort_id, top_cohort_name } ],   // best-first
    per_cohort: [ { image_url, cohort_id, cohort_name, score } ],       // when include_breakdown
    per_segment: null, error: null, error_type: null, retryable: false }
  ```
- **`top_cohort_name` is a demographic panel** — e.g. "male / 45-60 / east / medium"
  (UUID ids). That's the "demographic it over-indexes with." It is a model descriptor,
  not a Klaviyo segment.
- **Async:** may return `status:"pending"` + `run_id` on a cold run → poll
  `get_hero_scores`. When it completes synchronously, the ranked result is inline.
- Read-only.

## `get_hero_scores`
- **Input:** `{ run_id }` — the id a hero tool returned when `status` was `"pending"`.
- **Output:** the same ranked shape once `status:"completed"`. `status:"failed"`
  returns a failure reason.
- **Poll** this repeatedly until `completed` or `failed`. Read-only.

## The async contract (applies to all hero tools)
```
score_hero_* → status:"completed"  → use the ranked result directly
             → status:"pending"    → run_id → get_hero_scores(run_id) → repeat
                                              until "completed" | "failed"
```
Treat `pending` as normal (a COLD run), not an error.

## Cross-skill note
This skill is the zero-setup subset of `hero-winner-picker`. The difference is
the scoring tool: `score_hero_generic` (global panel, here) vs.
`score_hero_for_my_audience` (the account's own audience, there — which can return
`NO_COHORTS` if subscribers aren't synced). Same async contract, same ranked output
shape. Both report demographic **panels**, not Klaviyo segments.
