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
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    let body: z.infer<typeof UpdateBody>;
    try {
      body = UpdateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }
    // We're updating the School record itself. The tenant-extension's
    // create/update hooks inject `id: schoolId` for the School model when
    // querying by id, so we use update with where: { id } (current schoolId
    // is in the tenant context, will be enforced).
    // We need to bypass the tenant filter for this School update because
    // the School model's "tenant" is itself.
    const updated = await db.school.update({
      where: { id: req.headers.get("x-samik-school-id")! },
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
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "TEACHER"], async () => {
    const school = await db.school.findFirst({
      select: { id: true, name: true, subdomain: true, termStartDate: true, status: true },
    });
    return NextResponse.json({ ok: true, school });
  });
}
