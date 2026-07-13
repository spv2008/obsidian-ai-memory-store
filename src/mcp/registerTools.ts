import type { PluginManifest } from "obsidian";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { memoryBootstrap, type BootstrapInput } from "../memory/bootstrap";
import { memoryWriteDecision, type WriteDecisionInput } from "../memory/decisions";
import {
  memoryWriteArchitecture,
  memoryWriteManualTest,
  memoryWritePlan,
  memoryWriteSpecification,
  type WriteArchitectureInput,
  type WriteManualTestInput,
  type WritePlanInput,
  type WriteSpecificationInput,
} from "../memory/artifactsWrite";
import { memoryFind, type FindInput } from "../memory/find";
import { memoryRecall, type RecallInput } from "../memory/recall";
import {
  memoryArchiveTask,
  memoryStartTask,
  type ArchiveTaskInput,
  type StartTaskInput,
} from "../memory/tasks";
import {
  formatSessionContextMarkdown,
  memorySessionContext,
  type SessionContextInput,
} from "../memory/sessionContext";
import { memoryUpsert, type UpsertInput } from "../memory/upsert";
import { vaultRead, type VaultReadInput } from "../memory/vaultRead";
import { memoryGetWorkflow, type WorkflowInput } from "../memory/workflow";
import { requireProjectNamespace } from "../memory/paths";
import type { MemoryVaultWriter } from "../memory/vaultWriter";
import { SERVICE_NAME } from "../constants";
import { textResult } from "./textResult";

const recallSourceSchema = z.enum([
  "decisions",
  "lessons",
  "patterns",
  "tools",
  "tasks",
  "daily",
  "context",
  "specifications",
  "architecture",
  "plans",
  "manual-tests",
]);

export interface ToolRegistrar {
  tool(
    name: string,
    description: string,
    schema: unknown,
    callback: (args: unknown) => Promise<CallToolResult>,
  ): { remove: () => void };
}

export interface MemoryToolDeps {
  vault: MemoryVaultWriter;
  manifest: PluginManifest;
  /** Read at invocation time so settings changes apply without restart. */
  getDefaultProject?: () => string | undefined;
}

