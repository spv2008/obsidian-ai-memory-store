import {
  memoryArchiveTask,
  memoryStartTask,
  buildCurrentTaskMarkdown,
  goalFromCurrentTask,
  isCurrentTaskEmpty,
  EMPTY_CURRENT_TASK,
  slugifyTaskName,
  todayIsoDate,
} from "./tasks";
import { memoryBootstrap } from "./bootstrap";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultWriter } from "./vaultWriter";

describe("memoryStartTask", () => {
  test("starts a task when current-task.md is empty", async () => {
    const writer = new MapVaultWriter({
      "memory/projects/demo/tasks/tasks-index.md": [
        "# Task Register: demo",
        "",
        "| Task | Started | Finished | Status | Outcome | Note |",
        "|---|---|---|---|---|---|",
        "",
      ].join("\n"),
      "memory/short-term/current-task.md": EMPTY_CURRENT_TASK,
    });

    const result = await memoryStartTask(writer, {
      project: "demo",
      name: "Write task lifecycle tools",
      goal: "Implement memory_start_task and memory_archive_task",
      taskId: "TASK-55",
      specLink: "specifications/TASK-55-task-lifecycle/spec",
    });

    expect(result.parkedArchivePath).toBeUndefined();
    const current = await writer.read(result.currentTaskPath);
    expect(current).toContain("Implement memory_start_task");
    expect(current).toContain("[[specifications/TASK-55-task-lifecycle/spec]]");
    const index = await writer.read(result.registerPath);
    expect(index).toContain("Write task lifecycle tools");
    expect(index).toContain("| active |");
  });

  test("parks the active task before starting a new one", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    const result = await memoryStartTask(writer, {
      project: "demo",
      name: "Implement memory write tools",
      goal: "Ship Phase 04 write path",
      taskId: "TASK-60",
    });

    expect(result.parkedArchivePath).toMatch(
      /memory\/projects\/demo\/tasks\/\d{4}-\d{2}-\d{2}-implement-memory-read-tools\.md$/,
    );
    const index = await writer.read(result.registerPath);
    expect(index).toContain("| Implement memory read tools |");
    expect(index).toContain("| parked |");
    expect(index).toContain("| Implement memory write tools |");
    expect(index).toContain("| active |");
    const current = await writer.read(result.currentTaskPath);
    expect(current).toContain("Ship Phase 04 write path");
  });
});

describe("memoryArchiveTask", () => {
  test("archives the current task as done and clears current-task.md", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    const archiveDate = todayIsoDate();
    const result = await memoryArchiveTask(writer, {
      project: "demo",
      status: "done",
      slug: "memory-read-tools",
      outcome: "Read tools shipped in Phase 03",
    });

    expect(result.archivePath).toBe(
      `memory/projects/demo/tasks/${archiveDate}-memory-read-tools.md`,
    );
    const archived = await writer.read(result.archivePath);
    expect(archived).toContain("status: done");
    expect(archived).toContain("Implement memory read tools");
    const current = await writer.read(
      "memory/short-term/current-task.md",
    );
    expect(isCurrentTaskEmpty(current)).toBe(true);
    const index = await writer.read(result.registerPath);
    expect(index).toContain("| done |");
    expect(index).toContain("Read tools shipped in Phase 03");
    expect(index).toContain(`[[${archiveDate}-memory-read-tools]]`);
  });

  test("updates the active register row when older rows share the task name", async () => {
    const writer = new MapVaultWriter({
      ...loadFixtureVault("demo"),
      "memory/projects/demo/tasks/tasks-index.md": [
        "# Task Register: demo",
        "",
        "| Task | Started | Finished | Status | Outcome | Note |",
        "|---|---|---|---|---|---|",
        "| Implement memory read tools | 2026-01-01 | 2026-01-02 | done | Shipped | [[2026-01-02-old]] |",
        "| Implement memory read tools | 2026-07-06 | | active | | |",
        "",
      ].join("\n"),
    });

    await memoryArchiveTask(writer, {
      project: "demo",
      status: "done",
      slug: "memory-read-tools",
      outcome: "Current active task finished",
    });

    const index = await writer.read("memory/projects/demo/tasks/tasks-index.md");
    expect(index).toContain(
      "| Implement memory read tools | 2026-01-01 | 2026-01-02 | done | Shipped | [[2026-01-02-old]] |",
    );
    expect(index).toContain("Current active task finished");
    expect(index).toContain("| done |");
  });

  test("archives the current task as parked with resume notes", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    const archiveDate = todayIsoDate();
    const result = await memoryArchiveTask(writer, {
      project: "demo",
      status: "parked",
      slug: "memory-read-tools",
      resumeNotes: "Line one\n# not a heading: value",
    });

    const archived = await writer.read(result.archivePath);
    expect(archived).toContain('resume-notes: "Line one\\n# not a heading: value"');
    expect(archived).toContain("status: parked");
    expect(archived).not.toContain("finished:");
    const index = await writer.read(result.registerPath);
    expect(index).toContain("| parked |");
    expect(index).toContain(`[[${archiveDate}-memory-read-tools]]`);
  });
});

