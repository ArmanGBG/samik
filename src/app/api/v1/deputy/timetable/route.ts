// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { detectTeacherConflict } from "@/lib/timetable/conflict-detector";
import { hhmmSchema } from "@/lib/timetable/time-utils";
import { DAYS_OF_WEEK } from "@/lib/timetable/days";
import {
  normalizeSpecificDate,
  samikDayOfWeekForDateKey,
  zonedDateKeyFor,
} from "@/lib/timetable/tehran-time";

const WeekTypeEnum = z.enum(["ALL_WEEKS", "ODD_WEEKS", "EVEN_WEEKS"]);

const CreateBody = z.object({
  classRoomId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
  bellScheduleId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  weekType: z.enum(["ALL_WEEKS", "ODD_WEEKS", "EVEN_WEEKS", "SINGLE_SESSION"]).default("ALL_WEEKS"),
  specificDate: z.string().optional().nullable(),
});

/**
 * The grid column a slot must occupy.
 *
 * For a SINGLE_SESSION the date is authoritative: the class happens exactly
 * once, on `specificDate`, so it can only ever live in that date's weekday
 * column. Trusting the client's `dayOfWeek` here is what allowed rows where
 * `dayOfWeek` and `specificDate` disagreed, and a slot like that is invisible
 * to the day filter and the week-type filter at the same time.
 */
function resolveDayOfWeek(args: {
  dayOfWeek: number;
  weekType: string;
  specificDate: Date | null;
}): number {
  if (args.weekType === "SINGLE_SESSION" && args.specificDate) {
    return samikDayOfWeekForDateKey(zonedDateKeyFor(args.specificDate));
  }
  return args.dayOfWeek;
}

/** Normalise a validated create payload so day and date can never disagree. */
function resolveTimetablePlacement<T extends { dayOfWeek: number; weekType: string; specificDate?: string | null }>(body: T): T {
  if (body.weekType !== "SINGLE_SESSION" || !body.specificDate) {
    return { ...body, specificDate: body.specificDate ?? null };
  }
  const specificDate = normalizeSpecificDate(body.specificDate);
  return {
    ...body,
    specificDate: body.specificDate,
    dayOfWeek: samikDayOfWeekForDateKey(zonedDateKeyFor(specificDate)),
  };
}

