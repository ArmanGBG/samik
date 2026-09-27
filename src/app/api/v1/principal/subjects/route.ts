import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const CreateBody = z.object({
  title: z.string().min(1, "نام درس الزامی است.").max(100),
});

/**
 * GET /api/v1/principal/subjects
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    const subjects = await db.subject.findMany({
      orderBy: { title: "asc" },
      include: {
        _count: { select: { timetableSlots: true } },
      },
    });
    return NextResponse.json({
      ok: true,
      subjects: subjects.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        slotCount: s._count.timetableSlots,
      })),
    });
  });
}

export async function POST(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }
    const existing = await db.subject.findFirst({
      where: { title: body.title },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "این درس قبلاً ثبت شده است." },
        { status: 409 }
      );
    }
    const subject = await db.subject.create({ data: { title: body.title } });
    return NextResponse.json({ ok: true, subject }, { status: 201 });
  });
}

export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "پارامتر id الزامی است." }, { status: 400 });
    }
    // Hard delete (subjects are leaf nodes; cascade-safe per schema)
    await db.subject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
