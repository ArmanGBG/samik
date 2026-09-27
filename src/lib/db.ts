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
 * Order matters: extensions are applied outer-to-inner. The tenant filter
 * must wrap the soft-delete filter so that a deputy in school A cannot
 * tombstone a record in school B by guessing its id.
 */
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export const db = basePrisma.$extends(tenantExtension).$extends(softDeleteExtension);

export type { PrismaClient };
