import { Prisma } from "@prisma/client";

/**
 * Dev-only Prisma middleware that warns if tenant-scoped models
 * are queried without a userId or id filter.
 *
 * This is a safety net — not a substitute for correct application logic.
 */

const TENANT_MODELS = new Set(["Event", "Course", "ChatCommand", "CalendarSyncState"]);

export const tenantAuditMiddleware: Prisma.Middleware = async (params, next) => {
  if (process.env.NODE_ENV !== "development") return next(params);

  const model = params.model;
  if (!model || !TENANT_MODELS.has(model)) return next(params);

  // Only audit read/write operations that accept a where clause
  const auditActions = [
    "findMany",
    "findFirst",
    "updateMany",
    "deleteMany",
    "count",
    "aggregate",
  ];
  if (!auditActions.includes(params.action)) return next(params);

  const where = params.args?.where;
  if (!where) {
    console.warn(
      `[TENANT AUDIT] ⚠️  ${model}.${params.action}() called WITHOUT any where clause`,
    );
    return next(params);
  }

  const hasUserFilter = "userId" in where || "id" in where;
  if (!hasUserFilter) {
    console.warn(
      `[TENANT AUDIT] ⚠️  ${model}.${params.action}() called without userId or id filter. ` +
        `Where: ${JSON.stringify(where)}`,
    );
  }

  return next(params);
};
