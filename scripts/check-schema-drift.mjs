#!/usr/bin/env node
/**
 * Schema-drift check for the Backstroke cookbook.
 *
 * WHY: the skills live in a different repo from the MCP server, so a tool
 * rename/removal on the server can silently break a recipe. This check binds the
 * skills to a committed snapshot of the LIVE tool contract (backstroke/schema/
 * tools-snapshot.json) — which mirrors the hosted endpoint's tools/list, not any
 * server repo. So it keeps working no matter which repo serves the MCP.
 *
 * WHAT IT CHECKS (all hard failures):
 *   A. Every skill's frontmatter `allowed-tools` entry exists in the snapshot.
 *   B. Every tool-looking token in the prose (backticked snake_case starting with
 *      a known verb prefix, e.g. `score_hero_for_audience`) is an exact snapshot
 *      tool name — catches typos and stale/renamed references. Also fails on any
 *      name listed in the snapshot's `retiredNames`.
 *   C. No doc references a field listed in the snapshot's `retiredFields` (renamed
 *      or removed response fields).
 *
 * WHAT IT CANNOT CATCH (learned the hard way, 2026-07-20):
 *   Prose *claims* about capability — e.g. "the Klaviyo id isn't exposed" stayed in
 *   the docs after the server started exposing it. No name/field check sees that.
 *   So when the server surface changes, regenerating the snapshot is necessary but
 *   NOT sufficient — re-read the traps/ergonomics for stale assertions too.
 *
 *   Also, by design: every check runs docs -> snapshot, never snapshot -> server.
 *   A tool ADDED server-side is invisible here no matter how good the script gets —
 *   nothing compares the live tool list to the snapshot. That half is handed to a
 *   human on purpose (the `update` skill); don't wire a snapshot->server check into
 *   CI, since it would need a prod credential in the runner. Regenerate on release
 *   instead — and when you do, add any new verb to `verbPrefixes` (e.g. `switch` for
 *   a future `switch_account`), or Check B silently skips every mention of it.
 *
 * REGENERATE THE SNAPSHOT when the deployed tool surface changes:
 *   connect to the hosted MCP **for the env we ship against (prod)**, call tools/list,
 *   observe real responses, and update tools-snapshot.json (tool names, params,
 *   outputFields). dev can lag prod. Then rerun this check.
 *
 * SCOPE: every .md under backstroke/skills/, PLUS the repo-root prose docs
 *   (README.md, CHANGELOG.md, GETTING_STARTED.md) — those name tools in prose too.
 *   Check A (frontmatter allowed-tools) applies only to SKILL.md files.
 *
 * USAGE: node scripts/check-schema-drift.mjs   (exit 0 = clean, 1 = drift)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapPath = join(repoRoot, "backstroke", "schema", "tools-snapshot.json");
const skillsDir = join(repoRoot, "backstroke", "skills");

const snap = JSON.parse(readFileSync(snapPath, "utf8"));
const toolNames = new Set(Object.keys(snap.tools));
const verbPrefixes = snap.verbPrefixes ?? [];
const retired = snap.retiredNames ?? {};
const retiredFields = snap.retiredFields ?? {};
const errors = [];

// Walk every .md under skills/
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Parse the `allowed-tools:` block from a SKILL.md frontmatter (simple list form).
function parseAllowedTools(text) {
  // List items are indented with a dash + space (`  - tool_name`); the frontmatter
  // delimiter `---` is not, so require leading whitespace + a space after the dash.
  const m = text.match(/^allowed-tools:[ \t]*\n((?:[ \t]+-[ \t]+\S.*\n?)+)/m);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.match(/^[ \t]+-[ \t]+(.+?)\s*$/)?.[1])
    .filter(Boolean);
}

// Also scan the repo-root prose docs — they name tools in prose too (Checks B/C).
// They have no frontmatter, so Check A (gated on SKILL.md below) naturally skips them.
const rootDocs = ["README.md", "CHANGELOG.md", "GETTING_STARTED.md"]
  .map((f) => join(repoRoot, f))
  .filter((p) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });

const files = [...walk(skillsDir), ...rootDocs];

for (const file of files) {
  const rel = relative(repoRoot, file);
  const text = readFileSync(file, "utf8");

  // --- Check A: allowed-tools must exist in the snapshot ---
  if (file.endsWith("SKILL.md")) {
    for (const t of parseAllowedTools(text)) {
      if (!toolNames.has(t)) {
        errors.push(`${rel}: allowed-tools lists "${t}" — not in the MCP tool snapshot.`);
      }
    }
  }

  // --- Check B: tool-looking tokens in prose must be exact snapshot names ---
  const backticked = [...text.matchAll(/`([a-z][a-z0-9_]+)`/g)].map((m) => m[1]);
  for (const tok of backticked) {
    if (retired[tok]) {
      errors.push(`${rel}: references retired tool "${tok}" — renamed to "${retired[tok]}".`);
      continue;
    }
    const looksLikeTool = tok.includes("_") && verbPrefixes.includes(tok.split("_")[0]);
    if (looksLikeTool && !toolNames.has(tok)) {
      errors.push(`${rel}: "\`${tok}\`" looks like a tool call but is not a known MCP tool (typo or drift?).`);
    }

    // --- Check C: retired response fields ---
    if (retiredFields[tok]) {
      errors.push(`${rel}: references retired field "${tok}" — now "${retiredFields[tok]}".`);
    }
  }
}

if (errors.length) {
  console.error(`\n✗ schema drift — ${errors.length} issue(s):\n`);
  for (const e of [...new Set(errors)]) console.error("  • " + e);
  console.error(`\nFix the skill text, or regenerate tools-snapshot.json if the server surface changed.\n`);
  process.exit(1);
}

console.log(`✓ no schema drift — ${files.length} doc file(s) match ${toolNames.size} snapshot tools.`);
