import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const UpdateBody = z.object({
  termStartDate: z.string().datetime().nullable(),
});

/**
 * PATCH /api/v1/principal/school-config
 *
 * Set the school's `termStartDate` — the anchor for week-parity
 * calculation (Section 5). This date identifies the first day of Week 1
 * (ODD). Typically the Principal picks the first Saturday of the
 * academic year.
 */
export async function PATCH(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async (ctx) => {
    let body: z.infer<typeof UpdateBody>;
    try {
      body = UpdateBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }
    const updated = await db.school.update({
      where: { id: ctx.schoolId },
      data: { termStartDate: body.termStartDate ? new Date(body.termStartDate) : null },
      select: { id: true, name: true, termStartDate: true },
    });
    return NextResponse.json({ ok: true, school: updated });
  });
}

/**
 * GET /api/v1/principal/school-config
 *
 * Returns the school's termStartDate and other principal-level config.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "TEACHER"], async (ctx) => {
    const school = ctx.schoolId
      ? await db.school.findUnique({
          where: { id: ctx.schoolId },
          select: { id: true, name: true, subdomain: true, termStartDate: true, status: true },
        })
      : await db.school.findFirst({
          select: { id: true, name: true, subdomain: true, termStartDate: true, status: true },
        });
    return NextResponse.json({ ok: true, school });
  });
}
