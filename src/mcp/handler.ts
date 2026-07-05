import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import express from "express";
import type { PluginManifest } from "obsidian";

import { LocalRestApiSettings } from "../types";
import { registerMemoryTools } from "./registerTools";
import { textResult } from "./textResult";

interface MinimalMcpServer {
  tool(
    name: string,
    description: string,
    schema: unknown,
    callback: (args: unknown) => Promise<CallToolResult>,
  ): { remove: () => void };
  connect(transport: StreamableHTTPServerTransport): Promise<void>;
}

interface ToolSpec {
  name: string;
  description: string;
  schema: unknown;
  callback: (args: unknown) => Promise<CallToolResult>;
}

interface SessionEntry {
  server: MinimalMcpServer;
  transport: StreamableHTTPServerTransport;
  toolHandles: Map<string, { remove: () => void }>;
}

export class McpHandler {
  private readonly sessions: Map<string, SessionEntry> = new Map();
  private readonly toolSpecs: Map<string, ToolSpec> = new Map();

  constructor(
    private readonly manifest: PluginManifest,
    private readonly settings: LocalRestApiSettings,
  ) {
    registerMemoryTools(
      {
        tool: (name, description, schema, callback) =>
          this.tool(name, description, schema, callback),
      },
      this.manifest,
    );
  }

  private buildServer(): {
    server: MinimalMcpServer;
    toolHandles: Map<string, { remove: () => void }>;
  } {
    const server: MinimalMcpServer = new McpServer({
      name: "obsidian-ai-memory-store",
      version: this.manifest.version,
    });
    const toolHandles = new Map<string, { remove: () => void }>();
    for (const spec of this.toolSpecs.values()) {
      toolHandles.set(
        spec.name,
        server.tool(spec.name, spec.description, spec.schema, spec.callback),
      );
    }
    return { server, toolHandles };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tool(
    name: string,
    description: string,
    schema: any,
    callback: (args: any) => Promise<CallToolResult>,
  ): { remove: () => void } {
    const spec: ToolSpec = {
      name,
      description,
      schema,
      callback: async (args: unknown) => {
        try {
          const result = await callback(args);
          if (this.settings.enableVerboseLogging) {
            console.debug(`[MCP] ${name} => ok`);
          }
          return result;
        } catch (e) {
          if (this.settings.enableVerboseLogging) {
            console.debug(`[MCP] ${name} => error`);
          }
          throw e;
        }
      },
    };
    this.toolSpecs.set(spec.name, spec);
    for (const session of this.sessions.values()) {
      session.toolHandles.set(
        spec.name,
        session.server.tool(spec.name, spec.description, spec.schema, spec.callback),
      );
    }
    return {
      remove: () => {
        this.toolSpecs.delete(spec.name);
        for (const session of this.sessions.values()) {
          const handle = session.toolHandles.get(spec.name);
          if (handle) {
            handle.remove();
            session.toolHandles.delete(spec.name);
          }
        }
      },
    };
  }

  async handleRequest(
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId) {
      const { server, toolHandles } = this.buildServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          this.sessions.set(id, { server, transport, toolHandles });
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) this.sessions.delete(transport.sessionId);
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await session.transport.handleRequest(req, res, req.body);
  }

  /** @internal Exposed for unit tests */
  async invokeToolForTest(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<CallToolResult> {
    const spec = this.toolSpecs.get(name);
    if (!spec) {
      throw new Error(`Tool "${name}" is not registered`);
    }
    return spec.callback(args);
  }
}

export { textResult };
