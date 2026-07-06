import { excerpt, capExcerptLength } from "./excerpt";
import {
  conversationContextPath,
  decisionsIndexPath,
  projectMemoryPrefix,
  projectRelativePath,
  tasksIndexPath,
} from "./paths";
import {
  isDecisionNeedsReview,
  parseDecisionsIndex,
} from "./parse/decisionsIndex";
import { extractTags, parseFrontmatter } from "./parse/frontmatter";
import { splitSections } from "./parse/sections";
import { parseTasksIndex } from "./parse/tasksIndex";
import { extractWikilinkTargets } from "./parse/wikilinks";
import { PROJECT_FILES } from "./schema";
import { resolveVaultLink } from "./linkResolve";
import type { MemoryVaultReader } from "./vaultReader";

export type RecallSource =
  | "decisions"
  | "lessons"
  | "patterns"
  | "tools"
  | "tasks"
  | "daily"
  | "context"
  | "specifications"
  | "architecture"
  | "plans"
  | "manual-tests";

export const ALL_RECALL_SOURCES: RecallSource[] = [
  "decisions",
  "lessons",
  "patterns",
  "tools",
  "tasks",
  "daily",
  "context",
  "specifications",
  "architecture",
  "plans",
  "manual-tests",
];

export const PROJECT_RECALL_SOURCES: RecallSource[] = [
  "decisions",
  "lessons",
  "patterns",
  "tools",
  "tasks",
  "daily",
  "context",
];

export interface RecallInput {
  project: string;
  area?: string;
  files?: string[];
  keywords?: string[];
  tags?: string[];
  sources?: RecallSource[];
  maxResults?: number;
  excerptLength?: number;
  includeSuperseded?: boolean;
  taskId?: string;
}

export interface RecallHit {
  path: string;
  source: RecallSource;
  title: string;
  excerpt: string;
  score: number;
  needsReview?: boolean;
  status?: string;
}

export interface RecallResult {
  hits: RecallHit[];
}

interface ScoreParams {
  area?: string;
  files?: string[];
  keywords?: string[];
  tags?: string[];
  title: string;
  body: string;
  path: string;
  frontmatter?: Record<string, unknown> | null;
  contentTags?: string[];
  date?: string;
}

function hasQueryFilters(input: RecallInput): boolean {
  return Boolean(
    input.area ||
      input.files?.length ||
      input.keywords?.length ||
      input.tags?.length,
  );
}

