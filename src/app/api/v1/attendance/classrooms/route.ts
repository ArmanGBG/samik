import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { tehranDateKey } from "@/lib/timetable/tehran-time";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/attendance/classrooms
 *
 * For Principal, Deputy, and Super Admin:
 * 1. If called without `classroomId`: returns all active classrooms in the school with their student count and slots.
 * 2. If called with `classroomId`: returns detailed classroom info, list of active students, and slots for today or general.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "SUPER_ADMIN"], async (ctx) => {
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const dateQuery = searchParams.get("date") || tehranDateKey();

    try {
      if (!classroomId) {
        // Return summary of all classrooms in the school
        const classrooms = await db.classRoom.findMany({
          where: { schoolId: ctx.schoolId },
          orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
          include: {
            _count: {
              select: {
                enrollments: {
                  where: { status: "ACTIVE" },
                },
              },
            },
            timetableSlots: {
              include: {
                subject: { select: { id: true, title: true } },
                teacher: { select: { id: true, firstName: true, lastName: true } },
                bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
              },
              orderBy: [{ dayOfWeek: "asc" }, { bellSchedule: { startTime: "asc" } }],
            },
          },
        });

        return NextResponse.json({
          ok: true,
          classrooms: classrooms.map((c) => ({
            id: c.id,
            name: c.name,
            gradeLevel: c.gradeLevel,
            major: c.major,
            studentCount: c._count.enrollments,
            slots: c.timetableSlots.map((s) => ({
              id: s.id,
              dayOfWeek: s.dayOfWeek,
              subjectTitle: s.subject.title,
              teacherName: `${s.teacher.firstName || ""} ${s.teacher.lastName || ""}`.trim(),
              bellTitle: s.bellSchedule.title,
              startTime: s.bellSchedule.startTime,
              endTime: s.bellSchedule.endTime,
            })),
          })),
        });
      }

      // Specific classroom requested: fetch students & slots
      const classroom = await db.classRoom.findFirst({
        where: { id: classroomId, schoolId: ctx.schoolId },
        include: {
          timetableSlots: {
            include: {
              subject: { select: { id: true, title: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
              bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
            },
            orderBy: [{ dayOfWeek: "asc" }, { bellSchedule: { startTime: "asc" } }],
          },
        },
      });

      if (!classroom) {
        return NextResponse.json({ ok: false, error: "کلاس درس یافت نشد." }, { status: 404 });
      }

      // If the classroom has no timetable slots at all, find or create a general slot
      let availableSlots = classroom.timetableSlots;
      if (availableSlots.length === 0) {
        // Check if school has at least one subject and bell schedule
        let subject = await db.subject.findFirst({
          where: { schoolId: ctx.schoolId },
        });
        if (!subject) {
          subject = await db.subject.create({
            data: {
              schoolId: ctx.schoolId,
              title: "حضور و غیاب عمومی",
            },
          });
        }

        let bell = await db.bellSchedule.findFirst({
          where: { schoolId: ctx.schoolId },
        });
        if (!bell) {
          bell = await db.bellSchedule.create({
            data: {
              schoolId: ctx.schoolId,
              title: "زنگ عمومی",
              startTime: "08:00",
              endTime: "09:30",
            },
          });
        }

        const fallbackSlot = await db.timetableSlot.create({
          data: {
            schoolId: ctx.schoolId,
            classRoomId: classroom.id,
            subjectId: subject.id,
            teacherUserId: ctx.userId,
            bellScheduleId: bell.id,
            dayOfWeek: 0,
            weekType: "ALL_WEEKS",
          },
          include: {
            subject: { select: { id: true, title: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
          },
        });

        availableSlots = [fallbackSlot];
      }

      // Active students enrolled in this classroom
      const enrollments = await db.schoolEnrollment.findMany({
        where: {
          classRoomId: classroom.id,
          status: "ACTIVE",
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nationalCode: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      });

      // Check existing attendance for this classroom and date if any
      const targetSlotIds = availableSlots.map((s) => s.id);
      const targetDate = new Date(dateQuery + "T00:00:00Z");

      const existingSessions = await db.classSession.findMany({
        where: {
          timetableSlotId: { in: targetSlotIds },
          date: targetDate,
        },
        include: {
          attendanceRecords: true,
        },
      });

      return NextResponse.json({
        ok: true,
        classroom: {
          id: classroom.id,
          name: classroom.name,
          gradeLevel: classroom.gradeLevel,
          major: classroom.major,
        },
        slots: availableSlots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          subjectTitle: s.subject.title,
          teacherName: `${s.teacher.firstName || ""} ${s.teacher.lastName || ""}`.trim(),
          bellTitle: s.bellSchedule.title,
          startTime: s.bellSchedule.startTime,
          endTime: s.bellSchedule.endTime,
        })),
        students: enrollments.map((e) => {
          // Check if this student was marked absent in any of today's sessions for this class
          const isAbsent = existingSessions.some((cs) =>
            cs.attendanceRecords.some(
              (ar) => ar.studentUserId === e.student.id && ar.status === "ABSENT"
            )
          );

          return {
            id: e.student.id,
            enrollmentId: e.id,
            firstName: e.student.firstName,
            lastName: e.student.lastName,
            fullName: `${e.student.firstName} ${e.student.lastName}`.trim(),
            nationalCode: e.student.nationalCode,
            phoneNumber: e.student.phoneNumber,
            guardianPhone1: e.guardianPhone1,
            guardianPhone2: e.guardianPhone2,
            initialAttendance: isAbsent ? "ABSENT" : "PRESENT",
          };
        }),
      });
    } catch (err) {
      console.error("[ATTENDANCE_CLASSROOMS_GET_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در دریافت لیست کلاس‌ها و دانش‌آموزان." },
        { status: 500 }
      );
    }
  });
}
