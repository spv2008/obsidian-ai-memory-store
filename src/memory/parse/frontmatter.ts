const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseFrontmatter(
  content: string,
): Record<string, unknown> | null {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (!key) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const frontmatter = parseFrontmatter(content);
  if (frontmatter?.tags) {
    const raw = frontmatter.tags;
    if (typeof raw === "string") {
      for (const tag of raw.split(/[,\s]+/)) {
        if (tag) tags.add(tag.replace(/^#/, ""));
      }
    }
  }

  const inlineMatches = content.matchAll(/(^|\s)#([a-zA-Z0-9_/-]+)/g);
  for (const match of inlineMatches) {
    tags.add(match[2]);
  }
  return [...tags];
}
