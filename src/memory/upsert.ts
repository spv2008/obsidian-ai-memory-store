import { findSection } from "./parse/sections";
import { projectRelativePath } from "./paths";
import type { MemoryVaultWriter } from "./vaultWriter";

export type UpsertMode =
  | "replace_file"
  | "append_file"
  | "append_section"
  | "replace_section";

export interface UpsertInput {
  project: string;
  relativePath: string;
  mode: UpsertMode;
  content: string;
  target?: string;
  createTargetIfMissing?: boolean;
  dedupeKey?: string;
}

export interface UpsertResult {
  path: string;
  created: boolean;
  deduped: boolean;
}

function rebuildWithSection(
  content: string,
  heading: string,
  newBody: string,
): string {
  const lines = content.split(/\r?\n/);
  const output: string[] = [];
  let inTarget = false;
  let replaced = false;

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      const currentHeading = match[2].trim();
      if (inTarget) {
        inTarget = false;
      }
      if (currentHeading.toLowerCase() === heading.toLowerCase()) {
        inTarget = true;
        replaced = true;
        output.push(line);
        if (newBody) {
          output.push("");
          output.push(newBody);
        }
        continue;
      }
    }
    if (!inTarget) {
      output.push(line);
    }
  }

  if (!replaced) {
    return content;
  }
  return output.join("\n").trimEnd() + "\n";
}

async function appendSectionWithDedupe(
  writer: MemoryVaultWriter,
  path: string,
  heading: string,
  content: string,
  dedupeKey?: string,
): Promise<{ created: boolean; deduped: boolean }> {
  const key = dedupeKey ?? heading;
  const existing = await writer.read(path);

  if (!existing) {
    await writer.write(path, `## ${heading}\n\n${content}\n`);
    return { created: true, deduped: false };
  }

  if (findSection(existing, key)) {
    const updated = rebuildWithSection(existing, key, content.trim());
    await writer.write(path, updated);
    return { created: false, deduped: true };
  }

  await writer.append(path, `\n## ${heading}\n\n${content}\n`);
  return { created: false, deduped: false };
}

export async function memoryUpsert(
  writer: MemoryVaultWriter,
  input: UpsertInput,
): Promise<UpsertResult> {
  const path = projectRelativePath(input.project, input.relativePath);
  const existed = await writer.exists(path);

  switch (input.mode) {
    case "replace_file": {
      await writer.write(path, input.content);
      return { path, created: !existed, deduped: false };
    }
    case "append_file": {
      if (!existed) {
        await writer.write(path, input.content);
        return { path, created: true, deduped: false };
      }
      await writer.append(path, input.content);
      return { path, created: false, deduped: false };
    }
    case "append_section": {
      const heading = input.target ?? input.dedupeKey;
      if (!heading) {
        throw new Error("append_section requires target or dedupeKey");
      }
      const sectionResult = await appendSectionWithDedupe(
        writer,
        path,
        heading,
        input.content,
        input.dedupeKey,
      );
      return {
        path,
        created: sectionResult.created || !existed,
        deduped: sectionResult.deduped,
      };
    }
    case "replace_section": {
      const heading = input.target;
      if (!heading) {
        throw new Error("replace_section requires target heading");
      }
      await writer.patchSection(path, heading, "replace", input.content, {
        createTargetIfMissing: input.createTargetIfMissing ?? true,
      });
      return { path, created: !existed, deduped: false };
    }
    default: {
      const exhaustive: never = input.mode;
      throw new Error(`Unsupported upsert mode: ${String(exhaustive)}`);
    }
  }
}
