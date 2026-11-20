import { NextRequest, NextResponse } from "next/server";
import { withAcademyContext } from "@/lib/middleware-helpers/academy-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/academy/overview
 *
 * Academy dashboard overview statistics.
 */
export async function GET(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER"],
    async (ctx) => {
      try {
        const academy = await db.academy.findUnique({
          where: { id: ctx.academyId },
          include: {
            managerUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            classes: {
              include: {
                teacherUser: {
                  select: { id: true, firstName: true, lastName: true },
                },
                _count: {
                  select: {
                    enrollments: { where: { status: "ACTIVE" } },
                    sessions: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            staff: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        });

        if (!academy) {
          return NextResponse.json(
            { ok: false, error: "آموزشگاه یافت نشد." },
            { status: 404 }
          );
        }

        const totalClasses = academy.classes.length;
        const totalTeachers = academy.staff.filter((s) => s.role === "TEACHER").length;
        const totalStudents = academy.classes.reduce(
          (sum, c) => sum + c._count.enrollments,
          0
        );

        // Calculate attendance & assignment metrics across the academy
        const classIds = academy.classes.map((c) => c.id);
        const attendances = await db.academyAttendance.findMany({
          where: {
            session: {
              classId: { in: classIds },
            },
          },
          select: {
            status: true,
            assignmentDone: true,
          },
        });

        const totalRecords = attendances.length;
        const attendedCount = attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const assignmentCount = attendances.filter((a) => a.assignmentDone).length;

        const attendanceRate =
          totalRecords > 0 ? Math.round((attendedCount / totalRecords) * 100) : 100;
        const assignmentRate =
          totalRecords > 0 ? Math.round((assignmentCount / totalRecords) * 100) : 100;

        return NextResponse.json({
          ok: true,
          academy: {
            id: academy.id,
            name: academy.name,
            code: academy.code,
            province: academy.province,
            city: academy.city,
            phone: academy.phone,
            address: academy.address,
            managerName: academy.managerUser
              ? `${academy.managerUser.firstName} ${academy.managerUser.lastName}`.trim()
              : "",
          },
          stats: {
            totalClasses,
            totalTeachers,
            totalStudents,
            attendanceRate,
            assignmentRate,
          },
          classes: academy.classes.map((c) => ({
            id: c.id,
            name: c.name,
            teacherName: c.teacherUser
              ? `${c.teacherUser.firstName} ${c.teacherUser.lastName}`.trim()
              : "تعیین نشده",
            schedule: c.schedule || "—",
            studentsCount: c._count.enrollments,
            sessionsCount: c._count.sessions,
            qrToken: c.qrToken,
          })),
          teachers: academy.staff
            .filter((s) => s.role === "TEACHER")
            .map((s) => ({
              id: s.user.id,
              staffId: s.id,
              fullName: `${s.user.firstName} ${s.user.lastName}`.trim(),
              phoneNumber: s.user.phoneNumber,
              teachingSubject: s.teachingSubject || "—",
              bankCardNo: s.bankCardNo,
              shebaNo: s.shebaNo,
            })),
        });
      } catch (err: any) {
        console.error("[ACADEMY_OVERVIEW_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در دریافت اطلاعات آموزشگاه." },
          { status: 500 }
        );
      }
    }
  );
}
