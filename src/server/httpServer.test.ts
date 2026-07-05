import express from "express";
import forge from "node-forge";
import { App } from "obsidian";

import HttpServer from "./httpServer";
import { CERT_NAME, SERVICE_NAME } from "../constants";
import { DEFAULT_SETTINGS } from "../constants";

const TEST_MANIFEST = {
  id: "obsidian-ai-memory-store",
  name: "AI Memory Store",
  version: "0.1.0",
  minAppVersion: "1.4.0",
  author: "Test",
  description: "Test",
};

function makeSettings() {
  const keypair = forge.pki.rsa.generateKeyPair(512);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = "1";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  cert.setSubject([{ name: "commonName", value: "test" }]);
  cert.setIssuer([{ name: "commonName", value: "test" }]);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  return {
    ...DEFAULT_SETTINGS,
    apiKey: "test-api-key",
    crypto: {
      cert: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
      publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
    },
  };
}

describe("HttpServer", () => {
  let server: HttpServer;

  beforeEach(() => {
    server = new HttpServer({} as App, TEST_MANIFEST, makeSettings());
    server.setupRouter();
  });

  test("GET / returns health JSON without authentication", async () => {
    const res = await invoke(server.api, "GET", "/");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("OK");
    expect(body.service).toBe(SERVICE_NAME);
    expect(body.authenticated).toBe(false);
  });

  test("GET / reflects authentication when bearer token provided", async () => {
    const res = await invoke(server.api, "GET", "/", {
      Authorization: "Bearer test-api-key",
    });
    const body = JSON.parse(res.body);
    expect(body.authenticated).toBe(true);
  });

  test("GET /cert serves certificate PEM", async () => {
    const res = await invoke(server.api, "GET", `/${CERT_NAME}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("BEGIN CERTIFICATE");
  });

  test("GET /vault returns 404", async () => {
    const res = await invoke(server.api, "GET", "/vault/test.md", {
      Authorization: "Bearer test-api-key",
    });
    expect(res.status).toBe(404);
  });

  test("GET /mcp requires authentication", async () => {
    const res = await invoke(server.api, "GET", "/mcp/");
    expect(res.status).toBe(401);
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
    } as unknown as express.Response;

    app.handle(req, res, (err: unknown) => {
      if (err) reject(err);
    });
  });
}
