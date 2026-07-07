import { capExcerptLength, excerpt } from "./excerpt";
import {
  projectMemoryPrefix,
  projectRelativePath,
} from "./paths";
import { ARTIFACT_ROOTS, PROJECT_FILES, PROJECT_SUBDIRS } from "./schema";
import type { MemoryVaultReader } from "./vaultReader";

export type FindType =
  | "decisions"
  | "lessons"
  | "patterns"
  | "tasks"
  | "daily"
  | "specifications"
  | "architecture"
  | "plans"
  | "manual-tests"
  | "all";

export const ALL_FIND_TYPES: FindType[] = [
  "decisions",
  "lessons",
  "patterns",
  "tasks",
  "daily",
  "specifications",
  "architecture",
  "plans",
  "manual-tests",
];

export interface FindInput {
  project: string;
  query: string;
  types?: FindType[];
  maxResults?: number;
  excerptLength?: number;
}

export interface FindHit {
  path: string;
  type: FindType;
  excerpt: string;
  score: number;
}

export interface FindResult {
  hits: FindHit[];
}

const DEFAULT_MAX_RESULTS = 10;
const MAX_FIND_RESULTS = 50;
const DEFAULT_FIND_EXCERPT_LENGTH = 120;
const FIND_CONTEXT_PADDING = 40;

function capMaxResults(maxResults?: number): number {
  return Math.min(Math.max(maxResults ?? DEFAULT_MAX_RESULTS, 1), MAX_FIND_RESULTS);
}

const PROJECT_TYPE_PATHS: Record<
  Exclude<FindType, "all" | "specifications" | "architecture" | "plans" | "manual-tests">,
  (project: string) => string[]
> = {
  decisions: (project) => [
    projectRelativePath(project, PROJECT_FILES.decisionsIndex),
    projectRelativePath(project, `${PROJECT_SUBDIRS.decisions}/`),
  ],
  lessons: (project) => [
    projectRelativePath(project, PROJECT_FILES.lessonsLearned),
  ],
  patterns: (project) => [
    projectRelativePath(project, PROJECT_FILES.codePatterns),
  ],
  tasks: (project) => [
    projectRelativePath(project, PROJECT_FILES.tasksIndex),
    projectRelativePath(project, `${PROJECT_SUBDIRS.tasks}/`),
  ],
  daily: (project) => [
    projectRelativePath(project, `${PROJECT_SUBDIRS.daily}/`),
  ],
};

const ARTIFACT_TYPE_PREFIXES: Partial<Record<FindType, string>> = {
  specifications: `${ARTIFACT_ROOTS.specifications}/`,
  architecture: `${ARTIFACT_ROOTS.architecture}/`,
  plans: `${ARTIFACT_ROOTS.plans}/`,
  "manual-tests": `${ARTIFACT_ROOTS.manualTestPlans}/`,
};

function normalizeTypes(types?: FindType[]): FindType[] {
  if (!types?.length || types.includes("all")) {
    return ALL_FIND_TYPES;
  }
  return types;
}

function pathMatchesType(filePath: string, project: string, type: FindType): boolean {
  if (type === "all") {
    return false;
  }

  const artifactPrefix = ARTIFACT_TYPE_PREFIXES[type];
  if (artifactPrefix) {
    if (!filePath.startsWith(artifactPrefix)) {
      return false;
    }
    if (type === "manual-tests") {
      return filePath.endsWith("/plan.md") || filePath.endsWith("/insomnia.json");
    }
    return filePath.endsWith(".md");
  }

  switch (type) {
    case "decisions":
    case "lessons":
    case "patterns":
    case "tasks":
    case "daily": {
      const prefixes = PROJECT_TYPE_PATHS[type](project);
      return prefixes.some((prefix) =>
        prefix.endsWith("/") ? filePath.startsWith(prefix) : filePath === prefix,
      );
    }
    default:
      return false;
  }
}

function isPathInScope(filePath: string, project: string, types: FindType[]): boolean {
  const projectPrefix = projectMemoryPrefix(project);
  if (filePath.startsWith(projectPrefix)) {
    return types.some((type) => pathMatchesType(filePath, project, type));
  }

  return types.some((type) => {
    const artifactPrefix = ARTIFACT_TYPE_PREFIXES[type];
    return artifactPrefix ? filePath.startsWith(artifactPrefix) : false;
  });
}

function scoreMatch(content: string, query: string): number {
  const haystack = content.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return 0;
  }

  let score = 0;
  if (haystack.includes(needle)) {
    score += needle.length * 2;
  }

  for (const term of needle.split(/\s+/).filter(Boolean)) {
    if (haystack.includes(term)) {
      score += term.length;
    }
  }

  return score;
}

function excerptAroundMatch(content: string, query: string, maxLength: number): string {
  const needle = query.trim().toLowerCase();
  const lower = content.toLowerCase();
  const index = needle ? lower.indexOf(needle) : -1;
  if (index === -1) {
    return excerpt(content, maxLength);
  }

  const start = Math.max(0, index - FIND_CONTEXT_PADDING);
  const end = Math.min(
    content.length,
    index + needle.length + FIND_CONTEXT_PADDING,
  );
  const slice = content.slice(start, end).trim();
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return excerpt(`${prefix}${slice}${suffix}`, maxLength);
}

function resolveHitType(
  filePath: string,
  project: string,
  types: FindType[],
): FindType {
  for (const type of types) {
    if (type !== "all" && pathMatchesType(filePath, project, type)) {
      return type;
    }
  }
  return "daily";
}

export async function memoryFind(
  reader: MemoryVaultReader,
  input: FindInput,
): Promise<FindResult> {
  const types = normalizeTypes(input.types);
  const maxResults = capMaxResults(input.maxResults);
  const excerptLength = capExcerptLength(
    input.excerptLength ?? DEFAULT_FIND_EXCERPT_LENGTH,
  );
  const allPaths = await reader.listPaths();
  const hits: FindHit[] = [];

  for (const filePath of allPaths) {
    if (!isPathInScope(filePath, input.project, types)) {
      continue;
    }

    const content = await reader.read(filePath);
    if (!content) {
      continue;
    }

    const score = scoreMatch(content, input.query);
    if (score <= 0) {
      continue;
    }

    hits.push({
      path: filePath,
      type: resolveHitType(filePath, input.project, types),
      excerpt: excerptAroundMatch(content, input.query, excerptLength),
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return { hits: hits.slice(0, maxResults) };
}
