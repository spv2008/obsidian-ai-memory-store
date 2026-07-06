import { memoryWriteDecision, DuplicateDecisionError } from "./decisions";
import { memoryRecall } from "./recall";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultWriter } from "./vaultWriter";

describe("memoryWriteDecision", () => {
  test("writes atomic decision note and register row", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    const result = await memoryWriteDecision(writer, {
      project: "demo",
      slug: "jwt-rotation",
      title: "Rotate JWT signing keys quarterly",
      body: "**Decision**: Rotate keys every quarter.",
      area: "auth/tokens",
      decided: "2026-07-07",
      files: ["src/auth/tokens.ts"],
    });

    expect(result.path).toBe(
      "memory/projects/demo/long-term/decisions/2026-07-07-jwt-rotation.md",
    );
    const note = await writer.read(result.path);
    expect(note).toContain("status: active");
    const index = await writer.read(result.registerPath);
    expect(index).toContain("Rotate JWT signing keys quarterly");
  });

  test("supersedes an existing decision and updates the register", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    const result = await memoryWriteDecision(writer, {
      project: "demo",
      slug: "modern-auth-flow",
      title: "Replace legacy auth flow",
      body: "**Decision**: Use OAuth only.",
      area: "auth/login",
      decided: "2026-07-07",
      supersedes: "legacy-auth",
    });

    expect(result.supersededPath).toBe(
      "memory/projects/demo/long-term/decisions/2025-01-01-legacy-auth.md",
    );
    if (!result.supersededPath) {
      throw new Error("expected superseded decision path");
    }
    const oldNote = await writer.read(result.supersededPath);
    expect(oldNote).toContain("status: superseded");
    expect(oldNote).toContain("superseded-by: modern-auth-flow");
    const index = await writer.read(result.registerPath);
    expect(index).toContain("| 2025-01-01 | Legacy auth flow | superseded |");
  });

  test("rejects duplicate decision slug for the same date", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    await expect(
      memoryWriteDecision(writer, {
        project: "demo",
        slug: "excerpt-recall",
        title: "Duplicate",
        body: "Nope",
        area: "memory",
        decided: "2026-01-12",
      }),
    ).rejects.toBeInstanceOf(DuplicateDecisionError);
  });

  test("seeds an empty decisions index without placeholder rows", async () => {
    const writer = new MapVaultWriter({});
    await memoryWriteDecision(writer, {
      project: "new-app",
      slug: "first-decision",
      title: "First decision",
      body: "**Decision**: Start with an empty register.",
      area: "core",
      decided: "2026-07-08",
    });
    const index = await writer.read(
      "memory/projects/new-app/long-term/decisions-index.md",
    );
    expect(index).not.toContain("YYYY-MM-DD");
    expect(index).toContain("First decision");
  });

  test("written decision is discoverable via memory_recall", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    await memoryWriteDecision(writer, {
      project: "demo",
      slug: "jwt-rotation",
      title: "Rotate JWT signing keys quarterly",
      body: "**Decision**: Rotate keys every quarter.",
      area: "auth/tokens",
      decided: "2026-07-07",
    });

    const recall = await memoryRecall(writer, {
      project: "demo",
      sources: ["decisions"],
      keywords: ["quarterly"],
    });
    expect(recall.hits.some((hit) => hit.title.includes("Rotate JWT"))).toBe(
      true,
    );
  });
});
