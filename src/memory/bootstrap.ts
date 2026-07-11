import { capExcerptLength, excerpt } from "./excerpt";
import {
  classifyArtifactPath,
  resolveVaultLink,
  type ActiveWorkKind,
} from "./linkResolve";
import {
  conversationContextPath,
  currentTaskPath,
  dailyLogPath,
  decisionsIndexPath,
  projectMemoryPrefix,
  tasksIndexPath,
} from "./paths";
import {
  isDecisionNeedsReview,
  parseDecisionsIndex,
  type DecisionIndexRow,
} from "./parse/decisionsIndex";
import { extractWikilinks } from "./parse/wikilinks";
import { parseTasksIndex, type TaskIndexRow } from "./parse/tasksIndex";
import { DATE_PATTERN } from "./schema";
import type { MemoryVaultReader } from "./vaultReader";

export interface BootstrapInput {
  project: string;
  taskId?: string;
  excerptLength?: number;
}

export interface ActiveWorkItem {
  path: string;
  linkTarget: string;
  kind: ActiveWorkKind;
  excerpt: string;
}

export interface LatestDaily {
  date: string;
  path: string;
  content: string;
}

export interface BootstrapResult {
  project: string;
  projectExists: boolean;
  conversationContext: string | null;
  currentTask: string | null;
  tasksIndex: string | null;
  parkedTasks: TaskIndexRow[];
  activeTask: TaskIndexRow | null;
  decisionsIndex: string | null;
  activeDecisions: DecisionIndexRow[];
  needsReviewDecisions: DecisionIndexRow[];
  latestDaily: LatestDaily | null;
  activeWork: ActiveWorkItem[];
}

export async function findLatestDaily(
  reader: MemoryVaultReader,
  project: string,
  allPaths: string[],
  excerptLength: number,
): Promise<LatestDaily | null> {
  const prefix = `${projectMemoryPrefix(project)}daily/`;
  const dates = allPaths
    .filter((filePath) => filePath.startsWith(prefix))
    .map((filePath) => filePath.slice(prefix.length).replace(/\.md$/, ""))
    .filter((date) => DATE_PATTERN.test(date))
    .sort()
    .reverse();

  if (dates.length === 0) {
    return null;
  }

  const date = dates[0];
  const filePath = dailyLogPath(project, date);
  const content = await reader.read(filePath);
  if (!content) {
    return null;
  }

  return { date, path: filePath, content: excerpt(content, excerptLength) };
}

export async function buildActiveWork(
  reader: MemoryVaultReader,
  currentTask: string | null,
  allPaths: string[],
  excerptLength: number,
): Promise<ActiveWorkItem[]> {
  if (!currentTask) {
    return [];
  }

  const items: ActiveWorkItem[] = [];
  for (const link of extractWikilinks(currentTask)) {
    const resolved = resolveVaultLink(link.target, allPaths);
    if (!resolved) {
      continue;
    }
    const content = await reader.read(resolved);
    if (!content) {
      continue;
    }
    items.push({
      path: resolved,
      linkTarget: link.target,
      kind: classifyArtifactPath(resolved),
      excerpt: excerpt(content, excerptLength),
    });
  }
  return items;
}

export async function memoryBootstrap(
  reader: MemoryVaultReader,
  input: BootstrapInput,
): Promise<BootstrapResult> {
  const excerptLength = capExcerptLength(input.excerptLength);
  const prefix = projectMemoryPrefix(input.project);
  const allPaths = await reader.listPaths();
  const projectExists = allPaths.some((filePath) => filePath.startsWith(prefix));

  const [
    conversationContext,
    currentTask,
    tasksIndex,
    decisionsIndex,
  ] = await Promise.all([
    reader.read(conversationContextPath()),
    reader.read(currentTaskPath()),
    reader.read(tasksIndexPath(input.project)),
    reader.read(decisionsIndexPath(input.project)),
  ]);

  const tasks = parseTasksIndex(tasksIndex);
  const parkedTasks = tasks.filter(
    (task) => task.status.toLowerCase() === "parked",
  );
  const activeTask =
    tasks.find((task) => task.status.toLowerCase() === "active") ?? null;

  const decisions = parseDecisionsIndex(decisionsIndex);
  const activeDecisions = decisions.filter(
    (decision) => decision.status.toLowerCase() === "active",
  );
  const needsReviewDecisions = activeDecisions.filter((decision) =>
    isDecisionNeedsReview(decision.decided),
  );

  const latestDaily = projectExists
    ? await findLatestDaily(reader, input.project, allPaths, excerptLength)
    : null;
  const activeWork = await buildActiveWork(
    reader,
    currentTask,
    allPaths,
    excerptLength,
  );

  return {
    project: input.project,
    projectExists,
    conversationContext: conversationContext
      ? excerpt(conversationContext, excerptLength)
      : null,
    currentTask: currentTask ? excerpt(currentTask, excerptLength) : null,
    tasksIndex: tasksIndex ? excerpt(tasksIndex, excerptLength) : null,
    parkedTasks,
    activeTask,
    decisionsIndex: decisionsIndex
      ? excerpt(decisionsIndex, excerptLength)
      : null,
    activeDecisions,
    needsReviewDecisions,
    latestDaily,
    activeWork,
  };
}
