import { memorySessionContext, formatSessionContextMarkdown } from "./sessionContext";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultWriter } from "./vaultWriter";

describe("memorySessionContext", () => {
  test("loads global short-term desk and linked active work", async () => {
    const vault = new MapVaultWriter(loadFixtureVault("demo"));
    const result = await memorySessionContext(vault, { project: "demo" });

    expect(result.namespace).toBe("demo");
    expect(result.projectExists).toBe(true);
    expect(result.conversationContext).toContain("vault parsers");
    expect(result.currentTask).toContain("memory read tools");
    expect(result.activeWork.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "specifications/TASK-42-memory-read/spec.md",
        "plans/TASK-42-memory-read/master-plan.md",
      ]),
    );
    expect(result.latestDaily?.date).toBe("2026-07-06");
  });

  test("works without project (desk only)", async () => {
    const vault = new MapVaultWriter(loadFixtureVault("demo"));
    const result = await memorySessionContext(vault, {});
    expect(result.namespace).toBeNull();
    expect(result.latestDaily).toBeNull();
    expect(result.currentTask).toContain("memory read tools");
  });

  test("formats markdown for hooks", async () => {
    const vault = new MapVaultWriter(loadFixtureVault("demo"));
    const result = await memorySessionContext(vault, { project: "demo" });
    const markdown = formatSessionContextMarkdown(result);
    expect(markdown).toContain("## Current task");
    expect(markdown).toContain("## Linked work");
    expect(markdown).toContain("Namespace: `demo`");
  });
});
