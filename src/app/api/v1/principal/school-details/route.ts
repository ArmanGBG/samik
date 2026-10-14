import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

/**
 * GET /api/v1/principal/school-details
 *
 * Returns comprehensive details of the principal's active school,
 * identical in schema to /api/v1/super-admin/schools?id=...
 * Accessible by PRINCIPAL and DEPUTY.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async (ctx) => {
    try {
      const school = await db.school.findUnique({
        where: { id: ctx.schoolId },
        include: {
          staffEmployments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                  nationalCode: true,
                },
              },
            },
            orderBy: [{ role: "asc" }, { createdAt: "desc" }],
          },
          classrooms: {
            where: { deletedAt: null },
            include: {
              _count: {
                select: { enrollments: true },
              },
            },
            orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
          },
          subjects: {
            orderBy: { title: "asc" },
          },
          bellSchedules: {
            orderBy: { startTime: "asc" },
          },
          enrollments: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                  nationalCode: true,
                },
              },
              classRoom: {
                select: {
                  id: true,
                  name: true,
                  gradeLevel: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          },
          _count: {
            select: {
              staffEmployments: true,
              enrollments: true,
              classrooms: true,
              subjects: true,
              bellSchedules: true,
            },
          },
        },
      });

      if (!school) {
        return NextResponse.json({ ok: false, error: "مدرسه یافت نشد." }, { status: 404 });
      }

      const schoolWithFixedCount = {
        ...school,
        _count: {
          ...school._count,
          classrooms: school.classrooms.length,
        },
      };

      return NextResponse.json({ ok: true, school: schoolWithFixedCount });
    } catch (err) {
      console.error("[PRINCIPAL_SCHOOL_DETAILS_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در دریافت اطلاعات مدرسه." },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/v1/principal/school-details
 *
 * Update basic school info (e.g. name)
 */
export async function PATCH(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async (ctx) => {
    try {
      const body = await req.json();
      const updated = await db.school.update({
        where: { id: ctx.schoolId },
        data: {
          ...(body.name ? { name: String(body.name).trim() } : {}),
        },
      });
      return NextResponse.json({ ok: true, school: updated });
    } catch (err) {
      console.error("[PRINCIPAL_SCHOOL_UPDATE_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در به‌روزرسانی مشخصات مدرسه." },
        { status: 500 }
      );
    }
  });
}
