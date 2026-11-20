import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/academy/student/classes
 *
 * Returns all active academy classes and attendance history for the logged-in student.
 */
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-samik-user-id");
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "احراز هویت نشده‌اید." },
      { status: 401 }
    );
  }

  try {
    return await runWithTenant({ bypassTenantFilter: true }, async () => {
      const enrollments = await db.academyEnrollment.findMany({
        where: {
          studentUserId: userId,
          status: "ACTIVE",
        },
        include: {
          class: {
            include: {
              academy: { select: { id: true, name: true, code: true } },
              teacherUser: {
                select: { id: true, firstName: true, lastName: true },
              },
              sessions: {
                orderBy: { sessionNum: "desc" },
                include: {
                  attendances: {
                    where: { studentUserId: userId },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const classes = enrollments.map((e) => {
        const cls = e.class;
        const joinedAt = e.joinedAtSessionNum;

        // Only sessions >= joinedAtSessionNum are relevant for this student
        const eligibleSessions = cls.sessions.filter(
          (s) => s.sessionNum >= joinedAt
        );

        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        let missingAssignments = 0;
        let recordedCount = 0;

        const sessionsList = eligibleSessions.map((s) => {
          const att = s.attendances[0];
          const hasRecord = !!att;
          const status = att ? att.status : ("NOT_RECORDED" as const);
          const assignmentDone = att ? att.assignmentDone : true;

          if (hasRecord) {
            recordedCount++;
            if (status === "PRESENT") presentCount++;
            else if (status === "LATE") lateCount++;
            else if (status === "ABSENT") absentCount++;
            if (!assignmentDone) missingAssignments++;
          }

          return {
            id: s.id,
            sessionNum: s.sessionNum,
            name: s.name,
            date: s.date.toISOString(),
            status,
            assignmentDone,
          };
        });

        const totalEligible = eligibleSessions.length;
        const attendanceRate =
          recordedCount > 0
            ? Math.round(((presentCount + lateCount) / recordedCount) * 100)
            : 100;

        return {
          enrollmentId: e.id,
          classId: cls.id,
          name: cls.name,
          schedule: cls.schedule || "—",
          academyName: cls.academy.name,
          teacherName: cls.teacherUser
            ? `${cls.teacherUser.firstName} ${cls.teacherUser.lastName}`.trim()
            : "تعیین نشده",
          joinedAtSessionNum: joinedAt,
          totalSessions: totalEligible,
          presentCount,
          lateCount,
          absentCount,
          missingAssignments,
          attendanceRate,
          sessions: sessionsList,
        };
      });

      return NextResponse.json({ ok: true, classes });
    });
  } catch (err: any) {
    console.error("[GET_STUDENT_ACADEMY_CLASSES_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطا در دریافت کلاس‌های کنکور." },
      { status: 500 }
    );
  }
}
