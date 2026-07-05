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

const TEST_MANIFEST = {
  id: "obsidian-ai-memory-store",
  name: "AI Memory Store",
  version: "0.1.0",
  minAppVersion: "1.4.0",
  author: "Test",
  description: "Test",
};

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

  test("registers memory_status tool only", async () => {
    const mcp = new McpHandler(TEST_MANIFEST, DEFAULT_SETTINGS);
    await buildSession(mcp);
    expect(mockTool).toHaveBeenCalledTimes(1);
    expect(mockTool.mock.calls[0][0]).toBe("memory_status");
  });

  test("memory_status returns ok payload", async () => {
    const mcp = new McpHandler(TEST_MANIFEST, DEFAULT_SETTINGS);
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

  test("routes subsequent requests to existing session transport", async () => {
    const mcp = new McpHandler(TEST_MANIFEST, DEFAULT_SETTINGS);
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
    const mcp = new McpHandler(TEST_MANIFEST, DEFAULT_SETTINGS);
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
