import {
  architecturePath,
  archivedTaskPath,
  conversationContextPath,
  currentTaskPath,
  dailyLogPath,
  decisionNotePath,
  InvalidMemoryPathError,
  manualTestInsomniaPath,
  manualTestPlanPath,
  planFolderPath,
  planMasterPath,
  planPhasePath,
  projectMemoryPrefix,
  projectRelativePath,
  projectRoot,
  specificationPath,
  tasksIndexPath,
} from "./paths";

describe("memory paths", () => {
  const project = "my-app";

  test("projectRoot", () => {
    expect(projectRoot(project)).toBe("memory/projects/my-app");
  });

  test("global short-term paths", () => {
    expect(conversationContextPath()).toBe(
      "memory/short-term/conversation.context.md",
    );
    expect(currentTaskPath()).toBe("memory/short-term/current-task.md");
  });

  test("project memory paths", () => {
    expect(tasksIndexPath(project)).toBe(
      "memory/projects/my-app/tasks/tasks-index.md",
    );
    expect(projectMemoryPrefix(project)).toBe("memory/projects/my-app/");
  });

  test("dated paths", () => {
    expect(dailyLogPath(project, "2026-07-06")).toBe(
      "memory/projects/my-app/daily/2026-07-06.md",
    );
    expect(decisionNotePath(project, "2026-01-12", "paired-session-writes")).toBe(
      "memory/projects/my-app/long-term/decisions/2026-01-12-paired-session-writes.md",
    );
    expect(archivedTaskPath(project, "2026-07-06", "auth-fix", "TASK-42")).toBe(
      "memory/projects/my-app/tasks/2026-07-06-auth-fix-TASK-42.md",
    );
  });

  test("artifact paths", () => {
    expect(specificationPath("TASK-42", "user-auth")).toBe(
      "specifications/TASK-42-user-auth/spec.md",
    );
    expect(architecturePath("TASK-42", "user-auth")).toBe(
      "architecture/TASK-42-user-auth/proposal.md",
    );
    expect(planFolderPath("TASK-42", "user-auth")).toBe(
      "plans/TASK-42-user-auth",
    );
    expect(planMasterPath("TASK-42", "user-auth")).toBe(
      "plans/TASK-42-user-auth/master-plan.md",
    );
    expect(planPhasePath("TASK-42", "user-auth", "01-foundation.md")).toBe(
      "plans/TASK-42-user-auth/01-foundation.md",
    );
    expect(manualTestPlanPath("user-auth")).toBe(
      "manual-test-plans/user-auth/plan.md",
    );
    expect(manualTestInsomniaPath("user-auth")).toBe(
      "manual-test-plans/user-auth/insomnia.json",
    );
  });

  test("rejects path traversal", () => {
    expect(() => projectRelativePath(project, "../secrets")).toThrow(
      InvalidMemoryPathError,
    );
    expect(() => dailyLogPath(project, "not-a-date")).toThrow(
      InvalidMemoryPathError,
    );
  });
});
