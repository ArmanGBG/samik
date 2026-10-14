import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { teacherOwnsSubjectForClass } from "@/lib/timetable/subject-ownership";

const CreateBody = z.object({
  classRoomId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(1, "عنوان ارزیابی الزامی است.").max(100),
  evaluationType: z.enum(["NUMERIC", "DESCRIPTIVE"]),
  date: z.string().date(),
});

/**
 * POST /api/v1/assessments
 *
 * Create a new assessment (quiz/exam/homework/project/oral) for a classroom.
 * Per Section 7 — the teacher picks NUMERIC or DESCRIPTIVE, then registers
 * grades one-by-one (or via the matrix grid).
 *
 * `subjectId` is REQUIRED. An assessment always belongs to exactly one
 * subject, which is what keeps a math grade and a biology grade for the same
 * class from colliding. Ownership of the (classRoom, subject) pair is verified
 * so a teacher cannot file an assessment against a lesson they do not teach.
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

    const ownership = await teacherOwnsSubjectForClass(
      ctx.userId,
      body.classRoomId,
      body.subjectId
    );
    if (!ownership.ok) {
      return NextResponse.json(
        { ok: false, error: ownership.reason },
        { status: 403 }
      );
    }

    const assessment = await db.assessment.create({
      data: {
        schoolId: ctx.schoolId,
        teacherUserId: ctx.userId,
        classRoomId: body.classRoomId,
        subjectId: body.subjectId,
        title: body.title,
        evaluationType: body.evaluationType,
        date: new Date(body.date + "T00:00:00Z"),
      },
    });
    return NextResponse.json({ ok: true, assessment }, { status: 201 });
  });
}
