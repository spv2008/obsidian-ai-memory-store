import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { API_KEY, BASE_URL, ensureServerReachable } from "./client";

function makeClient(): Client {
  return new Client({ name: "integration-test", version: "1.0.0" });
}

function makeTransport(): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(`${BASE_URL}/mcp`), {
    requestInit: {
      headers: { Authorization: `Bearer ${API_KEY}` },
    },
  });
}

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

function jsonOf<T = unknown>(result: ToolResult): T {
  const item = (result.content as Array<{ type: string; text: string }>)[0];
  if (!item || item.type !== "text") {
    throw new Error("Expected text content item");
  }
  return JSON.parse(item.text) as T;
}

let client: Client;

beforeAll(async () => {
  await ensureServerReachable();
  client = makeClient();
  await client.connect(makeTransport());
});

afterAll(async () => {
  await client?.close();
});

describe("MCP memory tools", () => {
  test("lists memory read tools", async () => {
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "memory_status",
        "memory_bootstrap",
        "memory_recall",
        "memory_get_workflow",
      ]),
    );
  });

  test("memory_status returns ok", async () => {
    const result = await client.callTool({ name: "memory_status", arguments: {} });
    expect(result.isError).not.toBe(true);
    const payload = jsonOf<{ ok: boolean; version: string; pluginId: string }>(
      result,
    );
    expect(payload.ok).toBe(true);
    expect(payload.pluginId).toBe("obsidian-ai-memory-store");
    expect(typeof payload.version).toBe("string");
  });
});

describe("health endpoint", () => {
  test("GET / returns service metadata", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.service).toBe("Obsidian AI Memory Store");
  });
});