function daysSince(dateString: string): number | null {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function scoreRecallHit(params: ScoreParams): number {
  let score = hasQueryFilters({
    area: params.area,
    files: params.files,
    keywords: params.keywords,
    tags: params.tags,
  } as RecallInput)
    ? 0
    : 1;

  const areaLower = params.area?.toLowerCase();
  if (areaLower) {
    const fmArea = String(params.frontmatter?.area ?? "").toLowerCase();
    if (fmArea.includes(areaLower)) score += 100;
    if (params.title.toLowerCase().includes(areaLower)) score += 80;
    if (params.body.toLowerCase().includes(areaLower)) score += 40;
    if (params.path.toLowerCase().includes(areaLower)) score += 30;
  }

  for (const fileFragment of params.files ?? []) {
    const fragment = fileFragment.toLowerCase();
    if (params.path.toLowerCase().includes(fragment)) score += 80;
    const fmFiles = String(params.frontmatter?.files ?? "").toLowerCase();
    if (fmFiles.includes(fragment)) score += 80;
  }

  for (const keyword of params.keywords ?? []) {
    const keywordLower = keyword.toLowerCase();
    if (params.title.toLowerCase().includes(keywordLower)) score += 50;
    if (params.body.toLowerCase().includes(keywordLower)) score += 20;
  }

  for (const tag of params.tags ?? []) {
    const tagLower = tag.replace(/^#/, "").toLowerCase();
    if (
      (params.contentTags ?? []).some(
        (contentTag) => contentTag.toLowerCase() === tagLower,
      )
    ) {
      score += 60;
    }
  }

  if (params.date) {
    const ageDays = daysSince(params.date);
    if (ageDays !== null) {
      if (ageDays <= 7) score += 30;
      else if (ageDays <= 30) score += 15;
      else if (ageDays <= 90) score += 5;
    }
  }

  return score;
}

function capMaxResults(maxResults?: number): number {
  return Math.min(Math.max(maxResults ?? 20, 1), 50);
}

async function recallSectionFile(
  reader: MemoryVaultReader,
  path: string,
  source: RecallSource,
  input: RecallInput,
  excerptLength: number,
): Promise<RecallHit[]> {
  const content = await reader.read(path);
  if (!content) {
    return [];
  }

  const hits: RecallHit[] = [];
  const sections = splitSections(content);
  if (sections.length === 0) {
    const score = scoreRecallHit({
      area: input.area,
      files: input.files,
      keywords: input.keywords,
      tags: input.tags,
      title: path.split("/").pop() ?? path,
      body: content,
      path,
      contentTags: extractTags(content),
      date: extractDateFromPath(path),
    });
    if (score > 0) {
      hits.push({
        path,
        source,
        title: path.split("/").pop() ?? path,
        excerpt: excerpt(content, excerptLength),
        score,
      });
    }
    return hits;
  }

  for (const section of sections) {
    if (section.level === 1 && !section.body) {
      continue;
    }
    const title = section.heading || path.split("/").pop() || path;
    const body = section.body || content;
    const score = scoreRecallHit({
      area: input.area,
      files: input.files,
      keywords: input.keywords,
      tags: input.tags,
      title,
      body,
      path,
      contentTags: extractTags(body),
      date: extractDateFromPath(path),
    });
    if (score <= 0) {
      continue;
    }
    hits.push({
      path,
      source,
      title,
      excerpt: excerpt(body, excerptLength),
      score,
    });
  }
  return hits;
}

function extractDateFromPath(filePath: string): string | undefined {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(filePath);
  return match?.[1];
}

export async function recallProjectMemory(
  reader: MemoryVaultReader,
  input: RecallInput,
  sources: RecallSource[],
  excerptLength: number,
): Promise<RecallHit[]> {
  const hits: RecallHit[] = [];
  const allPaths = await reader.listPaths();
  const prefix = projectMemoryPrefix(input.project);

  if (sources.includes("context")) {
    const path = conversationContextPath(input.project);
    const content = await reader.read(path);
    if (content) {
      const score = scoreRecallHit({
        area: input.area,
        files: input.files,
        keywords: input.keywords,
        tags: input.tags,
        title: "Conversation context",
        body: content,
        path,
        contentTags: extractTags(content),
      });
      if (score > 0) {
        hits.push({
          path,
          source: "context",
          title: "Conversation context",
          excerpt: excerpt(content, excerptLength),
          score,
        });
      }
    }
  }

  const sectionSources: Array<{
    source: RecallSource;
    relativePath: string;
  }> = [
    { source: "lessons", relativePath: PROJECT_FILES.lessonsLearned },
    { source: "patterns", relativePath: PROJECT_FILES.codePatterns },
    { source: "tools", relativePath: PROJECT_FILES.toolsReference },
  ];

  for (const { source, relativePath } of sectionSources) {
    if (!sources.includes(source)) {
      continue;
    }
    const path = projectRelativePath(input.project, relativePath);
    hits.push(
      ...(await recallSectionFile(
        reader,
        path,
        source,
        input,
        excerptLength,
      )),
    );
  }

  if (sources.includes("tasks")) {
    const indexPath = tasksIndexPath(input.project);
    const indexContent = await reader.read(indexPath);
    for (const task of parseTasksIndex(indexContent)) {
      const score = scoreRecallHit({
        area: input.area,
        files: input.files,
        keywords: input.keywords,
        tags: input.tags,
        title: task.name,
        body: `${task.status} ${task.outcome} ${task.note}`,
        path: indexPath,
        date: task.started || task.finished,
      });
      if (score > 0) {
        hits.push({
          path: indexPath,
          source: "tasks",
          title: task.name,
          excerpt: excerpt(
            `${task.status}: ${task.outcome || task.note || task.name}`,
            excerptLength,
          ),
          score,
          status: task.status,
        });
      }
    }
  }

  if (sources.includes("daily")) {
    const dailyPaths = allPaths
      .filter(
        (filePath) =>
          filePath.startsWith(`${prefix}daily/`) && filePath.endsWith(".md"),
      )
      .sort()
      .reverse();
    for (const path of dailyPaths) {
      const content = await reader.read(path);
      if (!content) continue;
      const date = extractDateFromPath(path);
      const score = scoreRecallHit({
        area: input.area,
        files: input.files,
        keywords: input.keywords,
        tags: input.tags,
        title: `Daily log ${date ?? ""}`.trim(),
        body: content,
        path,
        contentTags: extractTags(content),
        date,
      });
      if (score > 0) {
        hits.push({
          path,
          source: "daily",
          title: `Daily log ${date ?? ""}`.trim(),
          excerpt: excerpt(content, excerptLength),
          score,
        });
      }
    }
  }

  if (sources.includes("decisions")) {
    const indexPath = decisionsIndexPath(input.project);
    const indexContent = await reader.read(indexPath);
    for (const row of parseDecisionsIndex(indexContent)) {
      const status = row.status.toLowerCase();
      if (status === "superseded" && !input.includeSuperseded) {
        continue;
      }

      const linkedTargets = extractWikilinkTargets(row.note);
      const decisionPath =
        linkedTargets
          .map((target) => resolveVaultLink(target, allPaths))
          .find((resolved) => resolved?.includes("/decisions/")) ??
        undefined;
      const decisionContent = decisionPath
        ? await reader.read(decisionPath)
        : null;
      const frontmatter = decisionContent
        ? parseFrontmatter(decisionContent)
        : null;
      const body = decisionContent ?? `${row.decision} ${row.area} ${row.note}`;
      const score = scoreRecallHit({
        area: input.area,
        files: input.files,
        keywords: input.keywords,
        tags: input.tags,
        title: row.decision,
        body,
        path: decisionPath ?? indexPath,
        frontmatter,
        contentTags: decisionContent ? extractTags(decisionContent) : [],
        date: row.decided,
      });
      if (score > 0) {
        hits.push({
          path: decisionPath ?? indexPath,
          source: "decisions",
          title: row.decision,
          excerpt: excerpt(body, excerptLength),
          score,
          status: row.status,
          needsReview:
            status === "active" && isDecisionNeedsReview(row.decided),
        });
      }
    }
  }

  return hits;
}

export async function memoryRecall(
  reader: MemoryVaultReader,
  input: RecallInput,
): Promise<RecallResult> {
  const sources = input.sources?.length ? input.sources : ALL_RECALL_SOURCES;
  const excerptLength = capExcerptLength(input.excerptLength);
  const projectSources = sources.filter((source) =>
    PROJECT_RECALL_SOURCES.includes(source),
  );

  const hits = await recallProjectMemory(
    reader,
    input,
    projectSources,
    excerptLength,
  );

  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return { hits: hits.slice(0, capMaxResults(input.maxResults)) };
}
