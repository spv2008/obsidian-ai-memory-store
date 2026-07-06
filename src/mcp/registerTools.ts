import type { PluginManifest } from "obsidian";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { textResult } from "./textResult";
import { SERVICE_NAME } from "../constants";

export interface ToolRegistrar {
  tool(
    name: string,
    description: string,
    schema: unknown,
    callback: (args: unknown) => Promise<CallToolResult>,
  ): { remove: () => void };
}

export function registerMemoryTools(
  register: ToolRegistrar,
  manifest: PluginManifest,
): void {
  register.tool(
    "memory_status",
    "Health check for the AI Memory Store MCP server.",
    {},
    async () =>
      textResult({
        ok: true,
        version: manifest.version,
        service: SERVICE_NAME,
        pluginId: manifest.id,
      }),
  );
}
