const handleRequest = jest
  .fn()
  .mockRejectedValue(new Error("MCP handler failure"));

jest.mock("../mcp/handler", () => ({
  McpHandler: jest.fn().mockImplementation(() => ({
    handleRequest,
  })),
}));

import express from "express";

import HttpServer from "./httpServer";
import { DEFAULT_SETTINGS } from "../constants";

const TEST_MANIFEST = {
  id: "obsidian-ai-memory-store",
  name: "AI Memory Store",
  version: "0.1.0",
  minAppVersion: "1.4.0",
  author: "Test",
  description: "Test",
};

describe("HttpServer MCP error handling", () => {
  test("returns 500 when MCP handler rejects", async () => {
    const server = new HttpServer(
      {} as obsidian.App,
      TEST_MANIFEST,
      { ...DEFAULT_SETTINGS, apiKey: "test-api-key" },
    );
    server.setupRouter();

    const res = await invoke(server.api, "POST", "/mcp/", {
      Authorization: "Bearer test-api-key",
    });

    expect(res.status).toBe(500);
    expect(JSON.parse(res.body).message).toBe("MCP handler failure");
  });
});

async function invoke(
  app: express.Express,
  method: string,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url: path,
      headers,
      get(name: string) {
        const key = Object.keys(headers).find(
          (h) => h.toLowerCase() === name.toLowerCase(),
        );
        return key ? headers[key] : undefined;
      },
      body: {},
    } as express.Request;

    let statusCode = 200;
    let responseBody = "";

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        responseBody = JSON.stringify(payload);
        resolve({ status: statusCode, body: responseBody });
        return this;
      },
      send(payload: string) {
        responseBody = payload;
        resolve({ status: statusCode, body: responseBody });
        return this;
      },
      set() {
        return this;
      },
      setHeader() {
        return this;
      },
      headersSent: false,
    } as unknown as express.Response;

    app.handle(req, res, (err: unknown) => {
      if (err instanceof Error) {
        reject(err);
      } else if (err !== undefined) {
        reject(new Error(typeof err === "string" ? err : "Request failed"));
      }
    });
  });
}
