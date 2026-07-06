import { memoryRecall, scoreRecallHit } from "./recall";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultReader } from "./vaultReader";

describe("memoryRecall project sources", () => {
  const demoVault = new MapVaultReader(loadFixtureVault("demo"));

  test("ranks area matches above keyword-only body matches", () => {
    const areaHit = scoreRecallHit({
      area: "auth/login",
      title: "Legacy auth flow",
      body: "session cookies",
      path: "memory/projects/demo/long-term/decisions/2025-01-01-legacy-auth.md",
      frontmatter: { area: "auth/login" },
    });
    const keywordHit = scoreRecallHit({
      area: "auth/login",
      keywords: ["session"],
      title: "Unrelated",
      body: "mentions session cookies in passing",
      path: "memory/projects/demo/long-term/lessons-learned.md",
    });
    expect(areaHit).toBeGreaterThan(keywordHit);
  });

  test("returns section-level hits for lessons and patterns", async () => {
    const result = await memoryRecall(demoVault, {
      project: "demo",
      sources: ["lessons", "patterns"],
      keywords: ["recall"],
    });
    expect(result.hits.some((hit) => hit.title === "Recall ranking")).toBe(
      true,
    );
    expect(result.hits.some((hit) => hit.source === "patterns")).toBe(true);
  });

  test("excludes superseded decisions by default", async () => {
    const result = await memoryRecall(demoVault, {
      project: "demo",
      sources: ["decisions"],
      keywords: ["billing"],
    });
    expect(result.hits).toHaveLength(0);
  });

  test("flags active decisions older than six months", async () => {
    const result = await memoryRecall(demoVault, {
      project: "demo",
      sources: ["decisions"],
      area: "auth/login",
    });
    expect(result.hits[0]?.needsReview).toBe(true);
  });

  test("caps maxResults", async () => {
    const result = await memoryRecall(demoVault, {
      project: "demo",
      sources: ["daily", "tasks", "context"],
      maxResults: 2,
    });
    expect(result.hits.length).toBeLessThanOrEqual(2);
  });
});

describe("memoryRecall artifact sources", () => {
  const demoVault = new MapVaultReader(loadFixtureVault("demo"));

  test("resolves artifact chain when taskId is provided", async () => {
    const result = await memoryRecall(demoVault, {
      project: "demo",
      taskId: "TASK-42",
      sources: ["specifications", "architecture", "plans", "manual-tests"],
    });
    const paths = result.hits.map((hit) => hit.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "specifications/TASK-42-memory-read/spec.md",
        "architecture/TASK-42-memory-read/proposal.md",
        "plans/TASK-42-memory-read/master-plan.md",
        "plans/TASK-42-memory-read/01-foundation.md",
        "manual-test-plans/memory-read/plan.md",
      ]),
    );
  });

  test("returns master plan and phases as separate hits", async () => {
    const result = await memoryRecall(demoVault, {
      project: "demo",
      taskId: "TASK-42",
      sources: ["plans"],
    });
    const planHits = result.hits.filter((hit) => hit.source === "plans");
    expect(planHits.length).toBeGreaterThanOrEqual(2);
    expect(planHits.some((hit) => hit.title === "Master plan")).toBe(true);
    expect(planHits.some((hit) => hit.title === "01-foundation.md")).toBe(true);
  });
});
