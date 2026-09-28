import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { runBypassingTenant } from "@/lib/prisma/tenant-context";

/**
 * GET /api/v1/student/enrollments
 *
 * List ALL enrollments for the current student/parent — including
 * ARCHIVED ones from previous academic years/schools.
 *
 * Per Section 4 — "آنچه دانش‌آموز/ولی می‌بیند":
 *   > "دانش‌آموز مالک سوابق خود است. او در پروفایل خود می‌تواند با
 *   >  تغییر فیلترِ «سال تحصیلی»، کارنامه‌ها و سوابق حضور و غیاب خود
 *   >  را در تمام مدارسی که تا به حال بوده، به صورت یکپارچه مشاهده کند."
 *
 * CRITICAL: This query BYPASSES the tenant filter (runBypassingTenant)
 * because the student may have enrollments in MULTIPLE schools. This is
 * the documented exception — same pattern as the global conflict detector.
 */
export async function GET(req: NextRequest) {
  // We need the user ID from the JWT — but the student dashboard is
  // accessed via a contextual token that carries `studentEnrollmentId`.
  // We'll fetch ALL enrollments matching this user's phone (as guardian)
  // OR where the user IS the student.
  const userId = req.headers.get("x-samik-user-id");
  const enrollmentId = req.headers.get("x-samik-enrollment-id");
  const role = req.headers.get("x-samik-role");
  if (!userId || role !== "STUDENT") {
    return NextResponse.json(
      { ok: false, error: "این عملیات نیازمند نقش دانش‌آموز/ولی است." },
      { status: 403 }
    );
  }

  return runBypassingTenant(async () => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, phoneNumber: true, firstName: true, lastName: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
    }

    // Find all enrollments where:
    //   - the student's guardian phone matches this user's phone, OR
    //   - the enrollment ID matches the one in the contextual token
    // This gives the parent/guardian access to all their children's records.
    const enrollments = await db.schoolEnrollment.findMany({
      where: {
        OR: [
          { guardianPhone1: user.phoneNumber },
          { guardianPhone2: user.phoneNumber },
          { studentUserId: user.id },
          ...(enrollmentId ? [{ id: enrollmentId }] : []),
        ],
      },
      include: {
        school: { select: { id: true, name: true, subdomain: true } },
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { academicYear: "desc" },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      enrollments: enrollments.map((e) => ({
        id: e.id,
        schoolId: e.schoolId,
        schoolName: e.school.name,
        classRoomName: `${e.classRoom.gradeLevel} ${e.classRoom.name}`,
        academicYear: e.academicYear,
        status: e.status,
        studentId: e.student.id,
        studentName: `${e.student.firstName} ${e.student.lastName}`,
        studentFirstName: e.student.firstName,
        studentLastName: e.student.lastName,
      })),
    });
  });
}
