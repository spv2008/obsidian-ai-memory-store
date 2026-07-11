import {
  appendRegisterRow,
  createEmptyRegisterTable,
  updateRegisterRow,
} from "./parse/registerTable";
import { parseTasksIndex } from "./parse/tasksIndex";
import {
  archivedTaskPath,
  currentTaskPath,
  tasksIndexPath,
} from "./paths";
import type { MemoryVaultWriter } from "./vaultWriter";

export class NoActiveTaskError extends Error {}
export class CurrentTaskEmptyError extends Error {}
export class DuplicateArchiveError extends Error {}

export interface StartTaskInput {
  project: string;
  name: string;
  goal: string;
  taskId?: string;
  planLink?: string;
  specLink?: string;
  architectureLink?: string;
  parkCurrentIfActive?: boolean;
}

export interface ArchiveTaskInput {
  project: string;
  status: "parked" | "done" | "abandoned";
  slug: string;
  resumeNotes?: string;
  outcome?: string;
  taskId?: string;
}

export interface StartTaskResult {
  currentTaskPath: string;
  registerPath: string;
  parkedArchivePath?: string;
}

export interface ArchiveTaskResult {
  archivePath: string;
  registerPath: string;
}

export const EMPTY_CURRENT_TASK = `# Current Task

**Goal**: 

## Following

## Sub-tasks

`;

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function slugifyTaskName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "task";
}

export function goalFromCurrentTask(content: string): string | null {
  const match = /^\*\*Goal\*\*:[ \t]*(.*)$/m.exec(content);
  const text = match?.[1]?.trim();
  return text || null;
}

export function isCurrentTaskEmpty(content: string | null): boolean {
  if (!content?.trim()) {
    return true;
  }
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (normalized === EMPTY_CURRENT_TASK.trim()) {
    return true;
  }
  return !goalFromCurrentTask(normalized);
}

function formatWikilink(link: string): string {
  return link.startsWith("[[") ? link : `[[${link}]]`;
}

export function buildCurrentTaskMarkdown(input: StartTaskInput): string {
  const following: string[] = [];
  if (input.specLink) {
    following.push(`- Spec: ${formatWikilink(input.specLink)}`);
  }
  if (input.planLink) {
    following.push(`- Plan: ${formatWikilink(input.planLink)}`);
  }
  if (input.architectureLink) {
    following.push(`- Architecture: ${formatWikilink(input.architectureLink)}`);
  }

  const lines = [
    "# Current Task",
    "",
    `**Goal**: ${input.goal}`,
    "",
    "## Following",
    ...(following.length > 0 ? following : [""]),
    "",
    "## Sub-tasks",
    "- [ ] ",
    "",
  ];
  return lines.join("\n");
}

function archiveNoteLink(date: string, slug: string, taskId?: string): string {
  return taskId ? `[[${date}-${slug}-${taskId}]]` : `[[${date}-${slug}]]`;
}

function yamlQuotedValue(value: string): string {
  return JSON.stringify(value);
}

function buildArchivedTaskNote(
  currentContent: string,
  input: ArchiveTaskInput & { started: string; finished?: string },
): string {
  const finished =
    input.status === "parked" ? "" : (input.finished ?? todayIsoDate());
  const lines = [
    "---",
    "type: task",
    `status: ${input.status}`,
    `started: ${input.started}`,
    ...(finished ? [`finished: ${finished}`] : []),
    ...(input.taskId ? [`task-id: ${yamlQuotedValue(input.taskId)}`] : []),
    ...(input.resumeNotes
      ? [`resume-notes: ${yamlQuotedValue(input.resumeNotes)}`]
      : []),
    "---",
    "",
    currentContent.trim(),
    "",
  ];
  return lines.join("\n");
}

