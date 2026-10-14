// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const PatchBody = z.object({
  messageBody: z.string().min(1, "متن پیام نمی‌تواند خالی باشد.").max(500),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async () => {
    let body: z.infer<typeof PatchBody>;
    try {
      body = PatchBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).issues?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }
    const updated = await db.notificationOutbox.update({
      where: { id, status: "DRAFT" },
      data: { messageBody: body.messageBody },
    }).catch(() => null);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "پیامک یافت نشد یا قابل ویرایش نیست." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, outbox: updated });
  });
}
