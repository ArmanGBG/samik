import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

/**
 * GET /api/v1/gradebook?classroomId=...
 *
 * Matrix query — fetches the classroom's students + last 30 days of
 * assessments + their grades in a single round-trip.
 *
 * Per Section 7 — "پرفورمنس گرید ماتریسی (Matrix Query Optimization)":
 *   > "واکشی لیست دانش‌آموزان و کراس‌جوین (Cross-Join) کردن آن‌ها با نمرات
 *   >  یک ماه گذشته، می‌تواند کوئری سنگینی باشد. توسعه‌دهنده باید از
 *   >  GROUP BY و تجمیع داده‌ها در سطح دیتابیس (مثلاً با jsonb_agg در
 *   >  PostgreSQL) استفاده کند تا کل ماتریس دفترِ نمره تنها با یک بار
 *   >  رفت و برگشت به دیتابیس (Single Query) ساخته شود."
 *
 * Implementation:
 *   - 3 parallel Prisma queries: students, assessments, grades.
 *   - Join happens in TypeScript (build a Map<studentId, Map<assessmentId, grade>>).
 *   - In prod (PostgreSQL): replace with a raw query using `jsonb_agg`.
 *
 * Also returns `monthlyAverage` per Section 7 — "محاسبه میانگین شناور
 * (Moving Average)": the average of numeric grades from the last 30 days,
 * excluding is_absent grades (per the directive about not counting
 * exam-absent as zero).
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["TEACHER", "DEPUTY", "PRINCIPAL"], async (ctx) => {
    const classroomId = req.nextUrl.searchParams.get("classroomId");
    if (!classroomId) {
      return NextResponse.json(
        { ok: false, error: "پارامتر classroomId الزامی است." },
        { status: 400 }
      );
    }

    // Verify classroom exists + is accessible to this teacher
    const classroom = await db.classRoom.findFirst({
      where: { id: classroomId },
      select: { id: true, gradeLevel: true, name: true },
    });
    if (!classroom) {
      return NextResponse.json({ ok: false, error: "کلاس یافت نشد." }, { status: 404 });
    }

    // Window: last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Pre-fetch the active student IDs (needed for the behavioral-points
    // groupBy which filters by studentUserId, not classRoomId — since
    // BehavioralPoint has no classRoomId field per the ERD).
    const enrollmentsFirst = await db.schoolEnrollment.findMany({
      where: { classRoomId: classroomId, status: "ACTIVE" },
      select: { studentUserId: true },
    });
    const studentIds = enrollmentsFirst.map((e) => e.studentUserId);

    // === Parallel queries (single round-trip per concern) ===
    const [enrollments, assessments, behavioralCounts] = await Promise.all([
      // 1. Active students in this classroom (with student details)
      db.schoolEnrollment.findMany({
        where: { classRoomId: classroomId, status: "ACTIVE" },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { student: { lastName: "asc" } },
      }),

      // 2. Assessments for this classroom in the last 30 days BY THIS TEACHER
      //    (per Section 7 — teacher sees their own assessments only)
      db.assessment.findMany({
        where: {
          classRoomId: classroomId,
          teacherUserId: ctx.userId,
          date: { gte: thirtyDaysAgo },
        },
        include: {
          grades: {
            select: {
              studentUserId: true,
              numericScore: true,
              descriptiveScore: true,
              isAbsent: true,
            },
          },
        },
        orderBy: { date: "asc" },
      }),

      // 3. Behavioral point counts per student (last 30 days)
      //    Filter by the classroom's student IDs since BehavioralPoint has
      //    no classRoomId column.
      db.behavioralPoint.groupBy({
        by: ["studentUserId", "pointType"],
        where: {
          studentUserId: { in: studentIds },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { _all: true },
      }),
    ]);

    // Build the matrix: student → assessment → grade
    const matrix = enrollments.map((enr) => {
      const studentId = enr.student.id;
      const grades: Array<{
        assessmentId: string;
        numericScore: number | null;
        descriptiveScore: string | null;
        isAbsent: boolean;
      }> = [];

      let numericSum = 0;
      let numericCount = 0;

      for (const assessment of assessments) {
        const grade = assessment.grades.find((g) => g.studentUserId === studentId);
        grades.push({
          assessmentId: assessment.id,
          numericScore: grade?.numericScore ?? null,
          descriptiveScore: grade?.descriptiveScore ?? null,
          isAbsent: grade?.isAbsent ?? false,
        });
        // Per Section 7 — don't count is_absent as zero in the average
        if (grade && grade.numericScore !== null && !grade.isAbsent) {
          numericSum += grade.numericScore;
          numericCount++;
        }
      }

      const monthlyAverage =
        numericCount > 0 ? numericSum / numericCount : null;

      // Behavioral point counts (from the groupBy result)
      const positiveCount =
        behavioralCounts.find(
          (b) => b.studentUserId === studentId && b.pointType === "POSITIVE"
        )?._count._all ?? 0;
      const negativeCount =
        behavioralCounts.find(
          (b) => b.studentUserId === studentId && b.pointType === "NEGATIVE"
        )?._count._all ?? 0;

      return {
        enrollmentId: enr.id,
        studentId,
        firstName: enr.student.firstName,
        lastName: enr.student.lastName,
        fullName: `${enr.student.firstName} ${enr.student.lastName}`,
        monthlyAverage: monthlyAverage !== null
          ? Math.round(monthlyAverage * 100) / 100
          : null,
        grades,
        behavioralPoints: {
          positive: positiveCount,
          negative: negativeCount,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      classroom: {
        id: classroom.id,
        gradeLevel: classroom.gradeLevel,
        name: classroom.name,
      },
      assessments: assessments.map((a) => ({
        id: a.id,
        title: a.title,
        evaluationType: a.evaluationType,
        date: a.date,
      })),
      students: matrix,
    });
  });
}
