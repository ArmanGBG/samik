import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

/**
 * GET /api/v1/deputy/teachers
 *
 * List all teachers in the active school. Used by the Timetable Builder
 * to populate the teacher dropdown.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async () => {
    const employments = await db.staffEmployment.findMany({
      where: { role: "TEACHER" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
      },
      orderBy: { user: { firstName: "asc" } },
    });
    // Count slots per teacher in a separate query (Prisma doesn't allow
    // filtering _count in include; we do it manually for clarity).
    const counts = await Promise.all(
      employments.map((e) =>
        db.timetableSlot.count({ where: { teacherUserId: e.user.id } })
      )
    );
    return NextResponse.json({
      ok: true,
      teachers: employments.map((e, i) => ({
        id: e.user.id,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        phoneNumber: e.user.phoneNumber,
        fullName: `${e.user.firstName} ${e.user.lastName}`,
        slotCount: counts[i],
      })),
    });
  });
}
