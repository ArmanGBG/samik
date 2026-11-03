// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { emitBehavioralPointCreated } from "@/lib/realtime/event-bus";

const CreateBody = z.object({
  studentUserId: z.string().uuid(),
  subjectId: z.string().uuid(),
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
 * `subjectId` is REQUIRED and the point is filed against the lesson, not the
 * class. The teacher must actually teach that subject, and the student must be
 * enrolled in a class where the teacher teaches it — otherwise a discipline
 * note raised in one lesson would leak into another lesson's gradebook. When a
 * `classSessionId` is supplied it must belong to a slot for the same subject.
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["TEACHER"], async (ctx) => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).issues?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    // Which classes does this teacher teach `subjectId` in?
    const slots = await db.timetableSlot.findMany({
      where: { teacherUserId: ctx.userId, subjectId: body.subjectId },
      select: { classRoomId: true, id: true },
    });
    if (slots.length === 0) {
      return NextResponse.json(
        { ok: false, error: "این درس در برنامهٔ هفتگی شما تعریف نشده است." },
        { status: 403 }
      );
    }
    const classRoomIds = [...new Set(slots.map((s) => s.classRoomId))];
    const slotIds = new Set(slots.map((s) => s.id));

    // The student must be actively enrolled in one of those classes —
    // not merely in the school.
    const enrollment = await db.schoolEnrollment.findFirst({
      where: {
        studentUserId: body.studentUserId,
        status: "ACTIVE",
        classRoomId: { in: classRoomIds },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
      },
    });
    if (!enrollment) {
      return NextResponse.json(
        { ok: false, error: "دانش‌آموز در کلاس این درس فعال نیست." },
        { status: 404 }
      );
    }

    // If a session is given, it must be this teacher's session for this subject.
    if (body.classSessionId) {
      const session = await db.classSession.findFirst({
        where: {
          id: body.classSessionId,
          timetableSlot: { id: { in: [...slotIds] } },
        },
        select: { id: true },
      });
      if (!session) {
        return NextResponse.json(
          { ok: false, error: "این جلسه متعلق به درس انتخاب‌شده نیست." },
          { status: 400 }
        );
      }
    }

    // Build the create payload — only include optional fields if they have values.
    // Prisma 6.x can be strict about explicit `undefined` in nested create inputs.
    // The tenant extension auto-injects `schoolId` from the context.
    const createData: Record<string, unknown> = {
      studentUserId: body.studentUserId,
      teacherUserId: ctx.userId,
      subjectId: body.subjectId,
      pointType: body.pointType,
    };
    if (body.reasonTag) createData.reasonTag = body.reasonTag;
    if (body.classSessionId) createData.classSessionId = body.classSessionId;

    const point = await db.behavioralPoint.create({
      data: createData as any,
    });

    // Emit SSE event for deputy dashboard
    emitBehavioralPointCreated({/*@ts-ignore*/
      schoolId: ctx.schoolId,
      pointId: point.id,
      studentId: enrollment.student.id,
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      classroomName: enrollment.classRoom ? `${enrollment.classRoom.gradeLevel} ${enrollment.classRoom.name}` : "بدون کلاس",
      pointType: body.pointType,
      reasonTag: body.reasonTag ?? null,
      teacherName: "", // could be enriched from ctx if needed
      createdAt: point.createdAt.toISOString(),
    });

    return NextResponse.json({ ok: true, point }, { status: 201 });
  });
}
