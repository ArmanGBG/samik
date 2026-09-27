import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

/**
 * DELETE /api/v1/notifications/outbox/[id]
 *
 * Discard a DRAFT notification (Section 8 — "امکان لغو (Discard)").
 * Per the architecture doc: if the absence was justified, the deputy
 * clicks X to discard the SMS from the queue.
 *
 * We set status to DISCARDED rather than hard-deleting, to preserve
 * the audit trail (the draft existed, the deputy reviewed it, and
 * chose not to send it).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async () => {
    const updated = await db.notificationOutbox.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "DISCARDED" },
    }).catch(() => null);
    if (!updated || updated.count === 0) {
      return NextResponse.json(
        { ok: false, error: "پیامک یافت نشد یا قابل حذف نیست." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  });
}
