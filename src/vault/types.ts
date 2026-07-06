import type { FileStats } from "obsidian";

export interface SearchContext {
  match: {
    start: number;
    end: number;
    source: "filename" | "content";
  };
  context: string;
}

export interface SearchResponseItem {
  filename: string;
  score?: number;
  matches: SearchContext[];
}

export interface SearchJsonResponseItem {
  filename: string;
  result: unknown;
}

export interface FileMetadataObject {
  tags: string[];
  frontmatter: Record<string, unknown>;
  stat: FileStats;
  path: string;
  content: string;
  links: string[];
  backlinks: string[];
}

export interface DocumentMapObject {
  headings: string[];
  blocks: string[];
  frontmatterFields: string[];
}
