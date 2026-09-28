import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";

/**
 * POST /api/v1/principal/term-config/archive
 * 
 * Batch transitions all ACTIVE school enrollments to ARCHIVED.
 * Used at the end of the academic year (Section 4: "سناریوی تغییر سال تحصیلی").
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async (ctx) => {
    try {
      const result = await db.schoolEnrollment.updateMany({
        where: {
          schoolId: ctx.schoolId,
          status: "ACTIVE",
        },
        data: {
          status: "ARCHIVED",
        },
      });

      return NextResponse.json({
        ok: true,
        message: `${result.count} دانش‌آموز با موفقیت بایگانی شدند.`,
        archivedCount: result.count,
      });
    } catch (err) {
      console.error("[BATCH_ARCHIVE_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در بایگانی دانش‌آموزان." },
        { status: 500 }
      );
    }
  });
}
