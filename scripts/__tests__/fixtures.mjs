import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A throwaway repo root with plugin.json and one SKILL.md per [dir, frontmatter, body?] entry.
export function fixtureRoot(skills) {
  const root = mkdtempSync(join(tmpdir(), "skills-"));
  mkdirSync(join(root, "backstroke", ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, "backstroke", ".claude-plugin", "plugin.json"), JSON.stringify({ version: "1.0.0" }));
  for (const [dir, front, body = "body"] of skills) {
    mkdirSync(join(root, "backstroke", "skills", dir), { recursive: true });
    writeFileSync(join(root, "backstroke", "skills", dir, "SKILL.md"), `---\n${front}\n---\n${body}\n`);
  }
  return root;
}
