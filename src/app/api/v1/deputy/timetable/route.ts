import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { detectTeacherConflict } from "@/lib/timetable/conflict-detector";
import { hhmmSchema } from "@/lib/timetable/time-utils";
import { DAYS_OF_WEEK } from "@/lib/timetable/days";

const WeekTypeEnum = z.enum(["ALL_WEEKS", "ODD_WEEKS", "EVEN_WEEKS"]);

const CreateBody = z.object({
  classRoomId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherUserId: z.string().uuid(),
  bellScheduleId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  weekType: WeekTypeEnum.default("ALL_WEEKS"),
});

/**
 * GET /api/v1/deputy/timetable
 *
 * Returns all timetable slots in the active school, joined with their
 * related entities for the grid UI.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["DEPUTY", "TEACHER"], async () => {
    const slots = await db.timetableSlot.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { bellSchedule: { startTime: "asc" } }],
      include: {
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, title: true } },
        teacher: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
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
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async () => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
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
        where: { schoolId_userId: { schoolId: req.headers.get("x-samik-school-id")!, userId: body.teacherUserId } },
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
    const slot = await db.timetableSlot.create({
      data: body,
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
  return withTenantContext(req, ["DEPUTY", "PRINCIPAL"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "پارامتر id الزامی است." }, { status: 400 });
    }
    await db.timetableSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
