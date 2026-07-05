import express from "express";

import { LocalRestApiSettings } from "../types";
import { ErrorCode } from "../types";
import { ERROR_CODE_MESSAGES } from "../constants";

export function requestIsAuthenticated(
  req: express.Request,
  settings: LocalRestApiSettings,
): boolean {
  const authorizationHeader = req.get(
    settings.authorizationHeaderName ?? "Authorization",
  );
  return authorizationHeader === `Bearer ${settings.apiKey}`;
}

export function sendAuthRequiredResponse(res: express.Response): void {
  res.status(401).json({
    message: ERROR_CODE_MESSAGES[ErrorCode.ApiKeyAuthorizationRequired],
    errorCode: ErrorCode.ApiKeyAuthorizationRequired,
  });
}

export function createMcpAuthMiddleware(
  settings: LocalRestApiSettings,
): express.RequestHandler {
  return (req, res, next) => {
    if (!requestIsAuthenticated(req, settings)) {
      sendAuthRequiredResponse(res);
      return;
    }
    next();
  };
}
