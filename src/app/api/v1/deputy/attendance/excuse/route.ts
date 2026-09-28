import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { emitAttendanceExcused, emitNotificationUpdated } from "@/lib/realtime/event-bus";

const ExcuseBody = z.object({
  studentId: z.string().uuid("شناسه دانش‌آموز نامعتبر است."),
  classSessionId: z.string().uuid().optional(),
});

/**
 * POST /api/v1/deputy/attendance/excuse
 *
 * Excuse an absence (Section 6 & 8 of Architecture Document).
 * Only the DEPUTY or PRINCIPAL role can excuse absences.
 *
 * Actions:
 *   1. Updates the attendance record status from ABSENT to EXCUSED.
 *   2. Automatically marks any pending DRAFT SMS for this student as DISCARDED
 *      so parents don't receive an erroneous absence alert.
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    let body: z.infer<typeof ExcuseBody>;
    try {
      body = ExcuseBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      // Find the most recent or specified attendance record for this student
      const whereClause: Record<string, unknown> = {
        studentUserId: body.studentId,
        status: "ABSENT",
      };

      if (body.classSessionId) {
        whereClause.classSessionId = body.classSessionId;
      }

      const record = await db.attendanceRecord.findFirst({
        where: whereClause,
        orderBy: { classSession: { date: "desc" } },
        include: { classSession: true },
      });

      if (!record) {
        return NextResponse.json(
          { ok: false, error: "رکورد غیبت فعالی برای این دانش‌آموز یافت نشد." },
          { status: 404 }
        );
      }

      // Execute in transaction: update attendance + discard pending notification draft
      await db.$transaction(async (tx) => {
        await tx.attendanceRecord.update({
          where: { id: record.id },
          data: { status: "EXCUSED" },
        });

        // Discard draft SMS for this student if any exists
        await tx.notificationOutbox.updateMany({
          where: {
            schoolId: ctx.schoolId,
            studentUserId: body.studentId,
            status: "DRAFT",
          },
          data: { status: "DISCARDED" },
        });
      });

      // Emit real-time events for other panels (Deputy Live, Outbox, Student Dashboard)
      emitAttendanceExcused({
        schoolId: ctx.schoolId,
        studentId: body.studentId,
        recordId: record.id,
        classSessionId: body.classSessionId,
      });

      emitNotificationUpdated({
        schoolId: ctx.schoolId,
        action: "DISCARDED",
      });

      return NextResponse.json({
        ok: true,
        message: "غیبت با موفقیت به وضعیت موجه تغییر یافت.",
        recordId: record.id,
        status: "EXCUSED",
      });
    } catch (err) {
      console.error("[EXCUSE_ATTENDANCE_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در ثبت توجیه غیبت." },
        { status: 500 }
      );
    }
  });
}
