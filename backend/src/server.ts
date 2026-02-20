import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import "./lib/prisma";

const server = app.listen(env.PORT, () => {
  logger.info(`HipAlign backend listening on port ${env.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down server...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
