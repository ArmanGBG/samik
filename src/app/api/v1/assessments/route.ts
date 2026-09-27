import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const CreateBody = z.object({
  classRoomId: z.string().uuid(),
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
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["TEACHER"], async () => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    const assessment = await db.assessment.create({
      data: {
        classRoomId: body.classRoomId,
        title: body.title,
        evaluationType: body.evaluationType,
        date: new Date(body.date + "T00:00:00Z"),
      },
    });
    return NextResponse.json({ ok: true, assessment }, { status: 201 });
  });
}
