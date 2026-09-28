import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

/**
 * Soft Delete Prisma Client Extension
 * ================================
 *
 * Implements the "Soft Delete" directive at the end of Section 9:
 *   > "In financial and educational systems, never physically DELETE a record.
 *   >  All operational tables must have a `deletedAt: Timestamp?` column. If
 *   >  the deputy mistakenly deletes a class, the grade history is not lost."
 *
 * What it does:
 *   1. `delete()` and `deleteMany()` are converted to `update` / `updateMany`
 *      that set `deletedAt = now()` — but ONLY on models that have `deletedAt`.
 *   2. All `find*`, `count`, `aggregate`, `groupBy` calls automatically exclude
 *      soft-deleted rows (i.e. `WHERE deletedAt IS NULL`), unless the caller
 *      explicitly passes `__includeDeleted: true` inside `where`.
 *
 * Modeled models with `deletedAt` (currently only `ClassRoom`, but the list
 * grows as needed). To soft-delete-enable a model, just add `deletedAt DateTime?`
 * to its definition in `prisma/schema.prisma` and register it below.
 */

const SOFT_DELETE_MODELS = new Set<string>([
  "ClassRoom",
  // Phase 2 will add: Subject, BellSchedule, TimetableSlot, etc.
]);

function hasSoftDelete(model: string | undefined): model is string {
  return !!model && SOFT_DELETE_MODELS.has(model);
}

/**
 * Marker a caller can pass inside `where` to opt-out of the auto
 * `deletedAt IS NULL` filter (e.g. an audit-log query that needs to see
 * tombstones). The marker is stripped before the query runs.
 */
export const INCLUDE_DELETED_SYMBOL = "__includeDeleted";

export const softDeleteExtension = Prisma.defineExtension((client: any) => {
  return client.$extends({
    name: "samik-soft-delete",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) {
              w.deletedAt = null;
            }
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w;
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w;
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w;
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w as any;
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w as any;
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w;
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w;
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (hasSoftDelete(model)) {
            const w = (args.where ?? {}) as Record<string, unknown>;
            const includeDeleted = w[INCLUDE_DELETED_SYMBOL] === true;
            if (!includeDeleted) w.deletedAt = null;
            delete w[INCLUDE_DELETED_SYMBOL];
            args.where = w;
          }
          return query(args);
        },

        // Convert delete → soft-delete update
        async delete({ model, args, query }) {
          if (hasSoftDelete(model)) {
            // Convert to update that sets deletedAt = now()
            return (client as unknown as Record<string, any>)[model!].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (hasSoftDelete(model)) {
            return (client as unknown as Record<string, any>)[model!].updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
      },
    },
  });
});
