import { App } from "obsidian";
import { applyPatch } from "markdown-patch";

import { VaultOperations } from "../vault/vaultOperations";
import type { MemoryVaultReader } from "./vaultReader";
import { createObsidianVaultReader } from "./vaultReader";

export interface MemoryVaultWriter extends MemoryVaultReader {
  write(path: string, content: string): Promise<void>;
  append(path: string, content: string): Promise<void>;
  patchSection(
    path: string,
    heading: string,
    operation: "append" | "prepend" | "replace",
    content: string,
    options?: { createTargetIfMissing?: boolean },
  ): Promise<void>;
}

export function createObsidianVaultWriter(app: App): MemoryVaultWriter {
  const reader = createObsidianVaultReader(app);
  const vault = new VaultOperations(app);

  return {
    ...reader,
    async write(path: string, content: string): Promise<void> {
      await vault.writeFileContent(path, content);
    },
    async append(path: string, content: string): Promise<void> {
      await vault.appendFileContent(path, content);
    },
    async patchSection(
      path: string,
      heading: string,
      operation: "append" | "prepend" | "replace",
      content: string,
      options?: { createTargetIfMissing?: boolean },
    ): Promise<void> {
      await vault.patchFileSection(
        path,
        "heading",
        heading,
        operation,
        content,
        "text/markdown",
        {
          createTargetIfMissing: options?.createTargetIfMissing ?? false,
        },
      );
    },
  };
}

export class MapVaultWriter implements MemoryVaultWriter {
  constructor(private readonly files: Record<string, string>) {}

  cloneFiles(): Record<string, string> {
    return { ...this.files };
  }

  async read(path: string): Promise<string | null> {
    return Object.prototype.hasOwnProperty.call(this.files, path)
      ? this.files[path]
      : null;
  }

  async exists(path: string): Promise<boolean> {
    return Boolean(
      Object.prototype.hasOwnProperty.call(this.files, path),
    );
  }

  async listPaths(): Promise<string[]> {
    return Object.keys(this.files);
  }

  async write(path: string, content: string): Promise<void> {
    this.files[path] = content;
  }

  async append(path: string, content: string): Promise<void> {
    const existing = (await this.read(path)) ?? "";
    const separator =
      existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    this.files[path] = `${existing}${separator}${content}`;
  }

  async patchSection(
    path: string,
    heading: string,
    operation: "append" | "prepend" | "replace",
    content: string,
    options?: { createTargetIfMissing?: boolean },
  ): Promise<void> {
    const existing = await this.read(path);
    if (!existing && !options?.createTargetIfMissing) {
      throw new Error(`File not found: ${path}`);
    }
    const base = existing ?? "";
    const patched = applyPatch(base, {
      operation,
      targetType: "heading",
      target: heading,
      contentType: "text/markdown",
      content,
      createTargetIfMissing: options?.createTargetIfMissing ?? false,
    });
    this.files[path] = patched;
  }
}

export function createFixtureVaultWriter(
  fixtureName: string,
  loader: (name: string) => Record<string, string>,
): MapVaultWriter {
  return new MapVaultWriter({ ...loader(fixtureName) });
}