export function registerMemoryTools(
  register: ToolRegistrar,
  deps: MemoryToolDeps,
): void {
  register.tool(
    "memory_status",
    "Health check for the AI Memory Store MCP server.",
    {},
    async () =>
      textResult({
        ok: true,
        version: deps.manifest.version,
        service: SERVICE_NAME,
        pluginId: deps.manifest.id,
      }),
  );

  register.tool(
    "memory_bootstrap",
    "Refresh or debug: full project snapshot including registers. Prefer memory_session_context or the session hook for normal session start.",
    {
      project: z.string().describe("Durable namespace under memory/projects/"),
      taskId: z.string().optional().describe("Optional task id context"),
      excerptLength: z
        .number()
        .optional()
        .describe("Maximum excerpt length per field"),
    },
    async (args) => {
      const result = await memoryBootstrap(
        deps.vault,
        args as BootstrapInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_session_context",
    "Slim session baseline from global short-term desk: conversation, current task, linked artifacts, and optional latest daily for a namespace.",
    {
      project: z
        .string()
        .optional()
        .describe(
          "Durable namespace for latest daily; defaults to plugin defaultProject",
        ),
      excerptLength: z.number().optional(),
    },
    async (args) => {
      const input = args as SessionContextInput;
      const result = await memorySessionContext(deps.vault, {
        ...input,
        defaultProject: deps.getDefaultProject?.(),
      });
      return textResult({
        ...result,
        markdown: formatSessionContextMarkdown(result),
      });
    },
  );

  register.tool(
    "memory_recall",
    "Ranked excerpt-only retrieval. Use for decisions and tasks by keyword/area — do not read indexes directly.",
    {
      project: z.string().describe("Durable namespace under memory/projects/"),
      area: z.string().optional().describe("Code area to prioritize"),
      files: z
        .array(z.string())
        .optional()
        .describe("File path fragments to prioritize"),
      keywords: z.array(z.string()).optional().describe("Keywords to match"),
      tags: z.array(z.string()).optional().describe("Tags to match"),
      sources: z
        .array(recallSourceSchema)
        .optional()
        .describe("Sources to search; defaults to all"),
      maxResults: z.number().optional().describe("Maximum hits to return"),
      excerptLength: z
        .number()
        .optional()
        .describe("Maximum excerpt length per hit"),
      includeSuperseded: z
        .boolean()
        .optional()
        .describe("Include superseded decisions"),
      taskId: z
        .string()
        .optional()
        .describe("When set, resolve artifact sources for this task id"),
    },
    async (args) => {
      const result = await memoryRecall(deps.vault, args as RecallInput);
      return textResult(result);
    },
  );

  register.tool(
    "memory_get_workflow",
    "Resolve a task id to its spec, architecture, plan, manual-test artifacts, and related decisions. Use when resuming or deep-diving a task.",
    {
      taskId: z.string().describe("Task id prefix for artifact folders"),
      project: z
        .string()
        .optional()
        .describe("Optional project slug to scope related decisions"),
      excerptLength: z
        .number()
        .optional()
        .describe("Maximum excerpt length per document"),
    },
    async (args) => {
      const result = await memoryGetWorkflow(
        deps.vault,
        args as WorkflowInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_upsert",
    "Create or update a project memory file, or global short-term desk files when shortTerm is true.",
    {
      project: z
        .string()
        .optional()
        .describe("Durable namespace; required unless shortTerm is true"),
      relativePath: z
        .string()
        .describe(
          "Path relative to the project root, or current-task.md / conversation.context.md when shortTerm",
        ),
      mode: z
        .enum([
          "replace_file",
          "append_file",
          "append_section",
          "replace_section",
        ])
        .describe("Write mode"),
      content: z.string().describe("Markdown content to write"),
      target: z
        .string()
        .optional()
        .describe("Target heading for section modes"),
      createTargetIfMissing: z
        .boolean()
        .optional()
        .describe("Create the target section when missing"),
      dedupeKey: z
        .string()
        .optional()
        .describe("Section heading used to replace an existing section"),
      shortTerm: z
        .boolean()
        .optional()
        .describe("Write under memory/short-term/ instead of a project"),
    },
    async (args) => {
      const result = await memoryUpsert(deps.vault, args as UpsertInput);
      return textResult(result);
    },
  );

  register.tool(
    "memory_write_decision",
    "Write an atomic decision note and append its register row, optionally superseding a prior decision.",
    {
      project: z.string(),
      slug: z.string(),
      title: z.string(),
      body: z.string(),
      area: z.string(),
      decided: z.string().describe("YYYY-MM-DD"),
      status: z.string().optional(),
      files: z.array(z.string()).optional(),
      origin: z.string().optional(),
      supersedes: z.string().optional(),
      reviewed: z.string().optional(),
    },
    async (args) => {
      const result = await memoryWriteDecision(
        deps.vault,
        args as WriteDecisionInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_write_specification",
    "Write specifications/{task-id}-{feature}/spec.md, creating the folder when missing.",
    {
      taskId: z.string(),
      featureName: z.string(),
      content: z.string(),
      mode: z.enum(["replace", "append"]).optional(),
    },
    async (args) => {
      const result = await memoryWriteSpecification(
        deps.vault,
        args as WriteSpecificationInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_write_architecture",
    "Write architecture/{task-id}-{feature}/proposal.md, creating the folder when missing.",
    {
      taskId: z.string(),
      featureName: z.string(),
      content: z.string(),
      mode: z.enum(["replace", "append"]).optional(),
    },
    async (args) => {
      const result = await memoryWriteArchitecture(
        deps.vault,
        args as WriteArchitectureInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_write_plan",
    "Write plans/{task-id}-{description}/master-plan.md or a phase file.",
    {
      taskId: z.string(),
      briefDescription: z.string(),
      file: z
        .string()
        .describe('Use "master-plan" or a phase name like "01-foundation"'),
      content: z.string(),
      mode: z.enum(["replace", "append"]).optional(),
    },
    async (args) => {
      const result = await memoryWritePlan(
        deps.vault,
        args as WritePlanInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_write_manual_test",
    "Write manual-test-plans/{feature}/plan.md or insomnia.json.",
    {
      featureName: z.string(),
      file: z.enum(["plan", "insomnia"]),
      content: z.string(),
      mode: z.enum(["replace", "append"]).optional(),
    },
    async (args) => {
      const result = await memoryWriteManualTest(
        deps.vault,
        args as WriteManualTestInput,
      );
      return textResult(result);
    },
  );

  register.tool(
    "memory_start_task",
    "Park the active task when needed, write global short-term current-task.md, and append an active register row under the project namespace.",
    {
      project: z
        .string()
        .optional()
        .describe("Durable namespace for the register; defaults to defaultProject"),
      name: z.string(),
      goal: z.string(),
      taskId: z.string().optional(),
      planLink: z.string().optional(),
      specLink: z.string().optional(),
      architectureLink: z.string().optional(),
      parkCurrentIfActive: z.boolean().optional(),
    },
    async (args) => {
      const raw = args as StartTaskInput & { project?: string };
      const result = await memoryStartTask(deps.vault, {
        ...raw,
        project: requireProjectNamespace(raw.project, deps.getDefaultProject?.()),
      });
      return textResult(result);
    },
  );

  register.tool(
    "memory_archive_task",
    "Archive global short-term current-task.md to the project tasks folder, update the register row, and clear the current task.",
    {
      project: z
        .string()
        .optional()
        .describe("Durable namespace for the register; defaults to defaultProject"),
      status: z.enum(["parked", "done", "abandoned"]),
      slug: z.string(),
      resumeNotes: z.string().optional(),
      outcome: z.string().optional(),
      taskId: z.string().optional(),
    },
    async (args) => {
      const raw = args as ArchiveTaskInput & { project?: string };
      const result = await memoryArchiveTask(deps.vault, {
        ...raw,
        project: requireProjectNamespace(raw.project, deps.getDefaultProject?.()),
      });
      return textResult(result);
    },
  );

  const findTypeSchema = z.enum([
    "decisions",
    "lessons",
    "patterns",
    "tasks",
    "daily",
    "specifications",
    "architecture",
    "plans",
    "manual-tests",
    "all",
  ]);

  register.tool(
    "memory_find",
    "Scoped keyword search under project memory and artifact roots with excerpt-only hits (fallback when recall filters are too narrow).",
    {
      project: z.string(),
      query: z.string(),
      types: z.array(findTypeSchema).optional(),
      maxResults: z.number().optional(),
      excerptLength: z.number().optional(),
    },
    async (args) => {
      const result = await memoryFind(deps.vault, args as FindInput);
      return textResult(result);
    },
  );

  register.tool(
    "vault_read",
    "Read full vault file content when recall excerpts are insufficient.",
    {
      path: z.string().describe("Vault-relative file path"),
    },
    async (args) => {
      const result = await vaultRead(deps.vault, args as VaultReadInput);
      return textResult(result);
    },
  );
}
