<div align="center">
<pre>
 -*##################+:
+######################-
#######=:-=::-=*#######+
#########-.###+ +######*
#########-.###* +######*
#######=::.::: -#######*
#########+=###* +######*
#########-.###+ +######*
#######=:--:::-*#######*
#######################+
+#-:================:=#-
 -+******************+:
</pre>
</div>

<p align="center"><strong>Build with Backstroke in your AI coding agent</strong></p>

<p align="center">
Backstroke is the <strong>prediction layer</strong> for email marketing — it tells
you which subject line or hero image will win, per audience. This repo is the
plugin marketplace for the <code>backstroke</code> plugin: the MCP connection plus
a set of skills (recipes) that chain Backstroke's predictions into the ESP you
already use.
</p>

<p align="center"><a href="./GETTING_STARTED.md">Getting started</a></p>

## Why this exists

An MCP on its own is just a bag of tools. The value shows up when it completes a
real marketing job. These skills bundle the *judgment* — which tool, in what
order, with the right guardrails — so the assistant reliably runs a whole job
(score → pick → act) instead of improvising across three vendors' tools.

**Backstroke coexists with your other MCPs — it doesn't proxy them.** You keep
your ESP connectors; Backstroke shows up as one more
connection and feeds its predictions into their workflows.

## Example

```
> Give my top 2 audiences stronger subject lines for the Father's Day campaign,
  and set them up as A/B variants.

⏺ list_klaviyo_campaigns (Backstroke)   → "Father's Day Sale"
⏺ read_campaign_content (Backstroke)    → body + hero images
⏺ list_cohorts (Backstroke)             → Lapsed buyers · VIP repeat  (both targetable)
⏺ predict_subject_lines_for_my_audience → 5 ranked ideas per cohort

  → shows ideas, asks you to approve one per cohort   ← you approve here

⏺ push_subject_lines_to_klaviyo (Backstroke, write)  → 2 variant drafts in Klaviyo

Done — 2 variant campaigns drafted. Review and schedule them in Klaviyo.
```

## Install (Claude Code)

```
/plugin marketplace add BackstrokeDev/agent-plugins
/plugin install backstroke@backstroke-plugins
```

Then run the bundled **`setup`** skill once (connects + authorizes the MCP), and
you're ready. New here? Point your agent at **[`GETTING_STARTED.md`](./GETTING_STARTED.md)**.

## What's in the plugin

| Skill | What it does |
|---|---|
| `setup` | Connect + authorize the Backstroke MCP; verify it works. Run first. |
| `backstroke` | Entry point — picks the right recipe for the job. |
| `update` | Update the plugin; check whether the installed skills are still in sync with the live MCP. |
| `subject-line-ab-optimizer` | Read a Klaviyo campaign → per-cohort subject lines → approve → clone into variants. |
| `hero-winner-picker` | Score candidate hero images for your audience → hand the winner to your email builder or ESP to build & send. |
| `image-face-off` | Zero-setup: find the winning image among a few candidates, fast, against the global panel. |

**Planned (not yet shipped):** a per-cohort **predictive hero A/B test** — blocked until
the cohort-id dynamic-string generator is exposed as an MCP tool.

## Keeping skills in sync with the MCP

The skills live in a **different repo** from the MCP server, so a tool rename or
removal on the server could silently break a recipe. A drift check guards against
that — it binds the skills to a committed snapshot of the **live tool contract**
(`backstroke/schema/tools-snapshot.json`), which mirrors the hosted endpoint's
`tools/list`, **not** any server repo. That means it's unaffected by the MCP
source moving repos.

```
npm run check      # or: node scripts/check-schema-drift.mjs
```

It fails if a skill's `allowed-tools` names a tool that isn't in the snapshot, or
if the prose references a tool-looking name that doesn't exist (typo / stale
name). CI runs it on every push/PR (`.github/workflows/schema-drift.yml`).

**When the deployed MCP surface changes:** connect to the hosted endpoint **for the env
we ship against (prod)**, call `tools/list`, observe real responses, and update
`tools-snapshot.json` (tool names, params, `outputFields`; add any rename to
`retiredNames` / `retiredFields` so stale mentions get caught). Then rerun the check.

> Two things the check **can't** do for you. It compares names, not capability claims —
> a trap that says "X isn't supported yet" will keep passing long after X ships. And
> non-prod environments can lag prod's response shape. So after a server change, also
> **re-read the traps/ergonomics for stale assertions**.

## Status
v0.2 — early. Claude Code and Claude Desktop install the plugin (tools + recipes);
claude.ai and other MCP clients can add the tools as a custom connector. Connects to
the production Backstroke MCP (`mcp.backstroke.com/mcp`) over native HTTP with OAuth —
no bridge, no keys (the server supports dynamic client registration). Just needs a
Backstroke account enabled for the MCP connector (see the `setup` skill).
