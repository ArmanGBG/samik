import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { dayToPersian } from "@/lib/timetable/days";
import { tehranDateKey } from "@/lib/timetable/tehran-time";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  return withTenantContext(req, ["TEACHER"], async (ctx) => {
    const { slotId } = await params;

    // 1. Fetch the slot
    const slot = await db.timetableSlot.findFirst({
      where: { id: slotId },
      include: {
        classRoom: true,
        subject: true,
        bellSchedule: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ ok: false, error: "کلاس یافت نشد." }, { status: 404 });
    }

    if (slot.teacherUserId !== ctx.userId) {
      return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز." }, { status: 403 });
    }

    // Today's school-local date. Resolved through the shared Tehran helper so
    // it can never disagree with the date the attendance POST validates against
    // (the old hard-coded +3.5h shift was a separate implementation of the same
    // rule, which is exactly how the two drifted apart).
    const todayStr = tehranDateKey();
    const todayDate = new Date(todayStr + "T00:00:00Z"); // Start of today in UTC

    // 1.5 If slot is part of a merged group, find peer slots in the same group
    const mergedSlots = slot.mergedGroupId
      ? await db.timetableSlot.findMany({
          where: {
            mergedGroupId: slot.mergedGroupId,
            schoolId: ctx.schoolId,
          },
          include: {
            classRoom: true,
          },
        })
      : [slot];

    const mergedClassroomIds = Array.from(new Set(mergedSlots.map((s) => s.classRoomId)));
    const mergedSlotIds = mergedSlots.map((s) => s.id);

    // 2. Fetch Active Students across all merged classrooms
    const enrollments = await db.schoolEnrollment.findMany({
      where: { classRoomId: { in: mergedClassroomIds }, status: "ACTIVE" },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        classRoom: {
          select: { id: true, name: true, gradeLevel: true },
        },
      },
      orderBy: [{ classRoom: { name: "asc" } }, { student: { lastName: "asc" } }],
    });
    const studentIds = enrollments.map(e => e.studentUserId);

    // 3. Fetch Today's ClassSession for this slot (and peers)
    const classSessions = await db.classSession.findMany({
      where: {
        timetableSlotId: { in: mergedSlotIds },
        date: todayDate,
      },
      include: {
        attendanceRecords: true,
      },
    });
    const allAttendanceRecords = classSessions.flatMap((cs) => cs.attendanceRecords);

    // 4. Fetch Today's Daily Assessment for these classrooms/subject
    const dailyAssessment = await db.assessment.findFirst({
      where: {
        classRoomId: { in: mergedClassroomIds },
        subjectId: slot.subjectId,
        teacherUserId: ctx.userId,
        date: todayDate,
        title: {
          contains: "فعالیت کلاسی",
        }
      },
      include: {
        grades: true,
      },
    });

    // 4.5 Fetch behavioral points sum & previous grades for context
    const pointsData = await db.behavioralPoint.findMany({
      where: { studentUserId: { in: studentIds }, subjectId: slot.subjectId },
      select: { studentUserId: true, pointType: true }
    });
    const pointsMap = new Map<string, number>();
    for (const p of pointsData) {
      const current = pointsMap.get(p.studentUserId) ?? 0;
      pointsMap.set(p.studentUserId, current + (p.pointType === "POSITIVE" ? 1 : -1));
    }

    // Recent assessments (last 3 weeks)
    const threeWeeksAgo = new Date(todayDate);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const recentAssessments = await db.assessment.findMany({
      where: {
        classRoomId: { in: mergedClassroomIds },
        subjectId: slot.subjectId,
        teacherUserId: ctx.userId,
        date: { lt: todayDate, gte: threeWeeksAgo },
      },
      orderBy: { date: "asc" },
      include: { grades: true }
    });

    // 5. Build Unified Matrix
    const students = enrollments.map(enr => {
      const studentId = enr.student.id;
      
      // Attendance State
      let attendanceState = "PRESENT"; // Default
      const record = allAttendanceRecords.find(r => r.studentUserId === studentId);
      if (record) {
        attendanceState = record.status;
      }

      // Grade
      let numericScore: number | null = null;
      let descriptiveScore: string | null = null;
      let isAbsentGrade = false;
      if (dailyAssessment) {
        const grade = dailyAssessment.grades.find(g => g.studentUserId === studentId);
        if (grade) {
          numericScore = grade.numericScore as any;
          descriptiveScore = grade.descriptiveScore as any;
          isAbsentGrade = grade.isAbsent;
        }
      }

      // Historical Grades for recent assessments
      const historicalGrades = recentAssessments.map(a => {
        const g = a.grades.find(gr => gr.studentUserId === studentId);
        return {
          assessmentId: a.id,
          numericScore: g?.numericScore ?? null,
          descriptiveScore: g?.descriptiveScore ?? null,
          isAbsent: g?.isAbsent ?? false,
        };
      });

      const studentClassroom = enr.classRoom
        ? `${enr.classRoom.gradeLevel} ${enr.classRoom.name}`
        : "";

      return {
        id: studentId,
        enrollmentId: enr.id,
        firstName: enr.student.firstName,
        lastName: enr.student.lastName,
        fullName: `${enr.student.firstName} ${enr.student.lastName}`,
        classroomName: studentClassroom,
        classRoomId: enr.classRoom?.id ?? "",
        attendanceState,
        totalPoints: pointsMap.get(studentId) ?? 0,
        historicalGrades,
        grade: {
          numericScore,
          descriptiveScore,
          isAbsent: isAbsentGrade,
        }
      };
    });

    const isMerged = mergedSlots.length > 1;
    const compositeClassroomName = isMerged
      ? mergedSlots.map((s) => `${s.classRoom.gradeLevel} ${s.classRoom.name}`).join(" + ")
      : `${slot.classRoom.gradeLevel} ${slot.classRoom.name}`;

    return NextResponse.json({
      ok: true,
      slot: {
        id: slot.id,
        subjectTitle: slot.subject.title,
        // The client needs the id to create the daily activity assessment;
        // it previously read `slot.subject.id`, which this payload never had.
        subjectId: slot.subject.id,
        classroomName: compositeClassroomName,
        classRoomId: slot.classRoomId,
        isMerged,
        mergedClassroomIds,
        mergedSlotIds,
        bellTitle: slot.bellSchedule.title,
        startTime: slot.bellSchedule.startTime,
        endTime: slot.bellSchedule.endTime,
        dayOfWeek: slot.dayOfWeek,
        weekType: slot.weekType,
        date: todayStr,
      },
      dailyAssessmentId: dailyAssessment?.id ?? null,
      evaluationType: dailyAssessment?.evaluationType ?? "NUMERIC",
      students,
      recentAssessments: recentAssessments.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date.toISOString().split("T")[0],
        evaluationType: a.evaluationType,
      })),
    });
  });
}
