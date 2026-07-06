const mockRemove = jest.fn();
const mockTool = jest.fn().mockReturnValue({ remove: mockRemove });
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockTransportHandleRequest = jest.fn().mockResolvedValue(undefined);
const mockNewSessionId = "new-session-id";

jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    tool: mockTool,
    connect: mockConnect,
  })),
}));

jest.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: jest.fn().mockImplementation(
    (opts: { onsessioninitialized?: (id: string) => void }) => {
      const transport = {
        sessionId: mockNewSessionId,
        handleRequest: mockTransportHandleRequest,
        onclose: undefined as (() => void) | undefined,
      };
      void Promise.resolve().then(() =>
        opts?.onsessioninitialized?.(mockNewSessionId),
      );
      return transport;
    },
  ),
}));

import { McpHandler } from "./handler";
import { DEFAULT_SETTINGS } from "../constants";
import { SERVICE_NAME } from "../constants";
import { loadFixtureVault } from "../memory/fixtureLoader";
import { MapVaultReader } from "../memory/vaultReader";

const TEST_MANIFEST = {
  id: "obsidian-ai-memory-store",
  name: "AI Memory Store",
  version: "0.1.0",
  minAppVersion: "1.4.0",
  author: "Test",
  description: "Test",
};

const demoVault = new MapVaultReader(loadFixtureVault("demo"));

function makeHandler(): McpHandler {
  return new McpHandler(null, TEST_MANIFEST, DEFAULT_SETTINGS, {
    vault: demoVault,
  });
}

describe("McpHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function buildSession(mcp: McpHandler): Promise<void> {
    await mcp.handleRequest(
      { headers: {}, body: { jsonrpc: "2.0", id: 0, method: "initialize" } },
      { status: jest.fn().mockReturnThis(), json: jest.fn() },
    );
  }

  test("registers memory read tools", async () => {
    const mcp = makeHandler();
    await buildSession(mcp);
    const toolNames = mockTool.mock.calls.map((call) => call[0]);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "memory_status",
        "memory_bootstrap",
        "memory_recall",
        "memory_get_workflow",
      ]),
    );
    expect(toolNames).toHaveLength(4);
  });

  test("memory_status returns ok payload", async () => {
    const mcp = makeHandler();
    const result = await mcp.invokeToolForTest("memory_status");
    expect(result.content).toHaveLength(1);
    const payload = JSON.parse(result.content[0].text);
    expect(payload).toEqual({
      ok: true,
      version: "0.1.0",
      service: SERVICE_NAME,
      pluginId: "obsidian-ai-memory-store",
    });
  });

  test("memory_bootstrap uses injected fixture vault", async () => {
    const mcp = makeHandler();
    const result = await mcp.invokeToolForTest("memory_bootstrap", {
      project: "demo",
    });
    const payload = JSON.parse(result.content[0].text) as {
      projectExists: boolean;
      activeTask: { name: string } | null;
    };
    expect(payload.projectExists).toBe(true);
    expect(payload.activeTask?.name).toBe("Implement memory read tools");
  });

  test("memory_recall returns ranked hits from fixture vault", async () => {
    const mcp = makeHandler();
    const result = await mcp.invokeToolForTest("memory_recall", {
      project: "demo",
      sources: ["lessons"],
      keywords: ["recall"],
    });
    const payload = JSON.parse(result.content[0].text) as {
      hits: Array<{ title: string }>;
    };
    expect(payload.hits.some((hit) => hit.title === "Recall ranking")).toBe(
      true,
    );
  });

  test("memory_get_workflow resolves task chain from fixture vault", async () => {
    const mcp = makeHandler();
    const result = await mcp.invokeToolForTest("memory_get_workflow", {
      taskId: "TASK-42",
      project: "demo",
    });
    const payload = JSON.parse(result.content[0].text) as {
      specification?: { path: string };
      relatedDecisions: Array<{ title: string }>;
    };
    expect(payload.specification?.path).toBe(
      "specifications/TASK-42-memory-read/spec.md",
    );
    expect(payload.relatedDecisions.map((d) => d.title)).toContain(
      "Use excerpt-only recall",
    );
  });

  test("routes subsequent requests to existing session transport", async () => {
    const mcp = makeHandler();
    await buildSession(mcp);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await mcp.handleRequest(
      {
        headers: { "mcp-session-id": mockNewSessionId },
        body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
      },
      res,
    );
    expect(mockTransportHandleRequest).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  test("returns 404 for unknown session id", async () => {
    const mcp = makeHandler();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await mcp.handleRequest(
      {
        headers: { "mcp-session-id": "missing-session" },
        body: {},
      },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