/**
 * GET /api/v1/deputy/timetable
 *
 * Returns all timetable slots in the active school, joined with their
 * related entities for the grid UI.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY", "TEACHER"], async (ctx) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const slots = await db.timetableSlot.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: [{ dayOfWeek: "asc" }, { bellSchedule: { startTime: "asc" } }],
      include: {
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, title: true } },
        teacher: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
        classSessions: {
          where: {
            date: { gte: startOfDay, lte: endOfDay },
            status: "SUBMITTED"
          },
          select: { id: true }
        }
      },
    });
    return NextResponse.json({ ok: true, slots, days: DAYS_OF_WEEK });
  });
}

/**
 * POST /api/v1/deputy/timetable
 *
 * Create a new timetable slot. CRITICAL: this endpoint runs the Global
 * Conflict Detector BEFORE saving. If the teacher has an overlapping
 * slot in ANY school, returns 409 Conflict.
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
      if (body.weekType === "SINGLE_SESSION" && !body.specificDate) throw new Error("تاریخ تک‌جلسه الزامی است");
      body = resolveTimetablePlacement(body);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).issues?.[0]?.message ?? (e instanceof Error ? e.message : "ورودی نامعتبر") },
        { status: 400 }
      );
    }

    // Lookup the bell schedule to get startTime/endTime for the conflict check.
    // Note: bellSchedule is tenant-scoped — we read it via the normal tenant
    // filter (it MUST belong to the current school).
    const bell = await db.bellSchedule.findUnique({
      where: { id: body.bellScheduleId },
      select: { startTime: true, endTime: true, title: true },
    });
    if (!bell) {
      return NextResponse.json(
        { ok: false, error: "زنگ انتخاب‌شده در این مدرسه یافت نشد." },
        { status: 404 }
      );
    }

    // Validate that classRoom, subject, teacher all belong to this school
    // (the tenant filter does this implicitly, but we want explicit 404s).
    const [classRoom, subject, teacher] = await Promise.all([
      db.classRoom.findUnique({ where: { id: body.classRoomId }, select: { id: true, gradeLevel: true, name: true } }),
      db.subject.findUnique({ where: { id: body.subjectId }, select: { id: true, title: true } }),
      db.staffEmployment.findUnique({
        where: { schoolId_userId: { schoolId: ctx.schoolId, userId: body.teacherUserId } },
        select: { id: true, role: true, user: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);
    if (!classRoom) {
      return NextResponse.json({ ok: false, error: "کلاس انتخاب‌شده یافت نشد." }, { status: 404 });
    }
    if (!subject) {
      return NextResponse.json({ ok: false, error: "درس انتخاب‌شده یافت نشد." }, { status: 404 });
    }
    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json(
        { ok: false, error: "کاربر انتخاب‌شده معلم این مدرسه نیست." },
        { status: 404 }
      );
    }

    // === GLOBAL CONFLICT DETECTION ===
    // Cross-tenant read: bypass tenant filter to scan ALL schools' timetables.
    const conflicts = await detectTeacherConflict({
      teacherUserId: body.teacherUserId,
      dayOfWeek: body.dayOfWeek,
      weekType: body.weekType,
      specificDate: body.specificDate ? normalizeSpecificDate(body.specificDate) : null,
      startTime: bell.startTime,
      endTime: bell.endTime,
    });

    if (conflicts.length > 0) {
      // Per Section 5 — return only the first conflict's school NAME to
      // inform the deputy, without leaking other tenant data.
      const c = conflicts[0];
      return NextResponse.json(
        {
          ok: false,
          error: `این دبیر در این ساعت در مدرسه دیگری کلاس دارد.`,
          conflict: {
            schoolName: c.schoolName,
            dayOfWeek: c.dayOfWeek,
            startTime: c.startTime,
            endTime: c.endTime,
            classroomName: c.classroomName,
            subjectTitle: c.subjectTitle,
            weekType: c.weekType,
          },
        },
        { status: 409 }
      );
    }

    // No conflict — save the slot. The tenant extension will inject schoolId.
    const createData = {
      ...body,
      specificDate: body.specificDate ? normalizeSpecificDate(body.specificDate) : null,
    };
    const slot = await db.timetableSlot.create({
      data: createData,
      include: {
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
      },
    });
    return NextResponse.json({ ok: true, slot }, { status: 201 });
  });
}

/**
 * DELETE /api/v1/deputy/timetable?id=...
 *
 * Hard delete a timetable slot. (Slots are not soft-deleted per the
 * architecture doc — they're configuration, not academic records.)
 */
export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ ok: false, error: "شناسه خانه برنامه هفتگی نامعتبر است." }, { status: 400 });
    }
    const existing = await db.timetableSlot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "خانه برنامه هفتگی یافت نشد." }, { status: 404 });
    }
    await db.timetableSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}

/**
 * PATCH /api/v1/deputy/timetable?id=...
 *
 * Edit an existing timetable slot — change subject, teacher, bell, weekType,
 * or dayOfWeek.  Runs the same conflict detection as POST so a conflicting
 * edit is rejected before it is persisted.
 */
