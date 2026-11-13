---
hosts: [claude-plugin]
name: update
description: >-
  Keep Backstroke up to date, and surface what's newly possible. Use when the user
  asks to update/upgrade the Backstroke plugin, cookbook, or skills; to check
  whether a newer version is available; to check whether the installed recipes are
  still in sync with the live Backstroke MCP; or to see what's new. Reports what's
  current, updates the plugin if behind (Claude Code) or the config (Claude Desktop),
  and announces new capabilities in plain English.
allowed-tools:
  - Bash
---

# Keeping Backstroke up to date

There's **no local CLI or binary** to update — Backstroke's MCP is a **remote,
hosted server**. That splits "updates" into two independent things:

1. **The plugin (skills + `.mcp.json`)** — versioned in this repo, installed from the
   marketplace in **either** Claude Code (`/plugin`) or Claude Desktop (Customize →
   Plugins). This is the thing you actually *update*.
2. **The MCP tool surface** — updated server-side by Backstroke, on its own schedule.
   You don't update it; it just changes. But when it changes, the *installed skills*
   can fall behind (a tool gets renamed, a new tool appears). So part of "check for
   updates" is checking whether your skills still match the live server.

## 1. Check the plugin version, and whether a newer one exists

### Claude Code
The installed version is in the plugin manifest:

```bash
cat "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"   # → "version"
```

Refresh the marketplace and see if a newer plugin is published:

```bash
claude plugin marketplace update backstroke-plugins
claude plugin update backstroke@backstroke-plugins
```

Then have the user run `/reload-plugins` (or restart Claude Code) so the new version
loads. If the version still looks old, the marketplace clone was stale — the explicit
`marketplace update` above force-refreshes it; as a last resort, uninstall and
reinstall the `backstroke` plugin.

### Claude Desktop
Desktop installs the plugin from the same marketplace, so it updates too — just
through the UI instead of the CLI.

Go to **Customize → Plugins**, find the **backstroke** plugin (from the
`https://github.com/BackstrokeDev/agent-plugins` marketplace) and refresh/update it
there. Then **fully quit Desktop (Cmd/Ctrl+Q) and reopen** — a window close won't
reload plugins.

If you added the MCP server **by hand** (a custom connector) instead of installing the
plugin, there's no plugin to update; the connector only needs touching if the endpoint
URL changes (rare). Full quit + reopen after any edit.

Steps 2 and 3 below (sync check + what's new) apply on Desktop either way — the server
can move under you regardless of client.

## 2. Check the skills are still in sync with the live MCP

This is the part unique to a remote MCP: even on the latest plugin, the *server* may
have moved. Compare the tools the connected **`backstroke`** MCP server currently
exposes against the contract the installed skills were built for
(`backstroke/schema/tools-snapshot.json`):

- **Server has a tool the snapshot doesn't** (or a renamed one) → the server is ahead
  of your skills. Update the plugin (step 1). If already latest, the cookbook hasn't
  caught up yet — note it; a recipe may be missing.
- **A snapshot tool is gone from the server** → a recipe may reference a tool that no
  longer exists. Update the plugin; if still present after updating, flag it.
- **Names all match** → skills and server are in sync. Nothing to do.

To compare, list the tool names on the connected `backstroke` server and diff them
against the `tools` keys in `backstroke/schema/tools-snapshot.json`. If you have the
repo checked out, the bundled drift check does the skill-side half automatically:

```bash
cd <repo> && npm run check    # skills vs. snapshot — should pass on a released version
```

> The snapshot mirrors the **hosted endpoint's** tool list, not any server repo, so
> this check is unaffected by where Backstroke's MCP source lives.

## 3. Surface what's new — don't update silently

An update isn't just a version bump — it's the moment to tell the user **what they
can now do**. A new capability is invisible until someone names it; no marketer asks
for a tool they don't know exists. This is where the cookbook turns "a new tool
shipped" into "a marketer actually adopts it."

After updating, read `CHANGELOG.md` and present the entries newer than the version
that *was* installed, **in plain English** — pair each with what it does for the
marketer, and give a starter prompt. Not "v0.2 adds a predictive-heroes tool", but:

> **New — Predictive heroes:** generate the hero image(s) most likely to win for a
> campaign, not just rank the ones you already have. Try: *"make me a winning hero
> for my Father's Day campaign."*

Then compare the live server's tools against the snapshot: if a **new tool** appears
that no recipe covers yet, name it anyway — the capability exists even before its
recipe lands, and the user may want it now. Flag it so the cookbook can pair it with
a recipe next.

## 4. Verify

**Claude Code** — confirm the plugin reloaded at the new version:

```bash
cat "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"    # version bumped?
```

**Claude Desktop** — confirm the plugin shows the new version under Customize →
Plugins, and that the server is connected, after the full quit + reopen.

Either way, run a harmless read call (e.g. `list_clusters`) to confirm the MCP still
answers, and that any newly-added tools now appear. If a tool call still misbehaves after
updating, the server may be mid-change — retry shortly, or report it to Backstroke.
