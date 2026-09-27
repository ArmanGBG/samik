import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { runBypassingTenant } from "@/lib/prisma/tenant-context";

const QuerySchema = z.object({
  enrollmentId: z.string().uuid(),
});

/**
 * GET /api/v1/student/dashboard?enrollmentId=...
 *
 * Aggregate dashboard for the student/parent (Section 7 — "Reporting &
 * Visibility" + Section 4 — "آنچه دانش‌آموز/ولی می‌بیند").
 *
 * Returns:
 *   - Top stats: total absences, positive points, negative points
 *   - Grades timeline (for recharts LineChart): numeric grades sorted by date
 *   - Behavioral feed: latest 20 behavioral points with tags
 *   - Attendance breakdown: counts by status
 *
 * The `enrollmentId` parameter lets the user switch between multiple
 * enrollments (e.g. different academic years or different children).
 * The query BYPASSES the tenant filter because the enrollment may be in
 * a DIFFERENT school than the one in the contextual token (the user
 * picks the enrollment from the cross-school list).
 *
 * Per Section 7 — "خروجی برای اولیا":
 *   > "نمرات عددی روی یک نمودار خطی (روند پیشرفت) و امتیازات مثبت/منفی
 *   >  به صورت یک کانتر (Counter) در بالای پروفایل نشان داده می‌شود."
 */
export async function GET(req: NextRequest) {
  // Verify role
  const role = req.headers.get("x-samik-role");
  const userId = req.headers.get("x-samik-user-id");
  if (!userId || role !== "STUDENT") {
    return NextResponse.json(
      { ok: false, error: "این عملیات نیازمند نقش دانش‌آموز/ولی است." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const enrollmentIdParam = url.searchParams.get("enrollmentId");
  if (!enrollmentIdParam) {
    return NextResponse.json(
      { ok: false, error: "پارامتر enrollmentId الزامی است." },
      { status: 400 }
    );
  }

  return runBypassingTenant(async () => {
    let enrollmentId: string;
    try {
      enrollmentId = QuerySchema.parse({ enrollmentId: enrollmentIdParam }).enrollmentId;
    } catch {
      return NextResponse.json(
        { ok: false, error: "enrollmentId نامعتبر است." },
        { status: 400 }
      );
    }

    // Verify the enrollment exists + the user is authorized to see it
    // (either guardian phone matches, or it's the one in their token)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
    }

    const enrollment = await db.schoolEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        school: { select: { id: true, name: true } },
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!enrollment) {
      return NextResponse.json({ ok: false, error: "عضویت یافت نشد." }, { status: 404 });
    }

    // Authorization: the user's phone must match the guardian phone
    if (
      enrollment.guardianPhone1 !== user.phoneNumber &&
      enrollment.guardianPhone2 !== user.phoneNumber
    ) {
      return NextResponse.json(
        { ok: false, error: "شما به این عضویت دسترسی ندارید." },
        { status: 403 }
      );
    }

    const studentId = enrollment.student.id;
    const schoolId = enrollment.schoolId;

    // === Parallel aggregate queries ===
    const [grades, behavioralPoints, attendanceRecords] = await Promise.all([
      // 1. All NUMERIC grades for this student in this school
      //    (cross-classroom — the student may have multiple subjects)
      db.grade.findMany({
        where: {
          studentUserId: studentId,
          schoolId,
          numericScore: { not: null },
          isAbsent: false,
        },
        include: {
          assessment: {
            select: { id: true, title: true, date: true, classRoomId: true },
          },
        },
        orderBy: { assessment: { date: "asc" } },
      }),

      // 2. Latest 20 behavioral points
      db.behavioralPoint.findMany({
        where: { studentUserId: studentId, schoolId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          teacher: { select: { firstName: true, lastName: true } },
        },
      }),

      // 3. Attendance records (for stats)
      db.attendanceRecord.findMany({
        where: { studentUserId: studentId, schoolId },
        select: { status: true, classSession: { select: { date: true } } },
        orderBy: { classSession: { date: "desc" } },
      }),
    ]);

    // Build the grades timeline for recharts
    const gradesTimeline = grades.map((g) => ({
      date: g.assessment.date.toISOString(),
      score: g.numericScore,
      assessmentTitle: g.assessment.title,
    }));

    // Attendance stats
    const attendanceStats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((r) => r.status === "PRESENT").length,
      absent: attendanceRecords.filter((r) => r.status === "ABSENT").length,
      late: attendanceRecords.filter((r) => r.status === "LATE").length,
      excused: attendanceRecords.filter((r) => r.status === "EXCUSED").length,
    };

    // Behavioral stats
    const behavioralStats = {
      positive: behavioralPoints.filter((b) => b.pointType === "POSITIVE").length,
      negative: behavioralPoints.filter((b) => b.pointType === "NEGATIVE").length,
    };

    // Recent attendance (last 10)
    const recentAttendance = attendanceRecords.slice(0, 10).map((r) => ({
      date: r.classSession.date.toISOString(),
      status: r.status,
    }));

    return NextResponse.json({
      ok: true,
      enrollment: {
        id: enrollment.id,
        schoolName: enrollment.school.name,
        classRoomName: `${enrollment.classRoom.gradeLevel} ${enrollment.classRoom.name}`,
        academicYear: enrollment.academicYear,
        status: enrollment.status,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      },
      stats: {
        absences: attendanceStats.absent,
        lates: attendanceStats.late,
        positivePoints: behavioralStats.positive,
        negativePoints: behavioralStats.negative,
        totalSessions: attendanceStats.total,
      },
      gradesTimeline,
      behavioralPoints: behavioralPoints.map((b) => ({
        id: b.id,
        pointType: b.pointType,
        reasonTag: b.reasonTag,
        teacherName: `${b.teacher.firstName} ${b.teacher.lastName}`,
        createdAt: b.createdAt.toISOString(),
      })),
      attendanceStats,
      recentAttendance,
    });
  });
}
