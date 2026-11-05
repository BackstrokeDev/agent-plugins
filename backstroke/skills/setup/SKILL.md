---
name: setup
description: >-
  Set up the Backstroke MCP connection in Claude Code, Claude Desktop, or claude.ai —
  add the remote server (it self-registers via dynamic client registration), complete
  the OAuth sign-in/consent, and verify the tools work. Run this first, before any
  other Backstroke skill, or when Backstroke tool calls return 401 / "not connected".
allowed-tools: Read
---

# Set up Backstroke

Backstroke's MCP is a **remote, OAuth-authenticated server** at
`https://mcp.backstroke.com/mcp`. It supports **dynamic client registration**, so
connecting is now just **"add the URL"** — no local bridge, no client id, no API
keys. Your client registers itself and opens a browser sign-in the first time you
use a tool.

Pick your client below. **Claude Code** and **Desktop** install the plugin, which
gives you the guided **recipes** *and* the connection; a plain **custom connector**
(claude.ai web, or any MCP client) gives you the **tools** only.

## Before you start
- **A Backstroke account enabled for the MCP connector.** If it's not enabled, a message
  says the account or brand isn't enabled for the Backstroke MCP connector — ask
  Backstroke to enable it.

(No Node.js or `npx` required anymore — the server is reached over native HTTP.)

## 1. Connect

### Claude Code — recommended (tools + recipes)
```
/plugin marketplace add BackstrokeDev/agent-plugins
/plugin install backstroke@backstroke-plugins
```
Installing registers the `backstroke` MCP server from the plugin's bundled
`.mcp.json` (native HTTP → `https://mcp.backstroke.com/mcp`). **Restart the agent
after install** so it picks up the server.

Turn on auto-update so new versions reach you (it's off by default for this
marketplace): `/plugin` → **Marketplaces** → `backstroke-plugins` → **Enable auto-update**.

Want just the tools, no plugin? Add the server directly:
```
claude mcp add --transport http backstroke https://mcp.backstroke.com/mcp
```

### Claude Desktop (tools + recipes)
**Customize → Plugins → Add → Add Marketplace → Add from a repository**, then enter:

```
https://github.com/BackstrokeDev/agent-plugins
```

Install the **backstroke** plugin, then **fully quit Claude Desktop** (Cmd/Ctrl+Q —
closing the window isn't enough) and reopen. The first Backstroke tool call opens the
login + consent page.

### claude.ai (web) or any MCP client — custom connector (tools only)
**Settings → Connectors → Add custom connector**, paste:

```
https://mcp.backstroke.com/mcp
```

and follow the sign-in. This connects the Backstroke **tools**; for the guided
recipes, install the plugin in Claude Code or Desktop above.

## 2. Authorize (OAuth)
The first time you use a Backstroke tool, your browser opens a **login + consent**
page at `app.backstroke.com` — sign in with your account and approve.

- The token is scoped to **your account**. If you belong to multiple accounts,
  confirm the consent screen names the one you intend to work in.
- **No keys, no client id to paste.** The server supports dynamic client
  registration, so your client registers itself automatically as a public OAuth
  client and logs you in as yourself — you only ever see your own data.
- **What you're granting.** There are four scopes:
  - `subject_lines:generate` — the prediction and read tools.
  - `klaviyo:write` — "Write campaigns and subject lines to your Klaviyo account":
    `push_subject_lines` and `push_campaign_to_klaviyo`.
  - `campaigns:write` — "Create and change campaigns in Backstroke": `create_campaign`.
  - `klaviyo:send` — "Schedule campaigns to send to your Klaviyo audiences": `schedule_campaign`.

  Every write first shows you a preview of exactly what changes, and writes only
  after you say yes. If a write tool asks you to sign in again, it
  needs a scope your first consent didn't grant — approve it on the consent page.

### Image files (optional)
The hero tools can score image **files** through `request_image_upload`. The fast path
runs `curl` from Claude, so it needs code execution turned on and the Backstroke API
host (`api.backstroke.com`) on the allowed domains list in your Claude settings.
Without that, the tool gives you an `upload_url` to open in the browser instead.

## 3. Verify
Run a harmless read-only call, e.g. **`list_cohorts`** or `list_klaviyo_campaigns`. A
successful list = you're connected and scoped to an account. A 401 / "not connected"
→ see Troubleshooting.

## 4. Welcome — show the banner
On a **successful** connect + verify, display the Backstroke welcome banner as a
sign you're live: print the contents of `assets/backstroke-banner.txt` verbatim
inside a plain code block (it's ~46 cols — won't wrap in a narrow terminal), then
greet the user and point them to the next step. Show it only once, on a clean
connect — not on errors, and not on every later call.

## What's next
Run the **`backstroke`** skill — it's the entry point that picks the right recipe
(subject-line optimization, hero scoring, etc.).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| A message that the account or brand isn't enabled for the Backstroke MCP connector | The account or brand isn't enabled for the connector | Ask Backstroke to enable it; if you have other brands, `switch_account` to an enabled one. |
| A daily limit message on `create_campaign` or `generate_subject_lines` | The brand reached that tool's daily limit | Wait until the time the message names; previews don't count. |
| `curl` to the upload host fails or can't connect | Code execution is off, or the host isn't on the allowed domains list | Use the `upload_url` in the browser, or add the host in your Claude settings. |
| A tool call returns `ENTITLEMENT_DENIED` | Connect + auth worked, but your account isn't entitled to that specific tool/feature | Ask an admin to enable that tool for your account; other tools keep working. |
| Backstroke tools don't appear after install | Agent not restarted; server registers at startup | Restart the agent (fully quit + reopen on Desktop), then retry. |
| Every tool call returns **401** / "not connected" | OAuth not completed / token expired | Re-run the auth flow; finish the browser consent at `app.backstroke.com`. |
| claude.ai / Desktop won't add the connector | Added as the wrong kind of connector, or the URL is missing the `/mcp` path | Add it under **Connectors → custom connector** using the full URL `https://mcp.backstroke.com/mcp`. |
| Subject-line generation hangs / times out | Known — generation is slow; the client's tool-call timeout fires | Retry; other tools (campaigns, cohorts) return quickly. In Claude Code you can raise the ceiling with the `MCP_TOOL_TIMEOUT` env var (ms). |
| `UPSTREAM_ERROR` "temporarily unavailable" on a data tool | A transient upstream/backend hiccup | Retry. If it persists it's not a local setup problem — check Backstroke status or ping support. |
