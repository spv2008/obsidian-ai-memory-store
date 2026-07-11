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
import { MapVaultWriter } from "../memory/vaultWriter";
import { loadFixtureVault } from "../memory/fixtureLoader";

const TEST_MANIFEST = {
  id: "obsidian-ai-memory-store",
  name: "AI Memory Store",
  version: "0.1.0",
  minAppVersion: "1.4.0",
  author: "Test",
  description: "Test",
};

const demoVault = new MapVaultWriter({ ...loadFixtureVault("demo") });

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

  test("registers memory read and write tools", async () => {
    const mcp = makeHandler();
    await buildSession(mcp);
    const toolNames = mockTool.mock.calls.map((call) => call[0]);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "memory_status",
        "memory_bootstrap",
        "memory_session_context",
        "memory_recall",
        "memory_get_workflow",
        "memory_upsert",
        "memory_write_decision",
        "memory_write_specification",
        "memory_write_architecture",
        "memory_write_plan",
        "memory_write_manual_test",
        "memory_start_task",
        "memory_archive_task",
        "memory_find",
        "vault_read",
      ]),
    );
    expect(toolNames).toHaveLength(15);
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

  test("memory_upsert writes through injected fixture vault", async () => {
    const mcp = makeHandler();
    const result = await mcp.invokeToolForTest("memory_upsert", {
      project: "demo",
      relativePath: "daily/2026-07-08.md",
      mode: "replace_file",
      content: "# New daily\n",
    });
    const payload = JSON.parse(result.content[0].text) as { path: string };
    expect(payload.path).toBe("memory/projects/demo/daily/2026-07-08.md");
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

  test("memory_write_decision then memory_recall finds the decision", async () => {
    const mcp = makeHandler();
    await mcp.invokeToolForTest("memory_write_decision", {
      project: "demo",
      slug: "handler-e2e-decision",
      title: "Handler E2E decision",
      body: "**Decision**: Written through MCP handler.",
      area: "testing",
      decided: "2026-07-08",
    });
    const recall = await mcp.invokeToolForTest("memory_recall", {
      project: "demo",
      sources: ["decisions"],
      keywords: ["handler", "e2e"],
    });
    const payload = JSON.parse(recall.content[0].text) as {
      hits: Array<{ title: string }>;
    };
    expect(payload.hits.some((hit) => hit.title === "Handler E2E decision")).toBe(
      true,
    );
  });

  test("memory_write_specification then memory_get_workflow returns it", async () => {
    const mcp = makeHandler();
    await mcp.invokeToolForTest("memory_write_specification", {
      taskId: "TASK-500",
      featureName: "handler-e2e",
      content: "# Handler E2E spec\n",
    });
    const workflow = await mcp.invokeToolForTest("memory_get_workflow", {
      taskId: "TASK-500",
    });
    const payload = JSON.parse(workflow.content[0].text) as {
      specification?: { path: string };
    };
    expect(payload.specification?.path).toBe(
      "specifications/TASK-500-handler-e2e/spec.md",
    );
  });

  test("memory_start_task and memory_archive_task manage lifecycle state", async () => {
    const vault = new MapVaultWriter({
      "memory/projects/demo/tasks/tasks-index.md": [
        "# Task Register: demo",
        "",
        "| Task | Started | Finished | Status | Outcome | Note |",
        "|---|---|---|---|---|---|",
        "",
      ].join("\n"),
      "memory/short-term/current-task.md":
        "# Current Task\n\n**Goal**: \n\n## Following\n\n## Sub-tasks\n\n",
    });
    const mcp = new McpHandler(null, TEST_MANIFEST, DEFAULT_SETTINGS, {
      vault,
    });

    await mcp.invokeToolForTest("memory_start_task", {
      project: "demo",
      name: "Handler lifecycle task",
      goal: "Verify MCP task tools",
    });
    const archive = await mcp.invokeToolForTest("memory_archive_task", {
      project: "demo",
      status: "done",
      slug: "handler-lifecycle-task",
      outcome: "Verified through handler",
    });
    const payload = JSON.parse(archive.content[0].text) as {
      archivePath: string;
    };
    expect(payload.archivePath).toContain("handler-lifecycle-task");
    const bootstrap = await mcp.invokeToolForTest("memory_bootstrap", {
      project: "demo",
    });
    const bootstrapPayload = JSON.parse(bootstrap.content[0].text) as {
      activeTask: { name: string } | null;
    };
    expect(bootstrapPayload.activeTask).toBeNull();
  });

  test("memory_find and vault_read return scoped search and full content", async () => {
    const mcp = makeHandler();
    const find = await mcp.invokeToolForTest("memory_find", {
      project: "demo",
      query: "excerpt-only recall",
      types: ["decisions"],
    });
    const findPayload = JSON.parse(find.content[0].text) as {
      hits: Array<{ path: string }>;
    };
    expect(findPayload.hits.length).toBeGreaterThan(0);
    const read = await mcp.invokeToolForTest("vault_read", {
      path: findPayload.hits[0].path,
    });
    const readPayload = JSON.parse(read.content[0].text) as {
      content: string;
    };
    expect(readPayload.content).toContain("Use excerpt-only recall");
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
