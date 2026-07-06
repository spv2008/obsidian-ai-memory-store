import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function textResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}
