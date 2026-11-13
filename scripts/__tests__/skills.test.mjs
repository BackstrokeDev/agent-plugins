import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readSkills } from "../lib/skills.mjs";
import { buildBundle } from "../build-skills-bundle.mjs";
import { fixtureRoot } from "./fixtures.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const byName = (skills, n) => skills.find((s) => s.name === n);

function liveCheck(tools) {
  const file = join(mkdtempSync(join(tmpdir(), "catalog-")), "catalog.json");
  writeFileSync(file, JSON.stringify({ tools }));
  return spawnSync("node", [join(root, "scripts", "check-live-catalog.mjs"), "--catalog", file], { encoding: "utf8" });
}

const create = ["get_brand_config", "find_products", "list_audiences", "create_campaign", "generate_hero_images", "request_image_upload", "score_hero_generic", "get_hero_scores", "get_campaign_status", "generate_subject_lines", "push_campaign_to_klaviyo"];

test("readSkills parses create-campaign allowed tools", () => {
  assert.deepEqual(byName(readSkills(root), "create-campaign").allowed_tools, create);
});

test("a folded description is one line", () => {
  const d = byName(readSkills(root), "create-campaign").description;
  assert.ok(d.length > 0);
  assert.doesNotMatch(d, /\n/);
});

test("the bundle leaves out claude-plugin-only skills", () => {
  const names = buildBundle(root).skills.map((s) => s.name);
  for (const n of ["setup", "update", "backstroke"]) assert.ok(!names.includes(n), n);
  assert.ok(names.includes("create-campaign"));
});

test("the bundle carries references and no frontmatter in the body", () => {
  const skills = buildBundle(root).skills;
  assert.ok(byName(skills, "hero-winner-picker").references["tool-ergonomics"].length > 0);
  assert.ok(skills.every((s) => !s.body.startsWith("---")));
});

test("the live check names a missing tool and exits 1", () => {
  const r = liveCheck(create.filter((t) => t !== "create_campaign"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /create_campaign/);
});

test("the live check passes with a full catalog", () => {
  const all = buildBundle(root).skills.flatMap((s) => s.allowed_tools);
  assert.equal(liveCheck(all).status, 0);
});

const ok = "name: a\ndescription: d";
process.env.GITHUB_SHA = "abc";

test("a non-list allowed-tools value throws, naming the skill", () => {
  const r = fixtureRoot([["a", `${ok}\nallowed-tools: create_campaign`]]);
  assert.throws(() => readSkills(r), /a.*allowed-tools/);
});

test("a missing allowed-tools key gives an empty list", () => {
  assert.deepEqual(readSkills(fixtureRoot([["a", ok]]))[0].allowed_tools, []);
});

test("a non-list hosts value fails the build", () => {
  const r = fixtureRoot([["a", `${ok}\nhosts: all`]]);
  assert.throws(() => buildBundle(r), /a.*hosts/);
});

test("a YAML-array argument-hint fails the build, naming skill and field", () => {
  const r = fixtureRoot([["a", `${ok}\nargument-hint: [image urls]`]]);
  assert.throws(() => buildBundle(r), /a.*argument_hint/);
});

test("a skill with no name fails the build", () => {
  const r = fixtureRoot([["a", "description: d"]]);
  assert.throws(() => buildBundle(r), /name/);
});

test("an empty description fails the build", () => {
  const r = fixtureRoot([["a", "name: a"]]);
  assert.throws(() => buildBundle(r), /a.*description/);
});

test("a duplicate skill name fails the build", () => {
  const r = fixtureRoot([["a", ok], ["b", ok]]);
  assert.throws(() => buildBundle(r), /duplicate.*a/);
});

test("the CLI exits 1 with a message on an invalid skill", () => {
  const r = fixtureRoot([["a", "description: d"]]);
  const res = spawnSync("node", [join(root, "scripts", "build-skills-bundle.mjs"), r], { encoding: "utf8" });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /name/);
});

test("the real skills still build", () => {
  assert.ok(buildBundle(root).skills.length > 0);
});

function driftCheck(front, tool, body) {
  const r = fixtureRoot([["a", `name: a\ndescription: d\n${front}\nallowed-tools:\n  - ${tool}`, body]]);
  mkdirSync(join(r, "backstroke", "schema"), { recursive: true });
  writeFileSync(join(r, "backstroke", "schema", "tools-snapshot.json"), JSON.stringify({ tools: { create_campaign: {} } }));
  return spawnSync("node", [join(root, "scripts", "check-schema-drift.mjs"), r], { encoding: "utf8" });
}

test("drift check: a block-list plugin-only skill may list Read", () => {
  assert.equal(driftCheck("hosts:\n  - claude-plugin", "Read").status, 0);
});

test("drift check: a flow-list plugin-only skill may list Read", () => {
  assert.equal(driftCheck("hosts: [claude-plugin]", "Read").status, 0);
});

test("drift check: a published skill listing an unknown tool fails", () => {
  const r = driftCheck("hosts: [all]", "Read");
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /Read/);
});

test("drift check: a quoted all still counts as published", () => {
  assert.equal(driftCheck('hosts: ["all"]', "Read").status, 1);
});

test("drift check: a quoted claude-plugin is plugin-only", () => {
  assert.equal(driftCheck("hosts: ['claude-plugin']", "Read").status, 0);
});

test("drift check: a quoted block item all still counts as published", () => {
  assert.equal(driftCheck('hosts:\n  - "all"', "Read").status, 1);
});

test("drift check: a hosts line in the skill body does not make a published skill plugin-only", () => {
  // No hosts key means published to all; only the body names claude-plugin.
  assert.equal(driftCheck("", "Read", "Example:\nhosts: [claude-plugin]").status, 1);
});
