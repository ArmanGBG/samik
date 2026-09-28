import { NextRequest, NextResponse } from "next/server";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import { db } from "@/lib/db";

/**
 * Route-handler helpers for the 3-layer guard (Section 10).
 *
 * `middleware.ts` does the cheap crypto checks (Layer 1) and reads the role
 * (Layer 3) from the JWT. The DEEPER Tenant Guard (Layer 2 — "is this school
 * actually still ACTIVE in the DB, and is this user still employed there?")
 * needs DB access, so it runs here, inside the route handler.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     return withTenantContext(req, ["TEACHER"], async (ctx) => {
 *       // ctx.schoolId, ctx.userId, ctx.role available
 *       // Prisma queries inside here are auto-filtered by schoolId
 *       return NextResponse.json({ ... });
 *     });
 *   }
 */

interface TenantCtx {
  userId: string;
  schoolId: string;
  role: string;
  enrollmentId?: string;
}

export async function withTenantContext<T>(
  req: NextRequest,
  allowedRoles: string[],
  handler: (ctx: TenantCtx) => Promise<T>
): Promise<T> {
  const userId = req.headers.get("x-samik-user-id");
  const schoolId = req.headers.get("x-samik-school-id");
  const role = req.headers.get("x-samik-role");
  const enrollmentId = req.headers.get("x-samik-enrollment-id") ?? undefined;

  if (!userId || !schoolId || !role) {
    return unauthorizedResponse() as unknown as T;
  }
  if (!allowedRoles.includes(role)) {
    return forbiddenResponse("نقش شما برای این عملیات کافی نیست.") as unknown as T;
  }

  try {
    // Deep Tenant Guard: for SUPER_ADMIN, skip school-active check
    return await runWithTenant({ userId, schoolId, role, bypassTenantFilter: false }, async () => {
      if (role === "SUPER_ADMIN") {
        // SuperAdmin has no tenant scope. Run handler with bypass.
        return runWithTenant({ userId, schoolId: null, role, bypassTenantFilter: true }, () =>
          handler({ userId, schoolId, role })
        );
      }

      let school, employment;
      try {
        school = await db.school.findUnique({
          where: { id: schoolId },
          select: { id: true, status: true },
        });
      } catch (err) {
        console.error("[TENANT_GUARD_SCHOOL_DB_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در ارتباط با پایگاه داده مدرسه." },
          { status: 500 }
        ) as unknown as T;
      }
      if (!school || school.status !== "ACTIVE") {
        return forbiddenResponse("مدرسه غیرفعال یا نامعتبر است.") as unknown as T;
      }
      // For staff roles, confirm employment still exists
      if (role !== "STUDENT") {
        try {
          employment = await db.staffEmployment.findUnique({
            where: { schoolId_userId: { schoolId, userId } },
            select: { id: true, role: true },
          });
        } catch (err) {
          console.error("[TENANT_GUARD_STAFF_DB_ERROR]", err);
          return NextResponse.json(
            { ok: false, error: "خطا در بررسی سطح دسترسی پرسنل." },
            { status: 500 }
          ) as unknown as T;
        }
        if (!employment || employment.role !== role) {
          return forbiddenResponse("عضویت شما در این مدرسه معتبر نیست.") as unknown as T;
        }
      }
      return handler({ userId, schoolId, role, enrollmentId });
    });
  } catch (error) {
    console.error("[TENANT_GUARD_ERROR]", error);
    return internalServerErrorResponse() as unknown as T;
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    { ok: false, error: "نشست فعال نیست." },
    { status: 401 }
  );
}

function forbiddenResponse(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 403 });
}

function internalServerErrorResponse() {
  return NextResponse.json(
    { ok: false, error: "خطای غیرمنتظره در سرور رخ داد. لطفاً مجدداً تلاش کنید." },
    { status: 500 }
  );
}

/**
 * Convenience for SUPER_ADMIN endpoints — no tenant scope (global).
 */
export async function withSuperAdmin<T>(
  req: NextRequest,
  handler: (ctx: { userId: string }) => Promise<T>
): Promise<T> {
  const userId = req.headers.get("x-samik-user-id");
  const role = req.headers.get("x-samik-role");
  if (!userId || role !== "SUPER_ADMIN") {
    return forbiddenResponse("این عملیات نیازمند نقش مدیر سامانه است.") as unknown as T;
  }
  try {
    // SuperAdmin runs WITHOUT a tenant context (schoolId = null)
    return await runWithTenant({ userId, schoolId: null, role, bypassTenantFilter: true }, () =>
      handler({ userId })
    );
  } catch (error) {
    console.error("[SUPER_ADMIN_GUARD_ERROR]", error);
    return internalServerErrorResponse() as unknown as T;
  }
}
