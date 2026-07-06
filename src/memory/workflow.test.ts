import { memoryGetWorkflow } from "./workflow";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultReader } from "./vaultReader";

describe("memoryGetWorkflow", () => {
  const demoVault = new MapVaultReader(loadFixtureVault("demo"));

  test("returns complete workflow chain with excerpts", async () => {
    const result = await memoryGetWorkflow(demoVault, {
      taskId: "TASK-42",
      excerptLength: 100,
    });
    expect(result.featureName).toBe("memory-read");
    expect(result.specification?.path).toBe(
      "specifications/TASK-42-memory-read/spec.md",
    );
    expect(result.architecture?.path).toBe(
      "architecture/TASK-42-memory-read/proposal.md",
    );
    expect(result.planMaster?.path).toBe(
      "plans/TASK-42-memory-read/master-plan.md",
    );
    expect(result.planPhases.map((phase) => phase.path)).toEqual([
      "plans/TASK-42-memory-read/01-foundation.md",
    ]);
    expect(result.manualTestPlan?.path).toBe(
      "manual-test-plans/memory-read/plan.md",
    );
  });

  test("includes related decisions linked by origin", async () => {
    const result = await memoryGetWorkflow(demoVault, {
      taskId: "TASK-42",
      project: "demo",
    });
    expect(result.relatedDecisions.map((decision) => decision.title)).toContain(
      "Use excerpt-only recall",
    );
  });

  test("returns partial results for unknown task", async () => {
    const result = await memoryGetWorkflow(demoVault, {
      taskId: "TASK-404",
    });
    expect(result.specification).toBeUndefined();
    expect(result.planPhases).toEqual([]);
    expect(result.relatedDecisions).toEqual([]);
  });
});
