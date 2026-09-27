import { PrismaClient } from "@prisma/client";
import { tenantExtension } from "@/lib/prisma/tenant-extension";
import { softDeleteExtension } from "@/lib/prisma/soft-delete-extension";

/**
 * Prisma client singleton — composed with two Samik extensions:
 *
 *   1. tenantExtension     — RLS emulation: auto-injects `WHERE school_id`
 *                            from AsyncLocalStorage (set by middleware).
 *   2. softDeleteExtension — converts `delete()` → `update deletedAt=now()`.
 *
 * Order matters. Per Prisma docs, when you compose A.$extends(B), the
 * resulting client runs B's hooks FIRST, then A's hooks. We want:
 *   tenant filter (inject schoolId + WHERE) → soft-delete (filter deletedAt)
 * So soft-delete is applied LAST (innermost), tenant is applied FIRST (outer).
 */
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export const db = basePrisma.$extends(softDeleteExtension).$extends(tenantExtension);

export type { PrismaClient };
