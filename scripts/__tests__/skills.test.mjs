import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readSkills } from "../lib/skills.mjs";
import { buildBundle } from "../build-skills-bundle.mjs";
import { fixtureRoot } from "./fixtures.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const byName = (skills, n) => skills.find((s) => s.name === n);

function liveCheck(tools, beta) {
  const file = join(mkdtempSync(join(tmpdir(), "catalog-")), "catalog.json");
  writeFileSync(file, JSON.stringify(beta === undefined ? { tools } : { tools, beta }));
  return spawnSync("node", [join(root, "scripts", "check-live-catalog.mjs"), "--catalog", file], { encoding: "utf8" });
}

const create = ["get_brand_config", "find_products", "list_audiences", "create_campaign", "generate_hero_images", "request_image_upload", "score_hero_generic", "get_hero_scores", "get_campaign_status", "approve_campaign_step", "generate_subject_lines", "pick_subject_line", "push_campaign_to_klaviyo"];

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

const loopTools = ["start_predictive_set", "add_set_to_campaign"];

test("the live check passes a skill whose tools are only in beta, naming it", () => {
  const all = buildBundle(root).skills.flatMap((s) => s.allowed_tools);
  const r = liveCheck(all.filter((t) => !loopTools.includes(t)), loopTools);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /predictive-set/);
});

test("the live check fails a tool in neither tools nor beta, with today's message", () => {
  const all = buildBundle(root).skills.flatMap((s) => s.allowed_tools);
  const r = liveCheck(all.filter((t) => t !== "create_campaign"), loopTools);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /tool "create_campaign" is not in the live catalog/);
});

test("the live check fails closed on a non-array beta", () => {
  const all = buildBundle(root).skills.flatMap((s) => s.allowed_tools);
  const r = liveCheck(all, "start_predictive_set");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /beta is not an array/);
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

test("snapshot: the hero tools carry the composed hero options contract (BAC-3418)", () => {
  const { tools } = JSON.parse(readFileSync(join(root, "backstroke", "schema", "tools-snapshot.json"), "utf8"));
  const gen = tools.generate_hero_images;
  for (const p of ["description", "base_image_urls", "upload_ids", "hero_copy", "from_run_id", "count"]) assert.ok(gen.params.includes(p), `generate_hero_images param ${p}`);
  assert.deepEqual(gen.required, []);
  assert.ok(gen.outputFields.includes("run_id"));
  assert.ok(gen.refusals.includes("no_source") && !gen.refusals.includes("no_source_image"));
  const status = tools.get_campaign_status;
  assert.ok(status.params.includes("run_id"));
  assert.ok(status.outputFields.includes("run_id"));
  assert.ok(status.untrustedFields.includes("saved_rows"));
});

test("create-campaign skill names the run_id and from_run_id hero flows (BAC-3418)", () => {
  const text = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8");
  for (const token of ["from_run_id", "run_id", "base_image_urls", "description", "alternate_hero_image_urls"]) assert.ok(text.includes("`" + token + "`"), token);
});

test("create-campaign asks about heroes with any other question, and does not block on it; setup names the admin allowlist step", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  assert.ok(skill.includes("When you ask the person anything before the options are made, ask about heroes in the same message"));
  assert.ok(skill.includes("If you ask nothing, call it with `chosen_by` agent and tell the person the line its result gives"));
  assert.ok(skill.includes("When they answer, call `generate_hero_images` with `chosen_by` person"));
  assert.ok(!skill.includes("clean photo"));
  assert.ok(!skill.includes("Wait for the answer before you call `generate_hero_images`"));
  assert.ok(skill.includes("Their images join Backstroke's options"));
  const setup = readFileSync(join(root, "backstroke", "skills", "setup", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  assert.ok(setup.includes("only an admin can add the host"));
});

test("create-campaign tells the person the plan, each step line, and that a question waits (BAC-3419)", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  assert.ok(skill.includes("say the plan and the assumptions you made (products, copy, audience) in one or two lines"));
  assert.ok(skill.includes("say the step line its tool description gives, when the description says (for a write tool, before the apply"));
  assert.ok(skill.includes("is its own short paragraph, last in the message. It says that nothing more happens until they answer"));
});

test("create-campaign reads the built email's outline against the brief; the status carries it untrusted", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  for (const line of [
    "When the status has an `email_check`, say it first",
    "give your own view of the `email_outline` against the brief",
    "Once `approved_line` names the email, never rebuild",
    "call `pick_subject_line` with the `campaign_id` and that number",
    "The view then sends a short chat line",
    "Check the hero copy with `hero_copy` (`placed` and `missing`), never with the outline",
    "cut from the outline, not from the email",
    "Tell the person what matched first",
    "rebuild to fix it at most once",
    "ask first if the person may have edited the email in the builder",
  ]) assert.ok(skill.includes(line), line);
  const status = JSON.parse(readFileSync(join(root, "backstroke", "schema", "tools-snapshot.json"), "utf8")).tools.get_campaign_status;
  for (const f of ["email_outline", "email_outline_omitted", "email_check", "approved_line"]) assert.ok(status.outputFields.includes(f), f);
  for (const f of ["email_outline", "email_check"]) assert.ok(status.untrustedFields.includes(f), f);
});

