import {
  App,
  CachedMetadata,
  prepareSimpleSearch,
  TFile,
} from "obsidian";
import path from "path";
import {
  applyPatch,
  getDocumentMap,
  PatchInstruction,
  PatchOperation,
  PatchTargetType,
} from "markdown-patch";

const jsonLogic = require("json-logic-js") as {
  apply: (logic: unknown, data?: unknown) => unknown;
  add_operation: (name: string, code: (...args: unknown[]) => unknown) => void;
};

const WildcardRegexp = require("glob-to-regexp") as (pattern: string) => RegExp;

import {
  DocumentMapObject,
  FileMetadataObject,
  SearchContext,
  SearchJsonResponseItem,
  SearchResponseItem,
} from "./types";
import { FileNotFoundError, DestinationAlreadyExistsError } from "./errors";
import { toArrayBuffer } from "../utils";

export { FileNotFoundError, DestinationAlreadyExistsError } from "./errors";

export class VaultOperations {
  constructor(readonly app: App) {
    jsonLogic.add_operation(
      "glob",
      (pattern: string | undefined, field: string | undefined) => {
        if (typeof field === "string" && typeof pattern === "string") {
          return WildcardRegexp(pattern).test(field);
        }
        return false;
      },
    );
    jsonLogic.add_operation(
      "regexp",
      (pattern: string | undefined, field: string | undefined) => {
        if (typeof field === "string" && typeof pattern === "string") {
          return new RegExp(pattern).test(field);
        }
        return false;
      },
    );
  }

  private waitForFileCache(
    file: TFile,
    timeoutMs = 5000,
  ): Promise<CachedMetadata | null> {
    const existingCache = this.app.metadataCache.getFileCache(file);
    if (existingCache) {
      return Promise.resolve(existingCache);
    }

    return new Promise((resolve) => {
      let resolved = false;

      const onCacheChange = (...data: unknown[]) => {
        const changedFile = data[0];
        if (!(changedFile instanceof TFile)) return;
        if (changedFile.path === file.path && !resolved) {
          resolved = true;
          this.app.metadataCache.off("changed", onCacheChange);
          window.clearTimeout(timeoutId);
          resolve(this.app.metadataCache.getFileCache(file));
        }
      };

      const timeoutId = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.app.metadataCache.off("changed", onCacheChange);
          console.warn(
            `[AI Memory Store] Timeout waiting for metadata cache for ${file.path} after ${timeoutMs}ms`,
          );
          resolve(this.app.metadataCache.getFileCache(file));
        }
      }, timeoutMs);

      this.app.metadataCache.on("changed", onCacheChange);

