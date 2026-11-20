import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { toPersianDate, toPersianDateTime } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/attendance/history
 *
 * Returns submitted attendance sessions history for Principal, Deputy, and Super Admin.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "SUPER_ADMIN"], async (ctx) => {
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const dateQuery = searchParams.get("date");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    try {
      const whereClause: any = {
        schoolId: ctx.schoolId,
        status: "SUBMITTED",
      };

      if (classroomId) {
        whereClause.timetableSlot = {
          classRoomId: classroomId,
        };
      }

      if (dateQuery) {
        const startOfDay = new Date(`${dateQuery}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateQuery}T23:59:59.999Z`);
        whereClause.date = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      const sessions = await db.classSession.findMany({
        where: whereClause,
        orderBy: [{ date: "desc" }, { submittedAt: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
          timetableSlot: {
            include: {
              classRoom: { select: { id: true, name: true, gradeLevel: true } },
              subject: { select: { id: true, title: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
              bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
            },
          },
          attendanceRecords: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  nationalCode: true,
                  phoneNumber: true,
                  studentEnrollments: {
                    where: { schoolId: ctx.schoolId },
                    select: { guardianPhone1: true, guardianPhone2: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      const formattedSessions = sessions.map((s) => {
        const slot = s.timetableSlot;
        const totalCount = s.attendanceRecords.length;
        const absentRecords = s.attendanceRecords.filter((ar) => ar.status === "ABSENT");
        const presentRecords = s.attendanceRecords.filter((ar) => ar.status === "PRESENT");

        const classroomName = slot?.classRoom
          ? `${slot.classRoom.gradeLevel} ${slot.classRoom.name}`
          : "کلاس نامشخص";
        const subjectTitle = slot?.subject?.title || "درس نامشخص";
        const teacherName = slot?.teacher
          ? `${slot.teacher.firstName || ""} ${slot.teacher.lastName || ""}`.trim()
          : "نامشخص";
        const bellTitle = slot?.bellSchedule?.title || "زنگ نامشخص";
        const bellTime = slot?.bellSchedule
          ? `${slot.bellSchedule.startTime} - ${slot.bellSchedule.endTime}`
          : "";

        return {
          id: s.id,
          slotId: s.timetableSlotId,
          classRoomId: slot?.classRoom?.id || "",
          classroomName,
          subjectTitle,
          teacherName,
          bellTitle,
          bellTime,
          date: s.date.toISOString().slice(0, 10),
          dateFa: toPersianDate(s.date),
          submittedAt: s.submittedAt?.toISOString() || s.createdAt.toISOString(),
          submittedAtFa: toPersianDateTime(s.submittedAt || s.createdAt),
          totalCount,
          presentCount: presentRecords.length,
          absentCount: absentRecords.length,
          absentees: absentRecords.map((ar) => {
            const enrollment = ar.student.studentEnrollments?.[0];
            return {
              id: ar.student.id,
              fullName: `${ar.student.firstName} ${ar.student.lastName}`.trim(),
              nationalCode: ar.student.nationalCode,
              guardianPhone: enrollment?.guardianPhone1 || ar.student.phoneNumber || "—",
            };
          }),
        };
      });

      return NextResponse.json({
        ok: true,
        sessions: formattedSessions,
      });
    } catch (err) {
      console.error("[ATTENDANCE_HISTORY_GET_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در دریافت تاریخچه حضور و غیاب." },
        { status: 500 }
      );
    }
  });
}
