import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const MajorEnum = z.enum([
  "MATHEMATICS",
  "EXPERIMENTAL",
  "HUMANITIES",
  "TECHNICAL",
  "VOCATIONAL",
]);

const CreateBody = z.object({
  gradeLevel: z.string().min(1, "پایه الزامی است."),
  name: z.string().min(1, "نام کلاس الزامی است."),
  major: MajorEnum.nullable().optional(),
});

const UpdateBody = z.object({
  gradeLevel: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  major: MajorEnum.nullable().optional(),
});

/**
 * GET /api/v1/principal/classrooms
 *
 * List all (non-soft-deleted) classrooms in the active school.
 * Accessible to PRINCIPAL (admin) and DEPUTY (needs the list for the
 * timetable builder).
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    const rooms = await db.classRoom.findMany({
      where: {}, // soft-delete extension auto-filters deletedAt: null
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
            timetableSlots: true,
            assessments: true,
          },
        },
      },
    });
    return NextResponse.json({
      ok: true,
      classrooms: rooms.map((r) => ({
        id: r.id,
        gradeLevel: r.gradeLevel,
        major: r.major,
        name: r.name,
        createdAt: r.createdAt,
        studentCount: r._count.enrollments,
        slotCount: r._count.timetableSlots,
        assessmentCount: r._count.assessments,
      })),
    });
  });
}

/**
 * POST /api/v1/principal/classrooms
 *
 * Create a new classroom. Per Section 9 — soft delete is enabled on
 * ClassRoom, so deletedAt is null by default.
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    // Check duplicate (gradeLevel + name) within this school
    // Note: soft-delete extension auto-adds deletedAt: null, so we won't
    // match tombstones.
    const existing = await db.classRoom.findFirst({
      where: { gradeLevel: body.gradeLevel, name: body.name },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "کلاسی با این پایه و نام از قبل وجود دارد." },
        { status: 409 }
      );
    }

    const room = await db.classRoom.create({
      data: {
        gradeLevel: body.gradeLevel,
        name: body.name,
        major: body.major ?? null,
      },
    });
    return NextResponse.json({ ok: true, classroom: room }, { status: 201 });
  });
}

/**
 * PATCH /api/v1/principal/classrooms?id=...
 *
 * Update gradeLevel and/or name. Prevents schoolId rewriting
 * (tenant-extension strips it).
 */
export async function PATCH(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "پارامتر id الزامی است." }, { status: 400 });
    }
    let body: z.infer<typeof UpdateBody>;
    try {
      body = UpdateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    const updated = await db.classRoom.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ ok: true, classroom: updated });
  });
}

/**
 * DELETE /api/v1/principal/classrooms?id=...
 *
 * Soft-delete (per Section 9 directive) — converted by soft-delete-extension
 * to `update deletedAt = now()`. Existing grade history is preserved.
 */
export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "پارامتر id الزامی است." }, { status: 400 });
    }
    await db.classRoom.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
