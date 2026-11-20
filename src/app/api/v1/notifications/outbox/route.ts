// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications/outbox?status=DRAFT
 *
 * List notification outbox records for the active school. Default: only DRAFT.
 * Pass ?status=all to include SENT/FAILED/DISCARDED.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    const statusFilter = req.nextUrl.searchParams.get("status") ?? "DRAFT";
    const where: Record<string, unknown> = { schoolId: ctx.schoolId };
    if (statusFilter !== "all") {
      where.status = statusFilter;
    }

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

