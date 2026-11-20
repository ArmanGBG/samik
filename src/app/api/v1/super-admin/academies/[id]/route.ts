import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const PatchAcademyBody = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

/**
 * PATCH /api/v1/super-admin/academies/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(req, async () => {
    const { id } = await params;
    let body: z.infer<typeof PatchAcademyBody>;
    try {
      body = PatchAcademyBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      const updated = await db.academy.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.status ? { status: body.status } : {}),
          ...(body.province !== undefined ? { province: body.province?.trim() || null } : {}),
          ...(body.city !== undefined ? { city: body.city?.trim() || null } : {}),
          ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
          ...(body.address !== undefined ? { address: body.address?.trim() || null } : {}),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "اطلاعات آموزشگاه با موفقیت به‌روزرسانی شد.",
        academy: updated,
      });
    } catch (err: any) {
      console.error("[PATCH_ACADEMY_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "آموزشگاه یافت نشد یا خطا در ویرایش رخ داد." },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/v1/super-admin/academies/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(req, async () => {
    const { id } = await params;

    try {
      await db.academy.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
        message: "آموزشگاه با موفقیت حذف گردید.",
      });
    } catch (err: any) {
      console.error("[DELETE_ACADEMY_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در حذف آموزشگاه." },
        { status: 500 }
      );
    }
  });
}
