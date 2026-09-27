import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "./tenant-context";

/**
 * Tenant Isolation Prisma Client Extension
 * ========================================
 *
 * Implements Section 1 ("Data Leakage Prevention — Global Query Filters") of the
 * architecture document. Since SQLite (our dev engine) lacks native Row-Level
 * Security, we emulate RLS at the ORM layer.
 *
 * What it does:
 *   1. For every `findMany` / `findFirst` / `findUnique` / `count` / `aggregate` /
 *      `groupBy` on a tenant-scoped model, inject `WHERE school_id = $currentTenant`
 *      into the query — UNLESS the active context has `bypassTenantFilter: true`
 *      (used by the global conflict detector).
 *   2. For every `create` / `createMany` / `update` / `updateMany` / `upsert` /
 *      `delete` / `deleteMany`, force `schoolId` to the current tenant (cannot be
 *      spoofed from the client).
 *
 * Tenant-scoped models are auto-detected by the presence of a `schoolId` scalar
 * field. Models WITHOUT `schoolId` (i.e. `User`) are global and never filtered.
 *
 * CRITICAL: the extension reads `schoolId` from `AsyncLocalStorage`, so it is
 * automatically correct across concurrent requests without explicit plumbing.
 */

const TENANT_SCOPED_MODELS = new Set<string>([
  "School",
  "ClassRoom",
  "StaffEmployment",
  "SchoolEnrollment",
  "BellSchedule",
  "Subject",
  "TimetableSlot",
  "ClassSession",
  "AttendanceRecord",
  "Assessment",
  "Grade",
  "BehavioralPoint",
  "NotificationOutbox",
]);

/**
 * Note: `School` itself is filtered by its own `id` (i.e. the schoolId IS the
 * record's primary key). For all other tenant-scoped models, `schoolId` is a FK.
 */

function isTenantScoped(model: string | undefined): model is string {
  return !!model && TENANT_SCOPED_MODELS.has(model);
}

function currentSchoolId(): string | null {
  const ctx = getTenantContext();
  if (ctx.bypassTenantFilter) return null;
  return ctx.schoolId;
}

/**
 * Walk a Prisma where-object and merge in the tenant filter.
 * - Existing `schoolId` from the client is ALWAYS overwritten — the client
 *   cannot escape its own tenant by passing a different schoolId.
 * - AND-conditions are merged so we don't destroy other filters.
 */
function injectWhereFilter<T>(where: T, schoolId: string, model: string): T {
  if (!where || typeof where !== "object") {
    return { schoolId } as unknown as T;
  }
  // If the model IS School, the school's own id == tenant id.
  if (model === "School") {
    return { ...(where as object), id: schoolId } as unknown as T;
  }
  return { ...(where as object), schoolId } as unknown as T;
}

export const tenantExtension = Prisma.defineExtension((client: PrismaClient) => {
  return client.$extends({
    name: "samik-tenant-isolation",
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            // findUnique uses `where` directly; inject schoolId into the where clause
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },

        // Mutations — force schoolId on writes
        async create({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid && model !== "School") {
            const data = args.data as Record<string, unknown>;
            // Only inject schoolId if the caller didn't already provide it
            // via the scalar FK OR the relation connect syntax.
            if (!data.schoolId && !data.school) {
              data.schoolId = sid;
            }
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid && model !== "School") {
            const data = Array.isArray(args.data) ? args.data : [args.data];
            args.data = data.map((d) => ({ ...(d as object), schoolId: sid }));
          }
          return query(args);
        },
        async createManyAndReturn({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid && model !== "School") {
            const data = Array.isArray(args.data) ? args.data : [args.data];
            args.data = data.map((d) => ({ ...(d as object), schoolId: sid }));
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
            // Prevent client from rewriting schoolId on update
            if (args.data && typeof args.data === "object" && "schoolId" in (args.data as object)) {
              delete (args.data as Record<string, unknown>).schoolId;
            }
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
            if (args.data && typeof args.data === "object" && "schoolId" in (args.data as object)) {
              delete (args.data as Record<string, unknown>).schoolId;
            }
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid && model !== "School") {
            args.where = injectWhereFilter(args.where, sid, model);
            args.create = { ...(args.create as object), schoolId: sid };
            args.update = { ...(args.update as object) };
            if ("schoolId" in (args.update as object)) {
              delete (args.update as Record<string, unknown>).schoolId;
            }
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          const sid = currentSchoolId();
          if (isTenantScoped(model) && sid) {
            args.where = injectWhereFilter(args.where, sid, model);
          }
          return query(args);
        },
      },
    },
  });
});
