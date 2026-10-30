import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";

export const requestLogger = pinoHttp({
  logger,

  // GENERATE A REQUEST ID FOR TRACING A REQUEST END-2-END
  genReqId: (req, res) => {
    const existingId = req.headers["x-request-id"];
    const id = (existingId as string) || randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },

  // KEEP THE AUTO-LOG LINE CLEAN
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },

  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
});
