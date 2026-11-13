# Getting started with Backstroke

> This file is written to be handed to your coding agent. Point it here and ask
> it to set Backstroke up for you — installing the plugin and completing the
> OAuth sign-in are things the agent can walk you through by following these steps.

Backstroke's MCP is a **remote, OAuth-authenticated server** at
`https://mcp.backstroke.com/mcp`. You install the plugin (which registers the
connection over native HTTP), complete a browser sign-in, and start prompting. The
server supports dynamic client registration, so there's no bridge, no keys, and
nothing to paste.

**One prerequisite:** your Backstroke account needs to be enabled for the MCP
connector (the `setup` skill's Troubleshooting covers the "account not enabled"
case).

## Installation (Claude Code)

```
/plugin marketplace add BackstrokeDev/agent-plugins
/plugin install backstroke@backstroke-plugins
```

**Restart the agent after install** — the MCP server registers at startup, so a
running session won't see it until you restart. (This is the most common reason
setup looks done but the tools don't appear.)

## Run the `setup` skill

Once installed, run the bundled **`setup`** skill now, before anything else. It
connects the MCP, walks you through the OAuth consent, and verifies the tools
respond.

- Try invoking it by name: **`backstroke:setup`**.
- If it doesn't show up right after install, locate its `SKILL.md` and follow it
  like a runbook:
  ```
  find ~/.claude ~/.config -type f -path '*/skills/setup/SKILL.md' 2>/dev/null | grep -i backstroke | tail -n1
  ```

## What's next

Run the **`backstroke`** skill — the entry point. It picks the right recipe:
- **`create-campaign`** — a campaign from one prompt: brief, build, subject lines,
  push to Klaviyo and schedule.
- **`subject-line-ab-optimizer`** — stronger per-audience subject lines for a
  Klaviyo campaign, set up as A/B variants (with your approval before anything is
  written).
- More recipes (hero-image scoring, cross-ESP hand-offs) are on the way.

## The one thing to know

Backstroke **predicts**, and it can also build, push and schedule a campaign. Any step that writes to your marketing account (making a campaign,
creating Klaviyo variants, scheduling a send, or handing off to another tool's send)
happens **only after you approve the exact content**. Predict freely — nothing
ships silently.
