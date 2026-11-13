// The leading `---` block only, so a line in the skill body is never read as a key.
function frontmatter(text) {
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? "";
}

// Parse the `allowed-tools:` block from a SKILL.md frontmatter (simple list form).
export function parseAllowedTools(text) {
  text = frontmatter(text) + "\n";
  // List items are indented with a dash + space (`  - tool_name`); the frontmatter
  // delimiter `---` is not, so require leading whitespace + a space after the dash.
  const m = text.match(/^allowed-tools:[ \t]*\n((?:[ \t]+-[ \t]+\S.*\n?)+)/m);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.match(/^[ \t]+-[ \t]+(.+?)\s*$/)?.[1])
    .filter(Boolean);
}

// Parse the `hosts:` value (flow `[a, b]` or block list); null when absent or not plain names.
export function parseHosts(text) {
  text = frontmatter(text);
  const flow = text.match(/^hosts:[ \t]*\[([^\]\n]*)\]/m);
  const block = text.match(/^hosts:[ \t]*\n((?:[ \t]+-[ \t]+\S.*\n?)+)/m);
  const raw = flow
    ? flow[1].split(",")
    : block?.[1].split("\n").map((l) => l.match(/^[ \t]+-[ \t]+(.+?)\s*$/)?.[1]);
  if (!raw) return null;
  const items = raw.map((h) => (h ?? "").trim().replace(/^(["'])(.*)\1$/, "$2")).filter(Boolean);
  // Fail closed: an odd item returns null so the drift check still runs.
  return items.every((h) => /^[A-Za-z0-9_-]+$/.test(h)) ? items : null;
}
