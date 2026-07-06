import { resolveWorkflowArtifacts } from "./resolve";

const ALL_PATHS = [
  "specifications/TASK-42-user-auth/spec.md",
  "architecture/TASK-42-user-auth/proposal.md",
  "plans/TASK-42-user-auth/master-plan.md",
  "plans/TASK-42-user-auth/01-foundation.md",
  "plans/TASK-42-user-auth/02-tools.md",
  "manual-test-plans/user-auth/plan.md",
  "manual-test-plans/user-auth/insomnia.json",
  "specifications/TASK-99-other/spec.md",
];

describe("resolveWorkflowArtifacts", () => {
  test("resolves full workflow chain for a task id", () => {
    const result = resolveWorkflowArtifacts("TASK-42", ALL_PATHS);
    expect(result).toMatchObject({
      taskId: "TASK-42",
      specification: "specifications/TASK-42-user-auth/spec.md",
      architecture: "architecture/TASK-42-user-auth/proposal.md",
      planFolder: "plans/TASK-42-user-auth",
      planMaster: "plans/TASK-42-user-auth/master-plan.md",
      featureName: "user-auth",
      manualTestPlan: "manual-test-plans/user-auth/plan.md",
      manualTestInsomnia: "manual-test-plans/user-auth/insomnia.json",
    });
    expect(result.planPhases).toEqual([
      "plans/TASK-42-user-auth/01-foundation.md",
      "plans/TASK-42-user-auth/02-tools.md",
    ]);
  });

  test("returns partial results when artifacts are missing", () => {
    const result = resolveWorkflowArtifacts("TASK-99", ALL_PATHS);
    expect(result.specification).toBe("specifications/TASK-99-other/spec.md");
    expect(result.architecture).toBeUndefined();
    expect(result.planMaster).toBeUndefined();
    expect(result.planPhases).toEqual([]);
    expect(result.manualTestPlan).toBeUndefined();
  });

  test("returns empty optional fields for unknown task", () => {
    const result = resolveWorkflowArtifacts("TASK-404", ALL_PATHS);
    expect(result.specification).toBeUndefined();
    expect(result.planPhases).toEqual([]);
  });
});
