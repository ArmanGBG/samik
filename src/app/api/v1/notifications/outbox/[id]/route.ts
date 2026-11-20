// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PatchBody = z
  .object({
    messageBody: z.string().min(1, "متن پیام نمی‌تواند خالی باشد.").max(500).optional(),
    recipientPhone: z.string().regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد.").optional(),
  })
  .refine((data) => data.messageBody !== undefined || data.recipientPhone !== undefined, {
    message: "حداقل یکی از موارد متن پیام یا شماره تماس باید ارسال شود.",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    let body: z.infer<typeof PatchBody>;
    try {
      body = PatchBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).issues?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    const notif = await db.notificationOutbox.findFirst({
      where: { id, schoolId: ctx.schoolId, status: "DRAFT" },
      select: { id: true, studentUserId: true },
    });

    if (!notif) {
      return NextResponse.json(
        { ok: false, error: "پیش‌نویس پیامک یافت نشد یا قابل ویرایش نیست." },
        { status: 404 }
      );
    }

    const updateData: Record<string, string> = {};
    if (body.messageBody) updateData.messageBody = body.messageBody;
    if (body.recipientPhone) updateData.recipientPhone = body.recipientPhone;

    await db.notificationOutbox.update({
      where: { id },
      data: updateData,
    });

    // If recipient phone was updated, keep all drafts for this student in sync
    // and also update the student's guardianPhone1 in SchoolEnrollment.
    if (body.recipientPhone && notif.studentUserId) {
      await db.notificationOutbox.updateMany({
        where: {
          schoolId: ctx.schoolId,
          studentUserId: notif.studentUserId,
          status: "DRAFT",
        },
        data: { recipientPhone: body.recipientPhone },
      }).catch(() => null);

      await db.schoolEnrollment.updateMany({
        where: {
          schoolId: ctx.schoolId,
          studentUserId: notif.studentUserId,
        },
        data: { guardianPhone1: body.recipientPhone },
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true, message: "اطلاعات پیامک با موفقیت به‌روزرسانی شد." });
  });
}

/**
 * DELETE /api/v1/notifications/outbox/[id]
 *
 * Discards a DRAFT notification from the school's outbox.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    try {
      const updated = await db.notificationOutbox.updateMany({
        where: {
          id,
          schoolId: ctx.schoolId,
          status: "DRAFT",
        },
        data: {
          status: "DISCARDED",
        },
      }).catch(() => null);

      if (!updated || updated.count === 0) {
        return NextResponse.json(
          { ok: false, error: "پیش‌نویس پیامک یافت نشد یا قبلاً حذف شده است." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "پیش‌نویس پیامک با موفقیت حذف شد.",
      });
    } catch (err) {
      console.error("[DELETE_NOTIFICATION_OUTBOX_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در حذف پیش‌نویس پیامک." },
        { status: 500 }
      );
    }
  });
}
