import { memoryBootstrap } from "./bootstrap";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultReader } from "./vaultReader";

describe("memoryBootstrap", () => {
  const demoVault = new MapVaultReader(loadFixtureVault("demo"));

  test("returns projectExists false for unknown project", async () => {
    const result = await memoryBootstrap(demoVault, { project: "missing" });
    expect(result.projectExists).toBe(false);
    expect(result.conversationContext).toBeNull();
    expect(result.activeWork).toEqual([]);
  });

  test("loads full project bundle for demo fixture", async () => {
    const result = await memoryBootstrap(demoVault, { project: "demo" });
    expect(result.projectExists).toBe(true);
    expect(result.conversationContext).toContain("vault parsers");
    expect(result.currentTask).toContain("memory read tools");
    expect(result.activeTask?.name).toBe("Implement memory read tools");
    expect(result.parkedTasks).toHaveLength(1);
    expect(result.activeDecisions).toHaveLength(2);
    expect(result.latestDaily?.date).toBe("2026-07-06");
  });

  test("flags decisions older than six months for review", async () => {
    const result = await memoryBootstrap(demoVault, { project: "demo" });
    expect(result.needsReviewDecisions.map((d) => d.decision)).toContain(
      "Legacy auth flow",
    );
    expect(result.needsReviewDecisions.map((d) => d.decision)).not.toContain(
      "Use excerpt-only recall",
    );
  });

  test("caps register indexes and latest daily to excerptLength", async () => {
    const result = await memoryBootstrap(demoVault, {
      project: "demo",
      excerptLength: 50,
    });
    if (!result.tasksIndex || !result.decisionsIndex || !result.latestDaily) {
      throw new Error("expected bootstrap register and daily fields");
    }
    expect(result.tasksIndex.length).toBeLessThanOrEqual(51);
    expect(result.decisionsIndex.length).toBeLessThanOrEqual(51);
    expect(result.latestDaily.content.length).toBeLessThanOrEqual(51);
  });

  test("resolves activeWork links from current-task", async () => {
    const result = await memoryBootstrap(demoVault, {
      project: "demo",
      excerptLength: 80,
    });
    expect(result.activeWork.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "specifications/TASK-42-memory-read/spec.md",
        "plans/TASK-42-memory-read/master-plan.md",
      ]),
    );
    expect(result.activeWork.every((item) => item.excerpt.length <= 81)).toBe(
      true,
    );
  });
});
