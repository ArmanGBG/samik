import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

/**
 * GET /api/v1/teacher/students?classroomId=...
 *
 * List all ACTIVE students enrolled in a classroom. Used by:
 *   - Teacher Roll-Call UI (per-slot student list)
 *   - Teacher Gradebook (matrix rows)
 *
 * Per Section 4 of the architecture doc — students are linked to the
 * classroom via SchoolEnrollment. We only return ACTIVE enrollments
 * (not ARCHIVED or PENDING_CONFIRMATION).
 *
 * The tenant extension auto-filters by schoolId, so we don't need to
 * explicitly add it to the where clause.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["TEACHER", "DEPUTY", "PRINCIPAL"], async () => {
    const classroomId = req.nextUrl.searchParams.get("classroomId");
    if (!classroomId) {
      return NextResponse.json(
        { ok: false, error: "پارامتر classroomId الزامی است." },
        { status: 400 }
      );
    }

    // Verify the classroom exists in this school (tenant filter active)
    const classroom = await db.classRoom.findFirst({
      where: { id: classroomId },
      select: { id: true, gradeLevel: true, name: true },
    });
    if (!classroom) {
      return NextResponse.json(
        { ok: false, error: "کلاس یافت نشد." },
        { status: 404 }
      );
    }

    const enrollments = await db.schoolEnrollment.findMany({
      where: {
        classRoomId: classroomId,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalCode: true,
          },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });

    return NextResponse.json({
      ok: true,
      classroom: {
        id: classroom.id,
        gradeLevel: classroom.gradeLevel,
        name: classroom.name,
      },
      students: enrollments.map((e) => ({
        enrollmentId: e.id,
        id: e.student.id,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        fullName: `${e.student.firstName} ${e.student.lastName}`,
        guardianPhone1: e.guardianPhone1,
        guardianPhone2: e.guardianPhone2,
      })),
    });
  });
}
