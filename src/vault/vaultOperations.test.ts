import { App, TFile } from "obsidian";

import {
  DestinationAlreadyExistsError,
  FileNotFoundError,
  VaultOperations,
} from "./vaultOperations";

function buildApp(): App {
  const app = new App();
  app.vault._files = [];
  app.vault._markdownFiles = [];
  return app;
}

describe("VaultOperations", () => {
  test("readFileContent throws when file missing", async () => {
    const app = buildApp();
    app.vault._getAbstractFileByPath = null;
    const vault = new VaultOperations(app);

    await expect(vault.readFileContent("missing.md")).rejects.toThrow(
      "File not found",
    );
  });

  test("writeFileContent writes through adapter", async () => {
    const app = buildApp();
    const vault = new VaultOperations(app);

    await vault.writeFileContent("notes/test.md", "hello");

    expect(app.vault.adapter._write).toEqual(["notes/test.md", "hello"]);
  });

  test("appendFileContent appends to existing file", async () => {
    const app = buildApp();
    const file = new TFile();
    file.path = "notes/log.md";
    app.vault._getAbstractFileByPath = file;
    app.vault._read = "line one\n";
    const vault = new VaultOperations(app);

    await vault.appendFileContent("notes/log.md", "line two");

    expect(app.vault.adapter._write[1]).toBe("line one\nline two");
  });

  test("listVaultDirectory returns immediate children", async () => {
    const app = buildApp();
    const a = new TFile();
    a.path = "memory/projects/demo/daily/2026-07-06.md";
    const b = new TFile();
    b.path = "memory/projects/demo/tasks/tasks-index.md";
    app.vault._files = [a, b];
    const vault = new VaultOperations(app);

    const entries = await vault.listVaultDirectory("memory/projects/demo");
    expect(entries).toEqual(["daily/", "tasks/"]);
  });

  test("deleteVaultFile throws FileNotFoundError when missing", async () => {
    const app = buildApp();
    app.vault.adapter._exists = false;
    const vault = new VaultOperations(app);

    await expect(vault.deleteVaultFile("gone.md")).rejects.toBeInstanceOf(
      FileNotFoundError,
    );
  });

  test("moveVaultFile rejects existing destination", async () => {
    const app = buildApp();
    const source = new TFile();
    source.path = "a.md";
    app.vault._getAbstractFileByPath = source;
    app.vault.adapter._exists = true;
    const vault = new VaultOperations(app);

    await expect(vault.moveVaultFile("a.md", "b.md")).rejects.toBeInstanceOf(
      DestinationAlreadyExistsError,
    );
  });

  test("patchFileSection writes patched content", async () => {
    const app = buildApp();
    const file = new TFile();
    file.path = "note.md";
    app.vault._getAbstractFileByPath = file;
    app.vault._read = "# Title\n\nOld body\n";
    const vault = new VaultOperations(app);

    await vault.patchFileSection(
      "note.md",
      "heading",
      "Title",
      "replace",
      "New body",
      "text/markdown",
    );

    expect(app.vault.adapter._write[0]).toBe("note.md");
    expect(app.vault.adapter._write[1]).toContain("New body");
  });
});
