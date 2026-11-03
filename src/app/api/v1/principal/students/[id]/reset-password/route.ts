import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import { hashPassword, DEFAULT_INITIAL_PASSWORD } from "@/lib/auth/password";

/**
 * POST /api/v1/principal/students/[id]/reset-password
 *
 * Allows Principal or Deputy to instantly reset a student's password
 * to the default initial password ("123456").
 * `id` is the SchoolEnrollment ID.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async (ctx) => {
    try {
      const enrollment = await db.schoolEnrollment.findUnique({
        where: { id },
        select: {
          id: true,
          studentUserId: true,
          schoolId: true,
          student: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!enrollment) {
        return NextResponse.json(
          { ok: false, error: "پرونده دانش‌آموز یافت نشد." },
          { status: 404 }
        );
      }

      // Reset password to DEFAULT_INITIAL_PASSWORD (123456)
      const defaultHash = hashPassword(DEFAULT_INITIAL_PASSWORD);

      await runWithTenant({ bypassTenantFilter: true }, () =>
        db.user.update({
          where: { id: enrollment.studentUserId },
          data: { passwordHash: defaultHash },
        })
      );

      const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;

      return NextResponse.json({
        ok: true,
        message: `رمز عبور ${studentName} با موفقیت به ۱۲۳۴۵۶ بازنشانی شد.`,
      });
    } catch (err: any) {
      console.error("[RESET_STUDENT_PASSWORD_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در بازنشانی رمز عبور دانش‌آموز." },
        { status: 500 }
      );
    }
  });
}
