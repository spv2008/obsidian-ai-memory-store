import type { PluginManifest } from "obsidian";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { memoryBootstrap, type BootstrapInput } from "../memory/bootstrap";
import { memoryRecall, type RecallInput } from "../memory/recall";
import { memoryGetWorkflow, type WorkflowInput } from "../memory/workflow";
import type { MemoryVaultReader } from "../memory/vaultReader";
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
  vault: MemoryVaultReader;
  manifest: PluginManifest;
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
    "Load project memory bundle for session start, including registers, latest daily log, and linked active-work excerpts.",
    {
      project: z.string().describe("Project slug under memory/projects/"),
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
    "memory_recall",
    "Ranked excerpt-only retrieval across project memory and artifact sources.",
    {
      project: z.string().describe("Project slug under memory/projects/"),
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
    "Resolve a task id to its spec, architecture, plan, manual-test artifacts, and related decisions.",
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
}
