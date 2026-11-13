import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
export { parseAllowedTools } from "./frontmatter.mjs";

function splitFrontmatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no frontmatter`);
  return { meta: parse(m[1]) ?? {}, body: m[2].replace(/^\n+/, "") };
}

function readReferences(skillDir) {
  const dir = join(skillDir, "reference");
  if (!existsSync(dir)) return {};
  const refs = {};
  for (const f of readdirSync(dir).sort()) {
    if (f.endsWith(".md")) refs[f.slice(0, -3)] = readFileSync(join(dir, f), "utf8");
  }
  return refs;
}

// Every skill under backstroke/skills as the bundle contract describes it.
export function readSkills(repoRoot) {
  const root = join(repoRoot, "backstroke", "skills");
  return readdirSync(root)
    .sort()
    .filter((n) => statSync(join(root, n)).isDirectory())
    .map((n) => {
      const file = join(root, n, "SKILL.md");
      const { meta, body } = splitFrontmatter(readFileSync(file, "utf8"), file);
      const tools = meta["allowed-tools"] ?? [];
      if (!Array.isArray(tools)) throw new Error(`skill ${meta.name ?? n}: allowed-tools must be a list`);
      return {
        name: meta.name,
        description: String(meta.description ?? ""),
        argument_hint: meta["argument-hint"] ?? null,
        allowed_tools: tools.map(String),
        hosts: meta.hosts ?? ["all"],
        body,
        references: readReferences(join(root, n)),
      };
    });
}
