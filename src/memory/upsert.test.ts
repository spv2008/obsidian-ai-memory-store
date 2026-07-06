import { memoryUpsert } from "./upsert";
import { loadFixtureVault } from "./fixtureLoader";
import { MapVaultWriter } from "./vaultWriter";

describe("memoryUpsert", () => {
  test("creates a new daily log file", async () => {
    const writer = new MapVaultWriter({});
    const result = await memoryUpsert(writer, {
      project: "demo",
      relativePath: "daily/2026-07-07.md",
      mode: "replace_file",
      content: "# Session Log: 2026-07-07\n",
    });
    expect(result.path).toBe("memory/projects/demo/daily/2026-07-07.md");
    expect(result.created).toBe(true);
    expect(await writer.read(result.path)).toContain("2026-07-07");
  });

  test("appends a lesson section to an aggregated file", async () => {
    const writer = new MapVaultWriter(
      loadFixtureVault("demo"),
    );
    const result = await memoryUpsert(writer, {
      project: "demo",
      relativePath: "long-term/lessons-learned.md",
      mode: "append_section",
      target: "2026-07-07: Cache path listing",
      content: "**Problem**: listPaths called twice per recall.",
    });
    expect(result.created).toBe(false);
    const updated = await writer.read(result.path);
    expect(updated).toContain("Cache path listing");
  });

  test("dedupes sections by heading when dedupeKey is set", async () => {
    const writer = new MapVaultWriter({
      "memory/projects/demo/long-term/lessons-learned.md": [
        "# Lessons Learned",
        "",
        "## Recall ranking",
        "Old body",
      ].join("\n"),
    });
    const result = await memoryUpsert(writer, {
      project: "demo",
      relativePath: "long-term/lessons-learned.md",
      mode: "append_section",
      target: "Recall ranking",
      dedupeKey: "Recall ranking",
      content: "Updated ranking guidance.",
    });
    expect(result.deduped).toBe(true);
    const updated = await writer.read(result.path);
    expect(updated).toContain("Updated ranking guidance.");
    expect(updated).not.toContain("Old body");
    expect((updated?.match(/## Recall ranking/g) ?? []).length).toBe(1);
  });

  test("replace_section creates a new file when missing", async () => {
    const writer = new MapVaultWriter({});
    const result = await memoryUpsert(writer, {
      project: "demo",
      relativePath: "long-term/code-patterns.md",
      mode: "replace_section",
      target: "Error handling",
      content: "Always surface vault write failures to the caller.",
    });
    expect(result.created).toBe(true);
    const updated = await writer.read(result.path);
    expect(updated).toContain("## Error handling");
    expect(updated).toContain("surface vault write failures");
  });
});
