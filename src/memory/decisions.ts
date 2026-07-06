import {
  appendRegisterRow,
  createRegisterTable,
  parseRegisterTable,
  updateRegisterRow,
} from "./parse/registerTable";
import {
  decisionNotePath,
  decisionsIndexPath,
  projectMemoryPrefix,
} from "./paths";
import { DATE_PATTERN } from "./schema";
import type { MemoryVaultWriter } from "./vaultWriter";

export class DuplicateDecisionError extends Error {}

export interface WriteDecisionInput {
  project: string;
  slug: string;
  title: string;
  body: string;
  area: string;
  decided: string;
  status?: string;
  files?: string[];
  origin?: string;
  supersedes?: string;
  reviewed?: string;
}

export interface WriteDecisionResult {
  path: string;
  registerPath: string;
  supersededPath?: string;
}

function formatFrontmatterValue(value: string | string[] | undefined): string {
  if (value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
}

function buildDecisionNote(input: WriteDecisionInput): string {
  const status = input.status ?? "active";
  const lines = [
    "---",
    "type: decision",
    `status: ${status}`,
    `area: ${input.area}`,
    `files: ${formatFrontmatterValue(input.files)}`,
    `decided: ${input.decided}`,
    `reviewed: ${formatFrontmatterValue(input.reviewed)}`,
    `origin: ${formatFrontmatterValue(input.origin)}`,
    "supersedes:",
    "superseded-by:",
    "---",
    "",
    `## ${input.title}`,
    "",
    input.body.trim(),
    "",
  ];
  return lines.join("\n");
}

function registerRowForDecision(input: WriteDecisionInput): string[] {
  return [
    input.decided,
    input.title,
    input.status ?? "active",
    input.area,
    `[[${input.decided}-${input.slug}]]`,
  ];
}

async function ensureDecisionsIndex(
  writer: MemoryVaultWriter,
  project: string,
): Promise<string> {
  const indexPath = decisionsIndexPath(project);
  const existing = await writer.read(indexPath);
  if (existing) {
    return existing;
  }
  const created = createRegisterTable(`Decision Register: ${project}`, [
    "YYYY-MM-DD",
    "Decision",
    "active",
    "area",
    "[[slug]]",
  ]);
  await writer.write(indexPath, created);
  return created;
}

function findDecisionPathBySlug(
  allPaths: string[],
  project: string,
  slug: string,
): string | undefined {
  const prefix = `${projectMemoryPrefix(project)}long-term/decisions/`;
  return allPaths.find((filePath) => {
    if (!filePath.startsWith(prefix)) {
      return false;
    }
    return filePath.endsWith(`-${slug}.md`);
  });
}

function replaceFrontmatterField(
  content: string,
  field: string,
  value: string,
): string {
  const pattern = new RegExp(`^(${field}:\\s*)(.*)$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, `$1${value}`);
  }
  return content.replace(/^---\r?\n([\s\S]*?)\r?\n---/m, (_match, body: string) => {
    return `---\n${body.trimEnd()}\n${field}: ${value}\n---`;
  });
}

export async function memoryWriteDecision(
  writer: MemoryVaultWriter,
  input: WriteDecisionInput,
): Promise<WriteDecisionResult> {
  if (!DATE_PATTERN.test(input.decided)) {
    throw new Error(`Invalid decision date: ${input.decided}`);
  }

  const notePath = decisionNotePath(input.project, input.decided, input.slug);
  if (await writer.exists(notePath)) {
    throw new DuplicateDecisionError(
      `Decision already exists: ${notePath}`,
    );
  }

  await writer.write(notePath, buildDecisionNote(input));

  const indexPath = decisionsIndexPath(input.project);
  const indexContent = await ensureDecisionsIndex(writer, input.project);
  const updatedIndex = appendRegisterRow(
    indexContent,
    registerRowForDecision(input),
  );
  await writer.write(indexPath, updatedIndex);

  let supersededPath: string | undefined;
  if (input.supersedes) {
    const allPaths = await writer.listPaths();
    supersededPath = findDecisionPathBySlug(
      allPaths,
      input.project,
      input.supersedes,
    );
    if (supersededPath) {
      const oldContent = await writer.read(supersededPath);
      if (oldContent) {
        let patched = replaceFrontmatterField(oldContent, "status", "superseded");
        patched = replaceFrontmatterField(
          patched,
          "superseded-by",
          input.slug,
        );
        await writer.write(supersededPath, patched);
      }

      const table = parseRegisterTable(updatedIndex);
      if (table) {
        const row = table.rows.find((cells) =>
          cells.some(
            (cell) =>
              cell.includes(`[[${input.supersedes}]]`) ||
              cell.includes(`-${input.supersedes}]]`),
          ),
        );
        if (row) {
          const decided = row[0];
          const patchedIndex = updateRegisterRow(
            updatedIndex,
            "Decided",
            decided,
            (record) => {
              const cells = [...record.cells];
              cells[2] = "superseded";
              return cells;
            },
          );
          await writer.write(indexPath, patchedIndex);
        }
      }
    }
  }

  return {
    path: notePath,
    registerPath: indexPath,
    supersededPath,
  };
}
