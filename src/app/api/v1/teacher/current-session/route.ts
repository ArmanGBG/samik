import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { calculateWeekParity, weekTypeMatches } from "@/lib/timetable/week-parity";
import { currentSamikDayOfWeek } from "@/lib/timetable/days";
import { HH_MM_REGEX, hhmmToPersian } from "@/lib/timetable/time-utils";

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

    // Get the school's termStartDate for week-parity calculation
    const todaySamikDay = currentSamikDayOfWeek(now);
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
    const nowHHmm =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");

    if (!HH_MM_REGEX.test(nowHHmm)) {
      return NextResponse.json({ ok: false, error: "خطای محاسبه زمان." }, { status: 500 });
    }

    // Filter by weekType matching current parity
    const parityMatched = todaysSlots.filter((s) => weekTypeMatches(s.weekType, parityResult));

    // Find the active session: current time within [startTime, endTime]
    // with a 15-minute tolerance BEFORE startTime (teacher can open the
    // roll-call early per Section 5).
    const TOLERANCE_MINUTES = 15;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let activeSlot: (typeof parityMatched)[number] | null = null;
    for (const slot of parityMatched) {
      if (!HH_MM_REGEX.test(slot.bellSchedule.startTime) || !HH_MM_REGEX.test(slot.bellSchedule.endTime)) {
        continue;
      }
      const [sh, sm] = slot.bellSchedule.startTime.split(":").map(Number);
      const [eh, em] = slot.bellSchedule.endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      // Active if now >= start - 15min AND now < end
      if (nowMinutes >= startMin - TOLERANCE_MINUTES && nowMinutes < endMin) {
        activeSlot = slot;
        break;
      }
    }

    // Build the agenda (all matched slots for today, for fallback rendering)
    const agenda = parityMatched.map((s) => ({
      slotId: s.id,
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
        todaySamikDay,
        parity: parityResult.isUnconfigured ? null : parityResult.parity,
        weekNumber: parityResult.weekNumber,
        isPreTerm: parityResult.isPreTerm,
        isUnconfigured: parityResult.isUnconfigured,
        toleranceMinutes: TOLERANCE_MINUTES,
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
