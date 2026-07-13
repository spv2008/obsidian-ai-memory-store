import { posix } from "path";

import {
  ARTIFACT_FILES,
  ARTIFACT_ROOTS,
  DATE_PATTERN,
  MEMORY_ROOT,
  PROJECT_FILES,
  PROJECT_SUBDIRS,
  SHORT_TERM_FILES,
  SHORT_TERM_ROOT,
} from "./schema";

export class InvalidMemoryPathError extends Error {}

function normalizeSegment(segment: string): string {
  const trimmed = segment.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("..") || trimmed.startsWith("/")) {
    throw new InvalidMemoryPathError(`Invalid path segment: ${segment}`);
  }
  return trimmed;
}

/** Returns true when `value` is a safe project / namespace slug. */
export function isValidProjectNamespace(value: string): boolean {
  try {
    normalizeSegment(value);
    return true;
  } catch {
    return false;
  }
}

export function projectRoot(project: string): string {
  return `${MEMORY_ROOT}/${normalizeSegment(project)}`;
}

export function projectRelativePath(project: string, relativePath: string): string {
  const root = projectRoot(project);
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const resolved = posix.resolve("/vault", root, normalized);
  if (!resolved.startsWith(`/vault/${root}/`) && resolved !== `/vault/${root}`) {
    throw new InvalidMemoryPathError(
      `Path escapes project root: ${relativePath}`,
    );
  }
  return posix.join(root, normalized);
}

export function conversationContextPath(): string {
  return `${SHORT_TERM_ROOT}/${SHORT_TERM_FILES.conversationContext}`;
}

export function currentTaskPath(): string {
  return `${SHORT_TERM_ROOT}/${SHORT_TERM_FILES.currentTask}`;
}

export function tasksIndexPath(project: string): string {
  return projectRelativePath(project, PROJECT_FILES.tasksIndex);
}

export function decisionsIndexPath(project: string): string {
  return projectRelativePath(project, PROJECT_FILES.decisionsIndex);
}

export function dailyLogPath(project: string, date: string): string {
  if (!DATE_PATTERN.test(date)) {
    throw new InvalidMemoryPathError(`Invalid date: ${date}`);
  }
  return projectRelativePath(project, `${PROJECT_SUBDIRS.daily}/${date}.md`);
}

export function decisionNotePath(
  project: string,
  decided: string,
  slug: string,
): string {
  if (!DATE_PATTERN.test(decided)) {
    throw new InvalidMemoryPathError(`Invalid decision date: ${decided}`);
  }
  const safeSlug = normalizeSegment(slug);
  return projectRelativePath(
    project,
    `${PROJECT_SUBDIRS.decisions}/${decided}-${safeSlug}.md`,
  );
}

export function archivedTaskPath(
  project: string,
  date: string,
  slug: string,
  taskId?: string,
): string {
  if (!DATE_PATTERN.test(date)) {
    throw new InvalidMemoryPathError(`Invalid date: ${date}`);
  }
  const safeSlug = normalizeSegment(slug);
  const suffix = taskId ? `-${normalizeSegment(taskId)}` : "";
  return projectRelativePath(
    project,
    `${PROJECT_SUBDIRS.tasks}/${date}-${safeSlug}${suffix}.md`,
  );
}

export function specificationPath(taskId: string, featureName: string): string {
  return `${ARTIFACT_ROOTS.specifications}/${normalizeSegment(taskId)}-${normalizeSegment(featureName)}/${ARTIFACT_FILES.specification}`;
}

export function architecturePath(taskId: string, featureName: string): string {
  return `${ARTIFACT_ROOTS.architecture}/${normalizeSegment(taskId)}-${normalizeSegment(featureName)}/${ARTIFACT_FILES.architecture}`;
}

export function planFolderPath(taskId: string, briefDescription: string): string {
  return `${ARTIFACT_ROOTS.plans}/${normalizeSegment(taskId)}-${normalizeSegment(briefDescription)}`;
}

export function planMasterPath(taskId: string, briefDescription: string): string {
  return `${planFolderPath(taskId, briefDescription)}/${ARTIFACT_FILES.planMaster}`;
}

export function planPhasePath(
  taskId: string,
  briefDescription: string,
  phaseFileName: string,
): string {
  return `${planFolderPath(taskId, briefDescription)}/${normalizeSegment(phaseFileName)}`;
}

export function manualTestPlanPath(featureName: string): string {
  return `${ARTIFACT_ROOTS.manualTestPlans}/${normalizeSegment(featureName)}/${ARTIFACT_FILES.manualTestPlan}`;
}

export function manualTestInsomniaPath(featureName: string): string {
  return `${ARTIFACT_ROOTS.manualTestPlans}/${normalizeSegment(featureName)}/${ARTIFACT_FILES.manualTestInsomnia}`;
}

export function projectMemoryPrefix(project: string): string {
  return `${projectRoot(project)}/`;
}

/** Resolve durable namespace: explicit project, else defaultProject. */
export function resolveProjectNamespace(
  project: string | undefined,
  defaultProject?: string,
): string | undefined {
  const explicit = project?.trim();
  if (explicit) {
    return explicit;
  }
  const fallback = defaultProject?.trim();
  return fallback || undefined;
}

export function requireProjectNamespace(
  project: string | undefined,
  defaultProject?: string,
): string {
  const resolved = resolveProjectNamespace(project, defaultProject);
  if (!resolved) {
    throw new InvalidMemoryPathError(
      "project is required (or set defaultProject in plugin settings)",
    );
  }
  return resolved;
}
