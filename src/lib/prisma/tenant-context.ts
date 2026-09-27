import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Tenant Context — carries the active school_id (and role) for the duration of
 * a single request. Set by the Tenant Guard middleware / API route handler.
 *
 * This is the runtime counterpart to the conceptual "Row-Level Security" policy
 * described in Section 1 of the architecture document. Since SQLite has no
 * native RLS, we emulate it at the ORM layer via a Prisma Client Extension
 * (see `tenant-extension.ts`) that reads from this ALS.
 *
 * In production (PostgreSQL), the same school_id will ALSO be enforced by a
 * real RLS policy on the DB connection — defense in depth.
 */
export interface TenantContextValue {
  /** Active school (tenant) UUID. NULL = global scope (SuperAdmin / cross-tenant reads). */
  schoolId: string | null;
  /** Active role within this tenant. */
  role: string | null;
  /** Active user UUID. */
  userId: string | null;
  /** When true, the Prisma tenant extension is bypassed (e.g. global conflict detection). */
  bypassTenantFilter?: boolean;
}

const tenantALS = new AsyncLocalStorage<TenantContextValue>();

/**
 * Default context: no tenant (SuperAdmin / system-level operations).
 * The Prisma extension sees null schoolId → does NOT inject WHERE school_id.
 */
const EMPTY_CONTEXT: TenantContextValue = {
  schoolId: null,
  role: null,
  userId: null,
  bypassTenantFilter: false,
};

export function getTenantContext(): TenantContextValue {
  return tenantALS.getStore() ?? EMPTY_CONTEXT;
}

/**
 * Run a callback inside a tenant scope. All Prisma queries issued inside
 * (synchronously or via awaited promises that retain the async context)
 * will be filtered by the supplied schoolId.
 */
export function runWithTenant<T>(
  ctx: Partial<TenantContextValue>,
  work: () => Promise<T> | T
): Promise<T> | T {
  const parent = getTenantContext();
  const next: TenantContextValue = {
    schoolId: ctx.schoolId ?? parent.schoolId,
    role: ctx.role ?? parent.role,
    userId: ctx.userId ?? parent.userId,
    bypassTenantFilter: ctx.bypassTenantFilter ?? parent.bypassTenantFilter,
  };
  return tenantALS.run(next, work);
}

/**
 * Temporarily bypass the tenant filter — used by the global conflict detector
 * (Section 5 of the architecture doc) which must read TimetableSlots across ALL
 * schools to detect teacher timetable overlaps. NEVER expose raw cross-tenant
 * data to the client — only aggregate conflict signals.
 */
export function runBypassingTenant<T>(work: () => Promise<T> | T): Promise<T> | T {
  return runWithTenant({ bypassTenantFilter: true }, work);
}
