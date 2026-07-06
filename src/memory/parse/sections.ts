export interface MarkdownSection {
  heading: string;
  level: number;
  body: string;
  startLine: number;
}

export function splitSections(content: string): MarkdownSection[] {
  const lines = content.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (!match) {
      if (current) {
        current.body += (current.body ? "\n" : "") + line;
      }
      continue;
    }

    if (current) {
      sections.push(current);
    }

    current = {
      heading: match[2].trim(),
      level: match[1].length,
      body: "",
      startLine: i + 1,
    };
  }

  if (current) {
    sections.push(current);
  }

  return sections.map((section) => ({
    ...section,
    body: section.body.trim(),
  }));
}

export function findSection(
  content: string,
  heading: string,
): MarkdownSection | undefined {
  return splitSections(content).find(
    (section) => section.heading.toLowerCase() === heading.toLowerCase(),
  );
}
