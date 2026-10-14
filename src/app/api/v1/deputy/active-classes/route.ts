// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { resolveActiveClasses } from "@/lib/timetable/active-classes";
import { hhmmToPersian } from "@/lib/timetable/time-utils";

import { zonedDayRangeUtc } from "@/lib/timetable/tehran-time";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/deputy/active-classes
 *
 * The classes that are live right now, resolved on the server in the school's
 * timezone and honouring week parity (ALL_WEEKS / ODD / EVEN / SINGLE_SESSION).
 *
 * This replaces the client-side computation that previously lived in
 * `live-dashboard.tsx`, which read the visitor's browser clock and ignored
 * `weekType` entirely — so it disagreed with the teacher dashboard.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "SUPER_ADMIN"], async (ctx) => {
    const url = new URL(req.url);
    const schoolId = url.searchParams.get("schoolId") || ctx.schoolId;

    try {
      const result = await resolveActiveClasses(schoolId);
      
      const { db } = await import("@/lib/db");
      const { gte, lte } = zonedDayRangeUtc(result.now.dateKey);

      // Load today's absentees (spanning the full Tehran calendar day)
      const todaysSessions = await db.classSession.findMany({
        where: {
          schoolId,
          date: { gte, lte },
          status: "SUBMITTED"
        },
        include: {
          timetableSlot: {
            include: {
              classRoom: true,
              subject: true,
              teacher: true,
            }
          },
          attendanceRecords: {
            where: { status: "ABSENT" },
            include: { 
              student: {
                include: {
                  studentEnrollments: {
                    where: { schoolId },
                    select: { guardianPhone1: true }
                  }
                }
              } 
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const initialAbsentees = [];
      for (const session of todaysSessions) {
        for (const record of session.attendanceRecords) {
          initialAbsentees.push({
            id: `${session.id}-${record.studentUserId}`,
            studentId: record.studentUserId,
            studentName: `${record.student.firstName} ${record.student.lastName}`,
            classroomName: `پایه ${session.timetableSlot.classRoom.gradeLevel} - ${session.timetableSlot.classRoom.name}`,
            subjectTitle: session.timetableSlot.subject.title,
            teacherName: `${session.timetableSlot.teacher.firstName} ${session.timetableSlot.teacher.lastName}`,
            submittedAt: session.createdAt.toISOString(),
            status: "ABSENT",
            guardianPhone: record.student.studentEnrollments?.[0]?.guardianPhone1 ?? null,
            classSessionId: session.id,
            schoolId: schoolId,
          });
        }
      }

      // Load today's behavioral points
      const todaysPoints = await db.behavioralPoint.findMany({
        where: {
          schoolId,
          createdAt: { gte }
        },
        include: {
          student: true,
          subject: true,
          teacher: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      const initialBehavioral = todaysPoints.map(p => ({
        id: p.id,
        studentId: p.studentUserId,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        classroomName: p.subject.title,
        pointType: p.pointType,
        reasonTag: p.reasonTag || null,
        teacherName: `${p.teacher.firstName} ${p.teacher.lastName}`,
        createdAt: p.createdAt.toISOString(),
        schoolId: p.schoolId,
      }));
      return NextResponse.json({
        ok: true,
        initialAbsentees,
        initialBehavioral,
        activeClasses: result.active.map((c) => ({
          slotId: c.slotId,
          classRoomId: c.classRoomId,
          classroomName: c.classRoomName,
          subjectTitle: c.subjectTitle,
          teacherName: c.teacherName,
          bellTitle: c.bellTitle,
          startTime: c.startTime,
          endTime: c.endTime,
          startTimeFa: hhmmToPersian(c.startTime),
          endTimeFa: hhmmToPersian(c.endTime),
          weekType: c.weekType,
          minutesSinceStart: c.minutesSinceStart,
          hasSubmittedAttendance: c.hasSubmittedAttendance,
        })),
        now: {
          ...result.now,
          hhmmFa: hhmmToPersian(result.now.hhmm),
        },
      });
    } catch (err) {
      console.error("[ACTIVE_CLASSES_DB_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطای سرور در بارگذاری کلاس‌های در حال برگزاری." },
        { status: 500 }
      );
    }
  });
}
