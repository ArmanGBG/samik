import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { emitBehavioralPointCreated } from "@/lib/realtime/event-bus";

const CreateBody = z.object({
  studentUserId: z.string().uuid(),
  pointType: z.enum(["POSITIVE", "NEGATIVE"]),
  reasonTag: z.string().max(50).optional(),
  classSessionId: z.string().uuid().optional(),
});

/**
 * POST /api/v1/behavioral-points
 *
 * Quick behavioral point registration (Section 7 — "سیستم ثبت سریع امتیاز").
 *
 * Per the architecture doc:
 *   - Default action is one-tap (no tag required).
 *   - Long-press opens a tag menu (handled client-side; this API accepts
 *     an optional `reasonTag`).
 *   - Emits a `behavioral-point:created` SSE event so the deputy dashboard
 *     can show real-time discipline activity.
 *
 * Per Section 7 — "هشدار به ناظم/اولیا": receiving 2 negative points in
 * one day triggers an automatic alert. (Phase 4 will wire the alert logic;
 * for now we just emit the event.)
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["TEACHER"], async (ctx) => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    // Look up the student's enrollment to derive classroom context
    const enrollment = await db.schoolEnrollment.findFirst({
      where: { studentUserId: body.studentUserId, status: "ACTIVE" },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
      },
    });
    if (!enrollment) {
      return NextResponse.json(
        { ok: false, error: "دانش‌آموز فعال در این مدرسه یافت نشد." },
        { status: 404 }
      );
    }

    // Build the create payload — only include optional fields if they have values.
    // Prisma 6.x can be strict about explicit `undefined` in nested create inputs.
    // The tenant extension auto-injects `schoolId` from the context.
    const createData: Record<string, unknown> = {
      studentUserId: body.studentUserId,
      teacherUserId: ctx.userId,
      pointType: body.pointType,
    };
    if (body.reasonTag) createData.reasonTag = body.reasonTag;
    if (body.classSessionId) createData.classSessionId = body.classSessionId;

    const point = await db.behavioralPoint.create({
      data: createData as any,
    });

    // Emit SSE event for deputy dashboard
    emitBehavioralPointCreated({
      schoolId: ctx.schoolId,
      pointId: point.id,
      studentId: enrollment.student.id,
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      classroomName: `${enrollment.classRoom.gradeLevel} ${enrollment.classRoom.name}`,
      pointType: body.pointType,
      reasonTag: body.reasonTag ?? null,
      teacherName: "", // could be enriched from ctx if needed
      createdAt: point.createdAt.toISOString(),
    });

    return NextResponse.json({ ok: true, point }, { status: 201 });
  });
}
