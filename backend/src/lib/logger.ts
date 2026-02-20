import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info"
});

export const httpLogger = pinoHttp({
  logger,
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage(req, res, error) {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
  }
});
