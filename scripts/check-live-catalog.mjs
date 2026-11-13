#!/usr/bin/env node
// Fail when a published skill names a tool the live catalog lacks.
// Usage: check-live-catalog.mjs [--catalog <file>]   (default: GET TOOL_CATALOG_URL)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBundle } from "./build-skills-bundle.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.TOOL_CATALOG_URL || "https://mcp.backstroke.com/tool-catalog";

async function loadCatalog() {
  const i = process.argv.indexOf("--catalog");
  if (i !== -1) return JSON.parse(readFileSync(process.argv[i + 1], "utf8"));
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`GET ${url} answered ${res.status}`);
  return res.json();
}

try {
  const { tools } = await loadCatalog();
  if (!Array.isArray(tools)) throw new Error("catalog has no tools array");
  const live = new Set(tools);
  const missing = [];
  for (const s of buildBundle(repoRoot).skills) {
    for (const t of s.allowed_tools) if (!live.has(t)) missing.push(`${s.name}: tool "${t}" is not in the live catalog`);
  }
  if (missing.length) {
    console.error(missing.join("\n"));
    process.exit(1);
  }
  console.log(`live catalog has every tool the published skills name (${live.size} tools).`);
} catch (e) {
  console.error(`live catalog check failed: ${e.message}`);
  process.exit(1);
}