// Adam on ap#9 (11-20): at the hero gate create_campaign is held, so own heroes go through the approval;
// a subject-line pick, typed or clicked in the view, is never the yes to push.
test("create-campaign approves own heroes at the gate, and a subject pick is not the push yes", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  for (const line of [
    "at the hero gate, call `approve_campaign_step` with their heroes as the `selection`",
    "Before `generate_hero_images`, or after the options failed, call `create_campaign` with `build: true` and `only_given_heroes`",
    "\"Picked subject line N in the Backstroke view\" is a pick, not the yes to push",
  ]) assert.ok(skill.includes(line), line);
  assert.ok(!skill.includes("call `create_campaign` with `build: true` and `only_given_heroes`, and build at once"));
});

// Owen 11-20: the agent always settles the template before the build: it asks, unless the brief names one.
test("create-campaign asks which template, unless the brief names one", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  for (const line of [
    "the hero link, which template to use, and whether they have their own hero images",
    "When the brief names a template, use it and do not ask",
  ]) assert.ok(skill.includes(line), line);
});

function realSnapshotDrift(body) {
  const r = fixtureRoot([["a", `name: a\ndescription: d\nhosts: [all]\nallowed-tools:\n  - start_predictive_set\n  - add_set_to_campaign`, body]]);
  mkdirSync(join(r, "backstroke", "schema"), { recursive: true });
  writeFileSync(join(r, "backstroke", "schema", "tools-snapshot.json"), readFileSync(join(root, "backstroke", "schema", "tools-snapshot.json")));
  return spawnSync("node", [join(root, "scripts", "check-schema-drift.mjs"), r], { encoding: "utf8" });
}

test("drift check: the snapshot knows start_predictive_set and add_set_to_campaign", () => {
  const r = realSnapshotDrift("Call `start_predictive_set`, then `add_set_to_campaign`.");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("drift check: a misspelled start_ or add_ tool in prose fails", () => {
  const r = realSnapshotDrift("Call `start_predictive_sets`, then `add_sets_to_campaign`.");
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /start_predictive_sets/);
  assert.match(r.stdout + r.stderr, /add_sets_to_campaign/);
});

test("predictive-set asks the own-hero question with the options-or-set question, never as a second one", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "predictive-set", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  assert.ok(skill.includes("ask the one question exactly as the `start_predictive_set` description words it"));
  assert.ok(skill.includes("whether they have their own hero images, ask that in the same message, not as a second question"));
});

test("create-campaign asks options-or-set on a bare hero ask, never on a campaign prompt, and hands off to predictive-set", () => {
  const skill = readFileSync(join(root, "backstroke", "skills", "create-campaign", "SKILL.md"), "utf8").replace(/\s+/g, " ");
  assert.ok(skill.includes("first ask the one question its description gives and make nothing until they answer"));
  assert.ok(skill.includes("Never ask it for a campaign prompt: that gets hero options."));
  assert.ok(skill.includes("picks it when asked → `predictive-set`"));
});
