/** Extract task-id prefix from artifact folder names like TASK-123-feature-name. */

const TASK_ID_HEURISTIC = /^(TASK-\d+)(?:-.+)?$/i;
const GENERIC_ID_HEURISTIC = /^([A-Z][A-Z0-9]*-\d+)(?:-.+)?$/i;

function baseName(folderName: string): string {
  return folderName.replace(/\\/g, "/").split("/").pop() ?? folderName;
}

export function folderMatchesTaskId(folderName: string, taskId: string): boolean {
  const base = baseName(folderName);
  return base === taskId || base.startsWith(`${taskId}-`);
}

export function extractTaskIdFromFolderName(
  folderName: string,
  knownTaskId?: string,
): string | null {
  const base = baseName(folderName);
  if (knownTaskId && folderMatchesTaskId(base, knownTaskId)) {
    return knownTaskId;
  }

  const taskMatch = TASK_ID_HEURISTIC.exec(base);
  if (taskMatch) return taskMatch[1];

  const genericMatch = GENERIC_ID_HEURISTIC.exec(base);
  if (genericMatch) return genericMatch[1];

  return null;
}

export function extractFeatureSlugFromFolderName(
  folderName: string,
  taskId?: string,
): string | null {
  const base = baseName(folderName);
  const resolvedTaskId = taskId ?? extractTaskIdFromFolderName(base);
  if (!resolvedTaskId || !folderMatchesTaskId(base, resolvedTaskId)) {
    return null;
  }
  if (base === resolvedTaskId) return null;
  return base.slice(resolvedTaskId.length + 1) || null;
}
