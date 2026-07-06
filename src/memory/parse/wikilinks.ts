const WIKILINK_PATTERN = /\[\[([^\]]+)\]\]/g;

export interface Wikilink {
  target: string;
  alias?: string;
  raw: string;
}

export function extractWikilinks(content: string): Wikilink[] {
  const links: Wikilink[] = [];
  let match: RegExpExecArray | null;

  while ((match = WIKILINK_PATTERN.exec(content)) !== null) {
    const inner = match[1];
    const pipeIndex = inner.indexOf("|");
    if (pipeIndex === -1) {
      links.push({ target: inner.trim(), raw: match[0] });
    } else {
      links.push({
        target: inner.slice(0, pipeIndex).trim(),
        alias: inner.slice(pipeIndex + 1).trim(),
        raw: match[0],
      });
    }
  }

  return links;
}

export function extractWikilinkTargets(content: string): string[] {
  return extractWikilinks(content).map((link) => link.target);
}
