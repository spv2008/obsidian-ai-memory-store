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

  test("resolves artifacts when folder name is exactly the task id", () => {
    const paths = [
      "specifications/TASK-42/spec.md",
      "architecture/TASK-42/proposal.md",
      "plans/TASK-42/master-plan.md",
    ];
    const result = resolveWorkflowArtifacts("TASK-42", paths);
    expect(result.specification).toBe("specifications/TASK-42/spec.md");
    expect(result.architecture).toBe("architecture/TASK-42/proposal.md");
    expect(result.planFolder).toBe("plans/TASK-42");
    expect(result.planMaster).toBe("plans/TASK-42/master-plan.md");
    expect(result.featureName).toBeUndefined();
  });

  test("picks matching folders deterministically when several exist", () => {
    const paths = [
      "specifications/TASK-42-zebra/spec.md",
      "specifications/TASK-42-alpha/spec.md",
    ];
    const result = resolveWorkflowArtifacts("TASK-42", paths);
    expect(result.specification).toBe("specifications/TASK-42-alpha/spec.md");
  });
});
