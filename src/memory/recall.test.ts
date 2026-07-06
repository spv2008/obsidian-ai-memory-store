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
