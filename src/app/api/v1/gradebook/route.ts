import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/gradebook?classroomId=...&subjectId=...
 *
 * Matrix query — fetches the classroom's students + last 30 days of
 * assessments + their grades in a single round-trip.
 *
 * The gradebook is scoped to ONE lesson, `(classroomId, subjectId)`, and both
 * parameters are required. Without the subject scope a class taught by one
 * teacher across several subjects would merge every subject's assessments,
 * discipline points and attendance into a single matrix.
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
    const subjectId = req.nextUrl.searchParams.get("subjectId");
    if (!classroomId || !UUID_RE.test(classroomId)) {
      return NextResponse.json(
        { ok: false, error: "پارامتر classroomId نامعتبر است." },
        { status: 400 }
      );
    }
    if (!subjectId || !UUID_RE.test(subjectId)) {
      return NextResponse.json(
        { ok: false, error: "پارامتر subjectId نامعتبر است." },
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

    // A TEACHER may only see their own classes; DEPUTY and PRINCIPAL see all.
    // `TenantCtx` exposes a single `role`, so a plain equality check is correct
    // here. The previous `ctx.roles.includes(...)` threw on every request
    // (`ctx.roles` is undefined), which surfaced as "class not found".
    const restrictToOwnSlots = ctx.role === "TEACHER";
    const teacherScope = restrictToOwnSlots ? { teacherUserId: ctx.userId } : {};

    // Find the subject(s) this viewer may read in this classroom. A TEACHER
    // must actually teach the pair, otherwise the gradebook is empty anyway.
    const slots = await db.timetableSlot.findMany({
      where: {
        classRoomId: classroomId,
        subjectId,
        ...teacherScope,
      },
      include: {
        subject: { select: { title: true } }
      }
    });
    const subjects = Array.from(new Set(slots.map(s => s.subject.title)));

    // 1. Active students in this classroom (with student details)
    const enrollments = await db.schoolEnrollment.findMany({
      where: { classRoomId: classroomId, status: "ACTIVE" },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });
    const studentIds = enrollments.map((e) => e.studentUserId);

    // === Parallel queries for assessments & behavioral points & absences ===
    const [assessments, behavioralCounts, sessions] = await Promise.all([
      // 2. ALL Assessments for this classroom + subject BY THIS TEACHER
      db.assessment.findMany({
        where: {
          classRoomId: classroomId,
          subjectId,
          ...teacherScope,
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

      // 3. ALL Behavioral point counts per student — restricted to this
      // subject, so discipline raised in another lesson is not counted here.
      db.behavioralPoint.groupBy({
        by: ["studentUserId", "pointType"],
        where: {
          studentUserId: { in: studentIds },
          subjectId,
        },
        _count: { _all: true },
      }),

      // 4. ALL ClassSessions for this classroom + subject
      db.classSession.findMany({
        where: {
          timetableSlot: {
            classRoomId: classroomId,
            subjectId,
            ...teacherScope,
          },
          status: "SUBMITTED"
        },
        include: {
          attendanceRecords: {
            where: { studentUserId: { in: studentIds } },
            select: { studentUserId: true, status: true }
          }
        },
        orderBy: { date: "asc" }
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
        if (grade && grade.numericScore !== null && !grade.isAbsent) {
          numericSum += grade.numericScore;
          numericCount++;
        }
      }

      const termAverage =
        numericCount > 0 ? numericSum / numericCount : null;

      const positiveCount =
        behavioralCounts.find(
          (b) => b.studentUserId === studentId && b.pointType === "POSITIVE"
        )?._count._all ?? 0;
      const negativeCount =
        behavioralCounts.find(
          (b) => b.studentUserId === studentId && b.pointType === "NEGATIVE"
        )?._count._all ?? 0;
        
      
      const attendance = sessions.map(s => {
        const record = s.attendanceRecords.find(r => r.studentUserId === studentId);
        return {
          sessionId: s.id,
          status: record ? record.status : "PRESENT"
        };
      });
      const totalAbsences = attendance.filter(a => a.status === "ABSENT").length;


      return {
        enrollmentId: enr.id,
        studentId,
        firstName: enr.student.firstName,
        lastName: enr.student.lastName,
        fullName: `${enr.student.firstName} ${enr.student.lastName}`,
        monthlyAverage: termAverage !== null
          ? Math.round(termAverage * 100) / 100
          : null,
        grades,
        attendance,
        behavioralPoints: {
          positive: positiveCount,
          negative: negativeCount,
        },
        totalAbsences,
      };
    });

    return NextResponse.json({
      ok: true,
      classroom: {
        id: classroom.id,
        gradeLevel: classroom.gradeLevel,
        name: classroom.name,
        subjects,
      },
      sessions: sessions.map(s => ({ id: s.id, date: s.date.toISOString().slice(0,10) })),
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
