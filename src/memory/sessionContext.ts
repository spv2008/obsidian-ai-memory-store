import { capExcerptLength, excerpt } from "./excerpt";
import {
  buildActiveWork,
  findLatestDaily,
  type ActiveWorkItem,
  type LatestDaily,
} from "./bootstrap";
import {
  conversationContextPath,
  currentTaskPath,
  projectMemoryPrefix,
  resolveProjectNamespace,
} from "./paths";
import type { MemoryVaultReader } from "./vaultReader";

export interface SessionContextInput {
  project?: string;
  defaultProject?: string;
  excerptLength?: number;
}

export interface SessionContextResult {
  namespace: string | null;
  projectExists: boolean;
  conversationContext: string | null;
  currentTask: string | null;
  activeWork: ActiveWorkItem[];
  latestDaily: LatestDaily | null;
}

export async function memorySessionContext(
  reader: MemoryVaultReader,
  input: SessionContextInput = {},
): Promise<SessionContextResult> {
  const excerptLength = capExcerptLength(input.excerptLength);
  const namespace =
    resolveProjectNamespace(input.project, input.defaultProject) ?? null;
  const allPaths = await reader.listPaths();

  const [conversationContext, currentTask] = await Promise.all([
    reader.read(conversationContextPath()),
    reader.read(currentTaskPath()),
  ]);

  const projectExists = namespace
    ? allPaths.some((filePath) =>
        filePath.startsWith(projectMemoryPrefix(namespace)),
      )
    : false;

  const latestDaily =
    namespace && projectExists
      ? await findLatestDaily(reader, namespace, allPaths, excerptLength)
      : null;

  const activeWork = await buildActiveWork(
    reader,
    currentTask,
    allPaths,
    excerptLength,
  );

  return {
    namespace,
    projectExists,
    conversationContext: conversationContext
      ? excerpt(conversationContext, excerptLength)
      : null,
    currentTask: currentTask ? excerpt(currentTask, excerptLength) : null,
    activeWork,
    latestDaily,
  };
}

export function formatSessionContextMarkdown(
  result: SessionContextResult,
): string {
  const parts: string[] = ["# AI Memory Store — session context", ""];

  if (result.namespace) {
    parts.push(`Namespace: \`${result.namespace}\``, "");
  }

  parts.push("## Conversation context", "");
  parts.push(result.conversationContext?.trim() || "_None_", "");

  parts.push("## Current task", "");
  parts.push(result.currentTask?.trim() || "_None_", "");

  if (result.activeWork.length > 0) {
    parts.push("## Linked work", "");
    for (const item of result.activeWork) {
      parts.push(`### ${item.kind}: \`${item.path}\``, "");
      parts.push(item.excerpt.trim() || "_Empty_", "");
    }
  }

  if (result.latestDaily) {
    parts.push(`## Latest daily (${result.latestDaily.date})`, "");
    parts.push(result.latestDaily.content.trim() || "_Empty_", "");
  }

  return parts.join("\n").trimEnd() + "\n";
}
