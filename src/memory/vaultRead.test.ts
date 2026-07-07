import { vaultRead } from "./vaultRead";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultWriter } from "./vaultWriter";

describe("vaultRead", () => {
  test("returns full file content for recall follow-up reads", async () => {
    const writer = new MapVaultWriter({ ...loadFixtureVault("demo") });
    const result = await vaultRead(writer, {
      path: "memory/projects/demo/long-term/decisions/2026-01-12-excerpt-recall.md",
    });

    expect(result.content).toContain("Use excerpt-only recall");
    expect(result.content).toContain("status: active");
  });
});