describe("task helpers", () => {
  test("buildCurrentTaskMarkdown follows the skill template", () => {
    const markdown = buildCurrentTaskMarkdown({
      project: "demo",
      name: "Example",
      goal: "Do the thing",
      planLink: "plans/TASK-1-example/master-plan",
    });
    expect(markdown).toContain("**Goal**: Do the thing");
    expect(markdown).toContain("## Following");
    expect(markdown).toContain("## Sub-tasks");
    expect(markdown).toContain("[[plans/TASK-1-example/master-plan]]");
  });

  test("slugifyTaskName produces safe archive slugs", () => {
    expect(slugifyTaskName("Implement memory read tools")).toBe(
      "implement-memory-read-tools",
    );
  });

  test("treats blank goal lines as empty even with following sections", () => {
    const content = `# Current Task

**Goal**:

## Following
- Spec: [[specifications/TASK-1/spec]]

## Sub-tasks
`;
    expect(isCurrentTaskEmpty(content)).toBe(true);
    expect(goalFromCurrentTask(content)).toBeNull();
  });
});

describe("task lifecycle integration", () => {
  test("start, archive done, start new, and park previous task", async () => {
    const writer = new MapVaultWriter({
      "memory/projects/demo/tasks/tasks-index.md": [
        "# Task Register: demo",
        "",
        "| Task | Started | Finished | Status | Outcome | Note |",
        "|---|---|---|---|---|---|",
        "",
      ].join("\n"),
      "memory/short-term/current-task.md": EMPTY_CURRENT_TASK,
    });

    await memoryStartTask(writer, {
      project: "demo",
      name: "First task",
      goal: "Complete the first task",
    });
    await memoryArchiveTask(writer, {
      project: "demo",
      status: "done",
      slug: "first-task",
      outcome: "Finished first",
    });

    let bootstrap = await memoryBootstrap(writer, { project: "demo" });
    expect(bootstrap.activeTask).toBeNull();
    expect(isCurrentTaskEmpty(bootstrap.currentTask)).toBe(true);

    await memoryStartTask(writer, {
      project: "demo",
      name: "Second task",
      goal: "Complete the second task",
    });
    await memoryStartTask(writer, {
      project: "demo",
      name: "Third task",
      goal: "Complete the third task",
    });

    bootstrap = await memoryBootstrap(writer, { project: "demo" });
    expect(bootstrap.activeTask?.name).toBe("Third task");
    expect(bootstrap.parkedTasks.map((task) => task.name)).toContain(
      "Second task",
    );
    const index = await writer.read("memory/projects/demo/tasks/tasks-index.md");
    expect(index).toContain("| done |");
    expect(index).toContain("| parked |");
    expect(index).toContain("| active |");
  });
});
