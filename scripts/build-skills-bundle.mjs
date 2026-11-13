#!/usr/bin/env node
// Build dist/skills-bundle.json: the skills every host may read (hosts includes "all").
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readSkills } from "./lib/skills.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const isString = (v) => typeof v === "string";
const nonEmpty = (v) => isString(v) && v.length > 0;

// Mirrors the zod schema in mcp src/skills/bundle.ts, the contract the server loads against.
function validate(version, skills) {
  const errors = [];
  const seen = new Set();
  for (const s of skills) {
    const at = `skill ${s.name ?? "(unnamed)"}`;
    if (!nonEmpty(s.name)) errors.push(`${at}: name must be a non-empty string`);
    else if (seen.has(s.name)) errors.push(`${at}: duplicate skill name`);
    else seen.add(s.name);
    if (!nonEmpty(s.description)) errors.push(`${at}: description must be a non-empty string`);
    if (s.argument_hint !== null && !isString(s.argument_hint)) errors.push(`${at}: argument_hint must be a string or null`);
    if (!Array.isArray(s.allowed_tools) || !s.allowed_tools.every(isString)) errors.push(`${at}: allowed_tools must be a list of strings`);
    if (!Array.isArray(s.hosts)) errors.push(`${at}: hosts must be a list`);
    const refs = s.references;
    if (!refs || typeof refs !== "object" || !Object.values(refs).every(isString)) errors.push(`${at}: references must map names to strings`);
  }
  if (!nonEmpty(version)) errors.push("bundle version must be a non-empty string");
  if (errors.length) throw new Error(errors.join("\n"));
}

export function buildBundle(root = repoRoot) {
  const plugin = JSON.parse(readFileSync(join(root, "backstroke", ".claude-plugin", "plugin.json"), "utf8"));
  const all = readSkills(root);
  validate(plugin.version, all);
  const commit = process.env.GITHUB_SHA || execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
  const skills = all
    .filter((s) => s.hosts.includes("all"))
    .map(({ hosts, ...skill }) => skill);
  return { version: plugin.version, commit, skills };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? repoRoot;
  const out = join(root, "dist", "skills-bundle.json");
  let bundle;
  try {
    bundle = buildBundle(root);
  } catch (err) {
    console.error(`bundle build failed:\n${err.message}`);
    process.exit(1);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(bundle, null, 2) + "\n");
  console.log(`bundle v${bundle.version}: ${bundle.skills.length} skill(s) -> dist/skills-bundle.json`);
}
