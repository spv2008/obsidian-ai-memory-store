import { apiVersion, App, PluginManifest } from "obsidian";
import express from "express";
import cors from "cors";
import responseTime from "response-time";
import forge from "node-forge";
import { SUPPORTED_PROTOCOL_VERSIONS } from "@modelcontextprotocol/sdk/types.js";

import { McpHandler } from "../mcpHandler";
import { VaultOperations } from "../vaultOperations";
import {
  CERT_NAME,
  MaximumRequestSize,
  SERVICE_NAME,
} from "../constants";
import { LocalRestApiSettings } from "../types";
import {
  getCertificateIsUptoStandards,
  getCertificateValidityDays,
} from "../utils";
import {
  createMcpAuthMiddleware,
  requestIsAuthenticated,
} from "./auth";

export default class HttpServer {
  readonly api: express.Express;
  readonly mcpHandler: McpHandler;
  private readonly operations: VaultOperations;

  constructor(
    app: App,
    private readonly manifest: PluginManifest,
    private readonly settings: LocalRestApiSettings,
  ) {
    this.api = express();
    this.api.set("json spaces", 2);
    this.operations = new VaultOperations(app);
    this.mcpHandler = new McpHandler(this.operations, this.settings);
  }

  setupRouter(): void {
    this.api.use((req, res, next) => {
      if (this.settings.enableVerboseLogging) {
        const originalSend = res.send;
        res.send = function (body, ...args) {
          console.debug(
            `[AI Memory Store] ${req.method} ${req.url} => ${res.statusCode}`,
          );
          return originalSend.apply(res, [body, ...args]) as ReturnType<
            typeof res.send
          >;
        };
      }
      next();
    });
    this.api.use(responseTime());
    this.api.use(
      cors({ methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"] }),
    );

    this.api.get("/", (req, res) => this.root(req, res));
    this.api.get(`/${CERT_NAME}`, (req, res) => this.certificateGet(req, res));

    const mcpRouter = express.Router();
    mcpRouter.use(
      cors({ methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"] }),
    );
    mcpRouter.use(createMcpAuthMiddleware(this.settings));
    mcpRouter.use((req, res, next) => {
      const version = req.headers["mcp-protocol-version"] as string | undefined;
      if (
        version !== undefined &&
        !SUPPORTED_PROTOCOL_VERSIONS.includes(version)
      ) {
        res
          .status(400)
          .json({ error: `Unsupported MCP-Protocol-Version: ${version}` });
        return;
      }
      next();
    });
    mcpRouter.use(express.json({ limit: MaximumRequestSize }));
    mcpRouter.all("/", async (req, res) => {
      await this.mcpHandler.handleRequest(req, res);
    });
    this.api.use("/mcp", mcpRouter);

    this.api.use((_req, res) => {
      res.status(404).json({ message: "Not Found", errorCode: 40400 });
    });
  }

  private root(req: express.Request, res: express.Response): void {
    let certificate: forge.pki.Certificate | undefined;
    try {
      if (this.settings.crypto?.cert) {
        certificate = forge.pki.certificateFromPem(this.settings.crypto.cert);
      }
    } catch {
      // omit certificate info if PEM is invalid
    }

    res.status(200).json({
      status: "OK",
      manifest: this.manifest,
      versions: {
        obsidian: apiVersion,
        self: this.manifest.version,
      },
      service: SERVICE_NAME,
      authenticated: requestIsAuthenticated(req, this.settings),
      certificateInfo:
        requestIsAuthenticated(req, this.settings) && certificate
          ? {
              validityDays: getCertificateValidityDays(certificate),
              regenerateRecommended:
                !getCertificateIsUptoStandards(certificate),
            }
          : undefined,
    });
  }

  private certificateGet(_req: express.Request, res: express.Response): void {
    if (!this.settings.crypto?.cert) {
      res.status(404).json({ message: "Not Found", errorCode: 40400 });
      return;
    }
    res.set(
      "Content-type",
      `application/octet-stream; filename="${CERT_NAME}"`,
    );
    res.status(200).send(this.settings.crypto.cert);
  }
}
