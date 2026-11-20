import { NextRequest, NextResponse } from "next/server";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import { db } from "@/lib/db";

export interface AcademyCtx {
  userId: string;
  academyId: string;
  role: string;
}

export async function withAcademyContext<T>(
  req: NextRequest,
  allowedRoles: string[],
  handler: (ctx: AcademyCtx) => Promise<T>
): Promise<T> {
  const userId = req.headers.get("x-samik-user-id");
  const role = req.headers.get("x-samik-role");
  const tokenAcademyId = req.headers.get("x-samik-school-id");

  if (!userId || !role) {
    return NextResponse.json(
      { ok: false, error: "احراز هویت نشده‌اید." },
      { status: 401 }
    ) as unknown as T;
  }

  // SuperAdmin has top-level authority over all academies
  if (role === "SUPER_ADMIN") {
    const targetAcademyId =
      req.nextUrl.searchParams.get("academyId") ||
      req.headers.get("x-target-academy-id") ||
      (tokenAcademyId !== "__global__" ? tokenAcademyId : null);

    return runWithTenant({ bypassTenantFilter: true }, () =>
      handler({
        userId,
        academyId: targetAcademyId ?? "",
        role: "SUPER_ADMIN",
      })
    );
  }

  // Non-SuperAdmin: academyId MUST come from the contextual token
  const academyId = tokenAcademyId;

  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { ok: false, error: "نقش شما برای این عملیات مجاز نیست." },
      { status: 403 }
    ) as unknown as T;
  }

  if (!academyId) {
    return NextResponse.json(
      { ok: false, error: "شناسه آموزشگاه نامشخص است." },
      { status: 400 }
    ) as unknown as T;
  }

  try {
    return await runWithTenant({ bypassTenantFilter: true }, async () => {
      // Validate academy exists and is ACTIVE
      const academy = await db.academy.findUnique({
        where: { id: academyId },
        select: { id: true, status: true },
      });

      if (!academy || academy.status !== "ACTIVE") {
        return NextResponse.json(
          { ok: false, error: "آموزشگاه غیرفعال یا نامعتبر است." },
          { status: 403 }
        ) as unknown as T;
      }

      // If user is a staff member (manager, teacher, assistant), verify membership
      if (["ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT"].includes(role)) {
        const staff = await db.academyStaff.findUnique({
          where: {
            academyId_userId: {
              academyId,
              userId,
            },
          },
          select: { id: true, role: true },
        });

        if (!staff) {
          return NextResponse.json(
            { ok: false, error: "شما عضو کادر این آموزشگاه نیستید." },
            { status: 403 }
          ) as unknown as T;
        }
      }

      return handler({
        userId,
        academyId,
        role,
      });
    });
  } catch (err: any) {
    console.error("[ACADEMY_GUARD_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطا در اعتبارسنجی دسترسی به آموزشگاه." },
      { status: 500 }
    ) as unknown as T;
  }
}
