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
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async (ctx) => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
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
    const subject = await db.subject.create({
      data: { title: body.title, schoolId: ctx.schoolId } as any,
    });
    return NextResponse.json({ ok: true, subject }, { status: 201 });
  });
}

export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ ok: false, error: "شناسه درس نامعتبر است." }, { status: 400 });
    }
    // Hard delete (subjects are leaf nodes; cascade-safe per schema)
    await db.subject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
