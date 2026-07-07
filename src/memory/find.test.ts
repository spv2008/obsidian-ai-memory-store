import { memoryFind } from "./find";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultWriter } from "./vaultWriter";

describe("memoryFind", () => {
  const demoVault = new MapVaultWriter({ ...loadFixtureVault("demo") });

  test("returns scoped excerpts for project memory matches", async () => {
    const result = await memoryFind(demoVault, {
      project: "demo",
      query: "excerpt-only recall",
      types: ["decisions"],
      maxResults: 5,
    });

    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits[0].path).toContain("decisions");
    expect(result.hits[0].excerpt.toLowerCase()).toContain("excerpt");
    expect(result.hits[0].excerpt.length).toBeLessThanOrEqual(120);
  });

  test("does not return hits from another project's memory folder", async () => {
    const vault = new MapVaultWriter({
      ...loadFixtureVault("demo"),
      "memory/projects/other-project/daily/2026-07-07.md":
        "# Other project\n\nsecret recall token only here",
    });
    const result = await memoryFind(vault, {
      project: "demo",
      query: "secret recall token only here",
      types: ["daily"],
    });

    expect(result.hits).toEqual([]);
  });

  test("searches artifact roots when types include specifications", async () => {
    const result = await memoryFind(demoVault, {
      project: "demo",
      query: "memory read",
      types: ["specifications"],
    });

    expect(result.hits.some((hit) => hit.path.includes("TASK-42-memory-read"))).toBe(
      true,
    );
  });

  test("defaults to ten results with short excerpts", async () => {
    const result = await memoryFind(demoVault, {
      project: "demo",
      query: "memory",
      types: ["all"],
    });

    expect(result.hits.length).toBeLessThanOrEqual(10);
    for (const hit of result.hits) {
      expect(hit.excerpt.length).toBeLessThanOrEqual(120);
    }
  });

  test("caps maxResults and excerptLength", async () => {
    const result = await memoryFind(demoVault, {
      project: "demo",
      query: "memory",
      types: ["all"],
      maxResults: 500,
      excerptLength: 5000,
    });

    expect(result.hits.length).toBeLessThanOrEqual(50);
    for (const hit of result.hits) {
      expect(hit.excerpt.length).toBeLessThanOrEqual(2000);
    }
  });
});
