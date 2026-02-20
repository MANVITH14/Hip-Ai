import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

prisma.$connect().then(() => {
  logger.info("Connected to PostgreSQL via Prisma");
}).catch((error) => {
  logger.error({ error }, "Prisma connection failed");
});
