import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
    service: "refund-platform",
  },
  redact: {
    paths: [
      "email",
      "password",
      "token",
      "details.email",
      "user.email",
      "receiptUrl",
    ],
    remove: true,
  },
});

export const auditLogger = logger.child({ module: "audit" });
export const authLogger = logger.child({ module: "auth" });
export const apiLogger = logger.child({ module: "api" });
