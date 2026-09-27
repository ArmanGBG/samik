import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

/**
 * GET /api/v1/notifications/outbox?status=DRAFT
 *
 * List notification outbox records for the active school. Default: only DRAFT.
 * Pass ?status=all to include SENT/FAILED/DISCARDED.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async () => {
    const statusFilter = req.nextUrl.searchParams.get("status") ?? "DRAFT";
    const where = statusFilter === "all" ? {} : { status: statusFilter as any };

    const records = await db.notificationOutbox.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({
      ok: true,
      outbox: records.map((r) => ({
        id: r.id,
        studentId: r.studentUserId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        recipientPhone: r.recipientPhone,
        eventType: r.eventType,
        messageBody: r.messageBody,
        status: r.status,
        createdAt: r.createdAt,
        sentAt: r.sentAt,
      })),
    });
  });
}

const PatchBody = z.object({
  messageBody: z.string().min(1, "متن پیام نمی‌تواند خالی باشد.").max(500),
});

/**
 * PATCH /api/v1/notifications/outbox/[id]
 *
 * Edit the message body of a DRAFT notification (Section 8 — "امکان ویرایش").
 */
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
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }
    const updated = await db.notificationOutbox.update({
      where: { id, status: "DRAFT" }, // Only DRAFT can be edited
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
