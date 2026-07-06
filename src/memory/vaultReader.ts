import { App, TFile } from "obsidian";

export interface MemoryVaultReader {
  read(path: string): Promise<string | null>;
  exists(path: string): Promise<boolean>;
  listPaths(): Promise<string[]>;
}

export function createObsidianVaultReader(app: App): MemoryVaultReader {
  return {
    async read(path: string): Promise<string | null> {
      const file = app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        return null;
      }
      try {
        return await app.vault.read(file);
      } catch {
        return null;
      }
    },
    async exists(path: string): Promise<boolean> {
      return app.vault.adapter.exists(path);
    },
    async listPaths(): Promise<string[]> {
      return app.vault.getFiles().map((file) => file.path);
    },
  };
}

export class MapVaultReader implements MemoryVaultReader {
  constructor(private readonly files: Record<string, string>) {}

  async read(path: string): Promise<string | null> {
    return Object.prototype.hasOwnProperty.call(this.files, path)
      ? this.files[path]
      : null;
  }

  async exists(path: string): Promise<boolean> {
    return Object.prototype.hasOwnProperty.call(this.files, path);
  }

  async listPaths(): Promise<string[]> {
    return Object.keys(this.files);
  }
}