async function ensureTasksIndex(
  writer: MemoryVaultWriter,
  project: string,
): Promise<string> {
  const indexPath = tasksIndexPath(project);
  const existing = await writer.read(indexPath);
  if (existing) {
    return existing;
  }
  const created = createEmptyRegisterTable(`Task Register: ${project}`, [
    "Task",
    "Started",
    "Finished",
    "Status",
    "Outcome",
    "Note",
  ]);
  await writer.write(indexPath, created);
  return created;
}

function registerRowForTask(
  name: string,
  started: string,
  taskId?: string,
): string[] {
  return [name, started, "", "active", "", taskId ? `[[${taskId}]]` : ""];
}

function taskNameFromCurrentTask(content: string): string | null {
  return goalFromCurrentTask(content);
}

export async function memoryArchiveTask(
  writer: MemoryVaultWriter,
  input: ArchiveTaskInput,
): Promise<ArchiveTaskResult> {
  const currentPath = currentTaskPath();
  const currentContent = await writer.read(currentPath);
  if (isCurrentTaskEmpty(currentContent)) {
    throw new CurrentTaskEmptyError("current-task.md is empty");
  }

  const indexPath = tasksIndexPath(input.project);
  const indexContent = await ensureTasksIndex(writer, input.project);
  const tasks = parseTasksIndex(indexContent);
  const activeTask =
    tasks.find((task) => task.status.toLowerCase() === "active") ?? null;
  if (!activeTask) {
    throw new NoActiveTaskError("No active task in tasks-index.md");
  }

  const archiveDate = todayIsoDate();
  const archivePath = archivedTaskPath(
    input.project,
    archiveDate,
    input.slug,
    input.taskId,
  );
  if (await writer.exists(archivePath)) {
    throw new DuplicateArchiveError(`Archive already exists: ${archivePath}`);
  }

  const started = activeTask.started || archiveDate;
  await writer.write(
    archivePath,
    buildArchivedTaskNote(currentContent ?? "", {
      ...input,
      started,
      finished: archiveDate,
    }),
  );

  const finishedDate = input.status === "parked" ? "" : archiveDate;
  const updatedIndex = updateRegisterRow(
    indexContent,
    "Status",
    "active",
    (record) => {
      const cells = [...record.cells];
      cells[2] = finishedDate;
      cells[3] = input.status;
      cells[4] = input.outcome ?? "";
      cells[5] = archiveNoteLink(archiveDate, input.slug, input.taskId);
      return cells;
    },
  );
  await writer.write(indexPath, updatedIndex);
  await writer.write(currentPath, EMPTY_CURRENT_TASK);

  return { archivePath, registerPath: indexPath };
}

export async function memoryStartTask(
  writer: MemoryVaultWriter,
  input: StartTaskInput,
): Promise<StartTaskResult> {
  const currentPath = currentTaskPath();
  const indexPath = tasksIndexPath(input.project);
  const parkCurrent = input.parkCurrentIfActive ?? true;
  let parkedArchivePath: string | undefined;

  const currentContent = await writer.read(currentPath);
  if (parkCurrent && !isCurrentTaskEmpty(currentContent)) {
    const indexContent = await ensureTasksIndex(writer, input.project);
    const tasks = parseTasksIndex(indexContent);
    const activeTask =
      tasks.find((task) => task.status.toLowerCase() === "active") ?? null;
    const parkName =
      activeTask?.name ?? taskNameFromCurrentTask(currentContent ?? "") ?? "parked-task";
    const archiveResult = await memoryArchiveTask(writer, {
      project: input.project,
      status: "parked",
      slug: slugifyTaskName(parkName),
    });
    parkedArchivePath = archiveResult.archivePath;
  }

  await writer.write(currentPath, buildCurrentTaskMarkdown(input));

  const started = todayIsoDate();
  const indexContent = await ensureTasksIndex(writer, input.project);
  const updatedIndex = appendRegisterRow(
    indexContent,
    registerRowForTask(input.name, started, input.taskId),
  );
  await writer.write(indexPath, updatedIndex);

  return {
    currentTaskPath: currentPath,
    registerPath: indexPath,
    parkedArchivePath,
  };
}
