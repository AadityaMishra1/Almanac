import { PrismaClient } from "@prisma/client";
import { tenantAuditMiddleware } from "@/lib/prisma-audit-middleware";

// Global Prisma instance (singleton pattern for Next.js)
declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  if (process.env.NODE_ENV === "development") {
    client.$use(tenantAuditMiddleware);
  }

  return client;
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
