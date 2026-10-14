import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { calculateWeekParity, weekTypeMatches } from "@/lib/timetable/week-parity";
import { tehranNowParts } from "@/lib/timetable/tehran-time";
import {
  HH_MM_REGEX,
  DEFAULT_EARLY_TOLERANCE_MINUTES,
  DEFAULT_LATE_TOLERANCE_MINUTES,
  hhmmToPersian,
  isSlotActiveNow,
} from "@/lib/timetable/time-utils";

const QuerySchema = z.object({
  /**
   * ISO timestamp from the client device. Per Section 5:
   *   "The client MUST send the current timestamp + timezone."
   * We accept either the client's "now" or omit and use server time.
   */
  now: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/v1/teacher/current-session
 *
 * Per Section 5 — Context-Aware Teacher Dashboard:
 *
 *   1. Get the current time and day on the server (or use the client-
 *      provided `now` if sent).
 *   2. Calculate current week parity (ODD/EVEN) based on School.termStartDate.
 *   3. Query TimetableSlot for this teacher where:
 *        - teacherUserId = current user
 *        - dayOfWeek = today
 *        - weekType = ALL_WEEKS OR matches the current parity
 *        - current time falls between bell.startTime and bell.endTime
 *          (with a 15-minute tolerance BEFORE the bell starts — so the
 *          teacher can open the roll-call a bit early).
 *   4. Return the matched slot, OR null if no current session.
 *
 * Also returns an "agenda" — the teacher's full weekly schedule for the
 * agenda-view fallback when no current session is active.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["TEACHER"], async (ctx) => {
    // Parse query (optional `now`)
    const url = new URL(req.url);
    const nowParam = url.searchParams.get("now");
    let now: Date;
    try {
      const parsed = QuerySchema.parse({ now: nowParam || undefined });
      now = parsed.now ? new Date(parsed.now) : new Date();
    } catch {
      return NextResponse.json(
        { ok: false, error: "پارامتر now باید ISO datetime معتبر باشد." },
        { status: 400 }
      );
    }

    const teacherUserId = ctx.userId;
    const schoolId = ctx.schoolId;

    // Resolve the school's wall clock ONCE. `now` is an absolute instant;
    // the timetable is authored in Tehran wall-clock time, so every
    // day-of-week / date / time comparison below uses these parts rather than
    // the host timezone.
    const tehran = tehranNowParts(now);
    const todaySamikDay = tehran.samikDayOfWeek;
    let school, todaysSlots;
    try {
      school = await db.school.findFirst({
        where: { id: schoolId },
        select: { id: true, name: true, termStartDate: true, subdomain: true },
      });
      
      if (!school) {
        return NextResponse.json({ ok: false, error: "مدرسه یافت نشد." }, { status: 404 });
      }

      todaysSlots = await db.timetableSlot.findMany({
        where: {
          teacherUserId,
          dayOfWeek: todaySamikDay,
        },
        include: {
          classRoom: { select: { id: true, name: true, gradeLevel: true } },
          subject: { select: { id: true, title: true } },
          bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
        },
        orderBy: { bellSchedule: { startTime: "asc" } },
      });
    } catch (err) {
      console.error("[CURRENT_SESSION_DB_ERROR]", err);
      return NextResponse.json({ ok: false, error: "خطای سرور در بارگذاری تقویم کلاسی." }, { status: 500 });
    }

    const parityResult = calculateWeekParity(school.termStartDate, now);
    const nowHHmm = tehran.hhmm;

    if (!HH_MM_REGEX.test(nowHHmm)) {
      return NextResponse.json({ ok: false, error: "خطای محاسبه زمان." }, { status: 500 });
    }

    // Filter by weekType matching current parity (ALL_WEEKS / ODD / EVEN /
    // SINGLE_SESSION on today's date).
    const parityMatched = todaysSlots.filter((s) =>
      weekTypeMatches(s.weekType, parityResult, s.specificDate, tehran.dateKey)
    );

    // Find the active session via the shared helper, so the teacher dashboard
    // and the deputy live dashboard always agree.
    const activeSlot =
      parityMatched.find((slot) =>
        isSlotActiveNow(
          { startTime: slot.bellSchedule.startTime, endTime: slot.bellSchedule.endTime },
          { minutesOfDay: tehran.minutesOfDay }
        )
      ) ?? null;

    // Build the agenda (all matched slots for today, for fallback rendering)
    const agenda = parityMatched.map((s) => ({
      slotId: s.id,
      subjectId: s.subjectId,
      subjectTitle: s.subject.title,
      classroomName: `${s.classRoom.gradeLevel} ${s.classRoom.name}`,
      classRoomId: s.classRoom.id,
      bellTitle: s.bellSchedule.title,
      startTime: s.bellSchedule.startTime,
      endTime: s.bellSchedule.endTime,
      startTimeFa: hhmmToPersian(s.bellSchedule.startTime),
      endTimeFa: hhmmToPersian(s.bellSchedule.endTime),
      weekType: s.weekType,
    }));

    return NextResponse.json({
      ok: true,
      server: {
        now: now.toISOString(),
        nowHHmm,
        nowHHmmFa: hhmmToPersian(nowHHmm),
        todayDateKey: tehran.dateKey,
        todaySamikDay,
        parity: parityResult.isUnconfigured ? null : parityResult.parity,
        weekNumber: parityResult.weekNumber,
        isPreTerm: parityResult.isPreTerm,
        isUnconfigured: parityResult.isUnconfigured,
        toleranceMinutes: DEFAULT_EARLY_TOLERANCE_MINUTES,
        lateToleranceMinutes: DEFAULT_LATE_TOLERANCE_MINUTES,
      },
      school: {
        id: school.id,
        name: school.name,
        termStartDate: school.termStartDate,
      },
      activeSession: activeSlot
        ? {
            slotId: activeSlot.id,
            classRoomId: activeSlot.classRoom.id,
            subjectId: activeSlot.subjectId,
            classRoomName: `${activeSlot.classRoom.gradeLevel} ${activeSlot.classRoom.name}`,
            subjectTitle: activeSlot.subject.title,
            bellTitle: activeSlot.bellSchedule.title,
            startTime: activeSlot.bellSchedule.startTime,
            endTime: activeSlot.bellSchedule.endTime,
            startTimeFa: hhmmToPersian(activeSlot.bellSchedule.startTime),
            endTimeFa: hhmmToPersian(activeSlot.bellSchedule.endTime),
            weekType: activeSlot.weekType,
          }
        : null,
      agenda,
    });
  });
}
