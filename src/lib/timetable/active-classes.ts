import { db } from "@/lib/db";
import { calculateWeekParity, weekTypeMatches } from "@/lib/timetable/week-parity";
import { tehranNowParts, zonedDayRangeUtc } from "@/lib/timetable/tehran-time";
import { isSlotActiveNow, minutesSinceStart } from "@/lib/timetable/time-utils";

/**
 * Single server-side resolver for "which classes are running right now?".
 *
 * The deputy live dashboard and the teacher dashboard both derive from this,
 * so they cannot disagree about the current class. Crucially this runs on the
 * server in the school's timezone; the previous client-side implementation
 * read the *visitor's* browser clock and ignored week parity entirely, which
 * made ODD/EVEN and single-session classes appear on the wrong week and made
 * the deputy panel disagree with the teacher panel.
 */

export interface ActiveClassRow {
  slotId: string;
  classRoomId: string;
  classRoomName: string;
  subjectTitle: string;
  teacherId: string;
  teacherName: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
  weekType: string;
  minutesSinceStart: number;
  /** True when today's attendance for this slot was already submitted. */
  hasSubmittedAttendance: boolean;
}

export interface ActiveClassesResult {
  active: ActiveClassRow[];
  now: {
    instant: string;
    dateKey: string;
    hhmm: string;
    samikDayOfWeek: number;
    parity: "ODD_WEEKS" | "EVEN_WEEKS" | null;
    weekNumber: number;
    isUnconfigured: boolean;
  };
}

export async function resolveActiveClasses(
  schoolId: string,
  options: { now?: Date; teacherUserId?: string } = {}
): Promise<ActiveClassesResult> {
  const now = options.now ?? new Date();
  const tehran = tehranNowParts(now);

  const school = await db.school.findFirst({
    where: { id: schoolId },
    select: { id: true, name: true, termStartDate: true },
  });

  const parityResult = calculateWeekParity(school?.termStartDate, now);

  const baseWhere = {
    schoolId,
    dayOfWeek: tehran.samikDayOfWeek,
    ...(options.teacherUserId ? { teacherUserId: options.teacherUserId } : {}),
  };

  // Scope "today's attendance" to the Tehran calendar day, not the UTC day.
  const { gte, lte } = zonedDayRangeUtc(tehran.dateKey);

  const slots = await db.timetableSlot.findMany({
    where: baseWhere,
    include: {
      classRoom: { select: { id: true, name: true, gradeLevel: true } },
      subject: { select: { id: true, title: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
      classSessions: {
        where: { date: { gte, lte }, status: "SUBMITTED" },
        select: { id: true },
      },
    },
    orderBy: { bellSchedule: { startTime: "asc" } },
  });

  const active: ActiveClassRow[] = [];
  for (const slot of slots) {
    if (!weekTypeMatches(slot.weekType, parityResult, slot.specificDate, tehran.dateKey)) {
      continue;
    }
    const window = {
      startTime: slot.bellSchedule.startTime,
      endTime: slot.bellSchedule.endTime,
    };
    if (!isSlotActiveNow(window, { minutesOfDay: tehran.minutesOfDay })) continue;

    active.push({
      slotId: slot.id,
      classRoomId: slot.classRoom.id,
      classRoomName: `${slot.classRoom.gradeLevel} ${slot.classRoom.name}`,
      subjectTitle: slot.subject.title,
      teacherId: slot.teacher.id,
      teacherName: `${slot.teacher.firstName} ${slot.teacher.lastName}`,
      bellTitle: slot.bellSchedule.title,
      startTime: slot.bellSchedule.startTime,
      endTime: slot.bellSchedule.endTime,
      weekType: slot.weekType,
      minutesSinceStart: minutesSinceStart(window, tehran.minutesOfDay),
      hasSubmittedAttendance: slot.classSessions.length > 0,
    });
  }

  return {
    active,
    now: {
      instant: now.toISOString(),
      dateKey: tehran.dateKey,
      hhmm: tehran.hhmm,
      samikDayOfWeek: tehran.samikDayOfWeek,
      parity: parityResult.isUnconfigured ? null : parityResult.parity,
      weekNumber: parityResult.weekNumber,
      isUnconfigured: parityResult.isUnconfigured,
    },
  };
}