const PatchBody = z.object({
  subjectId: z.string().uuid().optional(),
  teacherUserId: z.string().uuid().optional(),
  bellScheduleId: z.string().uuid().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  weekType: z.enum(["ALL_WEEKS", "ODD_WEEKS", "EVEN_WEEKS", "SINGLE_SESSION"]).optional(),
  specificDate: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async (ctx) => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ ok: false, error: "شناسه خانه برنامه هفتگی نامعتبر است." }, { status: 400 });
    }

    let body: z.infer<typeof PatchBody>;
    try {
      body = PatchBody.parse(await req.json());
      if (body.weekType === "SINGLE_SESSION" && !body.specificDate) throw new Error("تاریخ تک‌جلسه الزامی است");
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).issues?.[0]?.message ?? (e instanceof Error ? e.message : "ورودی نامعتبر") },
        { status: 400 }
      );
    }

    // Fetch the existing slot (tenant filter ensures it belongs to this school)
    const existing = await db.timetableSlot.findUnique({
      where: { id },
      include: { bellSchedule: { select: { startTime: true, endTime: true } } },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "خانه برنامه هفتگی یافت نشد." }, { status: 404 });
    }

    // Resolve which values we'll be writing (new or keep old)
    const finalTeacherId = body.teacherUserId ?? existing.teacherUserId;
    const finalWeekType = body.weekType ?? existing.weekType;

    // A single-session slot can only ever happen on one date, so its grid
    // column is derived from that date rather than trusted from the client.
    // Without this the slot could sit in a column whose weekday contradicts
    // its `specificDate`, and every `dayOfWeek` + `weekType` filter would then
    // disagree with itself.
    const finalSpecificDate =
      body.specificDate !== undefined
        ? body.specificDate
          ? normalizeSpecificDate(body.specificDate)
          : null
        : existing.specificDate;
    const finalDayOfWeek = resolveDayOfWeek({
      dayOfWeek: body.dayOfWeek ?? existing.dayOfWeek,
      weekType: finalWeekType,
      specificDate: finalSpecificDate,
    });

    // If teacher or bell or day changed, validate teacher belongs to school
    if (body.teacherUserId) {
      const teacher = await db.staffEmployment.findUnique({
        where: { schoolId_userId: { schoolId: ctx.schoolId, userId: body.teacherUserId } },
        select: { role: true },
      });
      if (!teacher || teacher.role !== "TEACHER") {
        return NextResponse.json({ ok: false, error: "کاربر انتخاب‌شده معلم این مدرسه نیست." }, { status: 404 });
      }
    }

    // Resolve bell schedule for conflict check
    const bell = body.bellScheduleId
      ? await db.bellSchedule.findUnique({ where: { id: body.bellScheduleId }, select: { startTime: true, endTime: true } })
      : existing.bellSchedule;
    if (!bell) {
      return NextResponse.json({ ok: false, error: "زنگ انتخاب‌شده یافت نشد." }, { status: 404 });
    }

    // Global conflict detection (skip current slot)
    const conflicts = await detectTeacherConflict({
      teacherUserId: finalTeacherId,
      dayOfWeek: finalDayOfWeek,
      weekType: finalWeekType,
      specificDate: finalSpecificDate,
      startTime: bell.startTime,
      endTime: bell.endTime,
      excludeSlotId: id,
    });

    if (conflicts.length > 0) {
      const c = conflicts[0];
      return NextResponse.json(
        {
          ok: false,
          error: `این دبیر در این ساعت در مدرسه دیگری کلاس دارد.`,
          conflict: {
            schoolName: c.schoolName,
            classroomName: c.classroomName,
            subjectTitle: c.subjectTitle,
            weekType: c.weekType,
          },
        },
        { status: 409 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.specificDate !== undefined) updateData.specificDate = finalSpecificDate;
    if (body.subjectId !== undefined) updateData.subjectId = body.subjectId;
    if (body.teacherUserId !== undefined) updateData.teacherUserId = body.teacherUserId;
    if (body.bellScheduleId !== undefined) updateData.bellScheduleId = body.bellScheduleId;
    if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek;
    if (body.weekType !== undefined) updateData.weekType = body.weekType;
    if (finalDayOfWeek !== existing.dayOfWeek) updateData.dayOfWeek = finalDayOfWeek;

    const slot = await db.timetableSlot.update({
      where: { id },
      data: updateData,
      include: {
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
      },
    });

    return NextResponse.json({ ok: true, slot });
  });
}

// 1790852538