      const cacheAfterListener = this.app.metadataCache.getFileCache(file);
      if (cacheAfterListener && !resolved) {
        resolved = true;
        this.app.metadataCache.off("changed", onCacheChange);
        window.clearTimeout(timeoutId);
        resolve(cacheAfterListener);
      }
    });
  }

  async getDocumentMapObject(file: TFile): Promise<DocumentMapObject> {
    const content = await this.app.vault.adapter.read(file.path);
    const documentMap = getDocumentMap(content);

    return {
      headings: Object.keys(documentMap.heading)
        .filter((h) => h)
        .map((h) => h.split("\x1f").join("::")),
      blocks: Object.keys(documentMap.block),
      frontmatterFields: Object.keys(documentMap.frontmatter),
    };
  }

  async readFileSection(
    file: TFile,
    targetType: string,
    target: string,
    targetDelimiter = "::",
  ): Promise<unknown> {
    const content = await this.app.vault.adapter.read(file.path);
    const documentMap = getDocumentMap(content);

    if (targetType === "frontmatter") {
      const value: unknown = documentMap.frontmatter[target];
      if (value === undefined)
        throw new Error(`Frontmatter key not found: ${target}`);
      return value;
    }

    const mapKey =
      targetType === "heading"
        ? target.split(targetDelimiter).join("\x1f")
        : target;

    const entry =
      targetType === "heading"
        ? documentMap.heading[mapKey]
        : documentMap.block[mapKey];

    if (!entry) throw new Error(`${targetType} not found: ${target}`);

    return content.substring(entry.content.start, entry.content.end);
  }

  buildBacklinksIndex(): Record<string, string[]> {
    const index: Record<string, string[]> = {};
    for (const [sourcePath, targets] of Object.entries(
      this.app.metadataCache.resolvedLinks,
    )) {
      for (const targetPath of Object.keys(targets)) {
        (index[targetPath] ??= []).push(sourcePath);
      }
    }
    return index;
  }

  async getFileMetadataObject(
    file: TFile,
    backlinksIndex?: Record<string, string[]>,
    includeContent = true,
  ): Promise<FileMetadataObject> {
    const cache = await this.waitForFileCache(file);

    const frontmatter = { ...(cache?.frontmatter ?? {}) };
    delete frontmatter.position;

    const directTags = (cache?.tags ?? [])
      .filter((tag) => tag)
      .map((tag) => tag.tag);
    const frontmatterTags = Array.isArray(frontmatter.tags)
      ? (frontmatter.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const filteredTags: string[] = [...frontmatterTags, ...directTags]
      .filter((tag) => tag)
      .map((tag) => tag.replace(/^#/, ""))
      .filter((value, index, self) => self.indexOf(value) === index);

    const links = Object.keys(
      this.app.metadataCache.resolvedLinks[file.path] ?? {},
    );

    const index = backlinksIndex ?? this.buildBacklinksIndex();
    const backlinks = index[file.path] ?? [];

    return {
      tags: filteredTags,
      frontmatter: frontmatter,
      stat: file.stat,
      path: file.path,
      content: includeContent ? await this.app.vault.cachedRead(file) : "",
      links,
      backlinks,
    };
  }

  async listVaultDirectory(dirPath: string): Promise<string[]> {
    const normalizedPath = dirPath.endsWith("/")
      ? dirPath.slice(0, -1)
      : dirPath;
    const prefix = normalizedPath ? normalizedPath + "/" : "";
    const files = [
      ...new Set(
        this.app.vault
          .getFiles()
          .map((e) => e.path)
          .filter((filename) => filename.startsWith(prefix))
          .map((filename) => {
            const subPath = filename.slice(prefix.length);
            if (subPath.indexOf("/") > -1) {
              return subPath.slice(0, subPath.indexOf("/") + 1);
            }
            return subPath;
          }),
      ),
    ];
    files.sort();
    return files;
  }

  async readFileContent(filePath: string): Promise<string> {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return this.app.vault.read(file);
  }

  async writeFileContent(
    filePath: string,
    content: string | Buffer,
  ): Promise<void> {
    try {
      await this.app.vault.createFolder(path.dirname(filePath));
    } catch {
      // folder already exists
    }
    if (typeof content === "string") {
      await this.app.vault.adapter.write(filePath, content);
    } else {
      await this.app.vault.adapter.writeBinary(
        filePath,
        toArrayBuffer(content),
      );
    }
  }

  async appendFileContent(filePath: string, content: string): Promise<void> {
    try {
      await this.app.vault.createFolder(path.dirname(filePath));
    } catch {
      // folder already exists
    }
    let fileContents = "";
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      fileContents = await this.app.vault.read(file);
      if (!fileContents.endsWith("\n")) {
        fileContents += "\n";
      }
    }
    fileContents += content;
    await this.app.vault.adapter.write(filePath, fileContents);
  }

  async deleteVaultFile(filePath: string): Promise<void> {
    const pathExists = await this.app.vault.adapter.exists(filePath);
    if (!pathExists) {
      throw new FileNotFoundError(`File not found: ${filePath}`);
    }
    await this.app.vault.adapter.remove(filePath);
  }

  async moveVaultFile(
    sourcePath: string,
    destinationPath: string,
    allowOverwrite = false,
  ): Promise<string> {
    if (!destinationPath) {
      throw new Error("Destination path must not be empty.");
    }

    if (sourcePath === destinationPath) {
      return sourcePath;
    }

    const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(sourceFile instanceof TFile)) {
      throw new FileNotFoundError(`File not found: ${sourcePath}`);
    }

    const destExists = await this.app.vault.adapter.exists(destinationPath);
    if (destExists) {
      if (!allowOverwrite) {
        throw new DestinationAlreadyExistsError(
          `Destination already exists: ${destinationPath}`,
        );
      }
      await this.app.vault.adapter.remove(destinationPath);
    }

    const parentDir = destinationPath.substring(
      0,
      destinationPath.lastIndexOf("/"),
    );
    if (parentDir && !(await this.app.vault.adapter.exists(parentDir))) {
      await this.app.vault.createFolder(parentDir);
    }

    // @ts-ignore - fileManager exists at runtime but not in type definitions
    await this.app.fileManager.renameFile(sourceFile, destinationPath);
    return sourceFile.path;
  }

  async patchFileSection(
    filePath: string,
    targetType: PatchTargetType,
    target: string,
    operation: PatchOperation,
    content: unknown,
    contentType: string,
    options?: {
      createTargetIfMissing?: boolean;
      rejectIfContentPreexists?: boolean;
      trimTargetWhitespace?: boolean;
      targetDelimiter?: string;
      targetScope?: string;
    },
  ): Promise<string> {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      throw new FileNotFoundError(`File not found: ${filePath}`);
    }
    const fileContents = await this.app.vault.read(file);

    const delimiter = options?.targetDelimiter ?? "::";
    const resolvedTarget: string | string[] =
      targetType === "heading" ? target.split(delimiter) : target;

    const instruction: PatchInstruction = {
      operation,
      targetType,
      target: resolvedTarget,
      contentType,
      content,
      rejectIfContentPreexists: options?.rejectIfContentPreexists ?? false,
      trimTargetWhitespace: options?.trimTargetWhitespace ?? false,
      createTargetIfMissing: options?.createTargetIfMissing ?? false,
      ...(options?.targetScope ? { targetScope: options.targetScope } : {}),
    } as PatchInstruction;

    const patched = applyPatch(fileContents, instruction);
    await this.app.vault.adapter.write(filePath, patched);
    return patched;
  }

  async simpleSearch(
    query: string,
    contextLength = 100,
    pathPrefix?: string,
  ): Promise<SearchResponseItem[]> {
    const results: SearchResponseItem[] = [];
    const search = prepareSimpleSearch(query);
    const normalizedPrefix = pathPrefix
      ? pathPrefix.endsWith("/")
        ? pathPrefix
        : pathPrefix + "/"
      : undefined;

    for (const file of this.app.vault.getMarkdownFiles()) {
      if (normalizedPrefix && !file.path.startsWith(normalizedPrefix)) {
        continue;
      }

      const cachedContents = await this.app.vault.cachedRead(file);

      const filenamePrefix = file.basename + "\n\n";
      const result = search(filenamePrefix + cachedContents);
      const positionOffset = filenamePrefix.length;

      if (result) {
        const contextMatches: SearchContext[] = [];
        for (const match of result.matches) {
          if (match[0] < positionOffset && match[1] <= positionOffset) {
            contextMatches.push({
              match: {
                start: match[0],
                end: Math.min(match[1], file.basename.length),
                source: "filename",
              },
              context: file.basename,
            });
          } else if (match[0] >= positionOffset) {
            contextMatches.push({
              match: {
                start: match[0] - positionOffset,
                end: match[1] - positionOffset,
                source: "content",
              },
              context: cachedContents.slice(
                Math.max(match[0] - positionOffset - contextLength, 0),
                match[1] - positionOffset + contextLength,
              ),
            });
          }
        }

        results.push({
          filename: file.path,
          score: result.score,
          matches: contextMatches,
        });
      }
    }

    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return results;
  }

  async searchJsonLogic(
    query: unknown,
    pathPrefix?: string,
  ): Promise<SearchJsonResponseItem[]> {
    const results: SearchJsonResponseItem[] = [];
    const backlinksIndex = this.buildBacklinksIndex();
    const includeContent = JSON.stringify(query).includes('"content"');
    const normalizedPrefix = pathPrefix
      ? pathPrefix.endsWith("/")
        ? pathPrefix
        : pathPrefix + "/"
      : undefined;

    for (const file of this.app.vault.getMarkdownFiles()) {
      if (normalizedPrefix && !file.path.startsWith(normalizedPrefix)) {
        continue;
      }

      const fileContext = await this.getFileMetadataObject(
        file,
        backlinksIndex,
        includeContent,
      );

      try {
        const fileResult = jsonLogic.apply(query, fileContext);

        if (this.isTruthy(fileResult)) {
          results.push({ filename: file.path, result: fileResult });
        }
      } catch (e) {
        const error = e as Error;
        throw new Error(`${error.message} (while processing ${file.path})`);
      }
    }

    return results;
  }

  private isTruthy(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  }
}
