import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { hhmmSchema, hhmmToMinutes } from "@/lib/timetable/time-utils";

const CreateBody = z.object({
  title: z.string().min(1, "عنوان زنگ الزامی است.").max(50),
  startTime: hhmmSchema,
  endTime: hhmmSchema,
}).refine((d) => hhmmToMinutes(d.startTime) < hhmmToMinutes(d.endTime), {
  message: "زمان شروع باید قبل از زمان پایان باشد.",
  path: ["endTime"],
});

/**
 * GET /api/v1/principal/bell-schedules
 *
 * Returns the school's bell schedule, ordered by start time.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "TEACHER"], async () => {
    const bells = await db.bellSchedule.findMany({
      orderBy: { startTime: "asc" },
      include: { _count: { select: { timetableSlots: true } } },
    });
    return NextResponse.json({
      ok: true,
      bellSchedules: bells.map((b) => ({
        id: b.id,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        slotCount: b._count.timetableSlots,
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
      const ze = e as z.ZodError;
      return NextResponse.json(
        { ok: false, error: ze.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }
    // Check overlap with existing bells in the same school
    const existing = await db.bellSchedule.findMany();
    for (const b of existing) {
      if (
        body.startTime < b.endTime &&
        body.endTime > b.startTime
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: `زنگ جدید با «${b.title}» (${b.startTime}-${b.endTime}) تداخل دارد.`,
          },
          { status: 409 }
        );
      }
    }
    const bell = await db.bellSchedule.create({
      data: { title: body.title, startTime: body.startTime, endTime: body.endTime },
    });
    return NextResponse.json({ ok: true, bellSchedule: bell }, { status: 201 });
  });
}

export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "پارامتر id الزامی است." }, { status: 400 });
    }
    // Block deletion if any TimetableSlots reference this bell
    const slotCount = await db.timetableSlot.count({ where: { bellScheduleId: id } });
    if (slotCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `این زنگ در ${slotCount} خانه برنامه هفتگی استفاده شده است. ابتدا آن‌ها را حذف کنید.`,
        },
        { status: 409 }
      );
    }
    await db.bellSchedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
