import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { emitGradeSaved } from "@/lib/realtime/event-bus";

const SaveBody = z.object({
  assessmentId: z.string().uuid(),
  studentUserId: z.string().uuid(),
  numericScore: z.number().min(0).max(20).nullable().optional(),
  descriptiveScore: z
    .enum(["EXCELLENT", "GOOD", "ACCEPTABLE", "NEEDS_IMPROVEMENT"])
    .nullable()
    .optional(),
  isAbsent: z.boolean().optional(),
}).refine(
  (d) =>
    d.isAbsent === true ||
    d.numericScore !== undefined ||
    d.descriptiveScore !== undefined,
  {
    message: "یا نمره عددی، یا توصیفی، یا علامت غیبت باید ارسال شود.",
  }
);

/**
 * POST /api/v1/grades
 *
 * Save (upsert) a single grade. Per Section 7:
 *   - If `isAbsent: true`, the student was absent on exam day — the grade
 *     is recorded as such and NOT counted as zero in monthly averages.
 *   - For NUMERIC assessments: numericScore (0-20).
 *   - For DESCRIPTIVE assessments: descriptiveScore enum.
 *
 * The unique constraint on (assessmentId, studentUserId) ensures one
 * grade per student per assessment — re-submitting updates the existing.
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["TEACHER"], async () => {
    let body: z.infer<typeof SaveBody>;
    try {
      body = SaveBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      const grade = await db.grade.upsert({
        where: {
          assessmentId_studentUserId: {
            assessmentId: body.assessmentId,
            studentUserId: body.studentUserId,
          },
        },
        create: {
          assessmentId: body.assessmentId,
          studentUserId: body.studentUserId,
          numericScore: body.numericScore ?? null,
          descriptiveScore: body.descriptiveScore ?? null,
          isAbsent: body.isAbsent ?? false,
        },
        update: {
          numericScore: body.numericScore ?? null,
          descriptiveScore: body.descriptiveScore ?? null,
          isAbsent: body.isAbsent ?? false,
        },
      });

      // Emit real-time event for Student Dashboard and Teacher Gradebook sync
      emitGradeSaved({
        schoolId: ctx.schoolId,
        studentUserId: body.studentUserId,
        assessmentId: body.assessmentId,
        numericScore: body.numericScore ?? null,
        descriptiveScore: body.descriptiveScore ?? null,
        isAbsent: body.isAbsent ?? false,
      });

      return NextResponse.json({ ok: true, grade }, { status: 201 });
    } catch (err) {
      console.error("[GRADE_UPSERT_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در ذخیره نمره در پایگاه داده." },
        { status: 500 }
      );
    }
  });
}
