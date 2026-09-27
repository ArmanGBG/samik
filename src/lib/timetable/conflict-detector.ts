import { db } from "@/lib/db";
import { runBypassingTenant } from "@/lib/prisma/tenant-context";
import { timeRangesOverlap, HH_MM_REGEX } from "./time-utils";

/**
 * Global Conflict Detector (Section 5 of architecture doc).
 *
 * "موتور تشخیص تداخل سراسری (Global Conflict Detection)"
 *
 * When a Deputy assigns a Teacher to a new TimetableSlot, the API MUST
 * check — ACROSS ALL SCHOOLS — whether that teacher already has a class
 * at the same dayOfWeek with an overlapping time range.
 *
 * Critical architectural point: since the teacher is a global entity
 * (`User`) who may teach at multiple schools, and since each school has
 * its own BellSchedule with potentially different start/end times, we
 * cannot just compare "Bell N" labels. We must compare actual time
 * ranges. The check spans ALL schools — so it MUST bypass the tenant
 * filter (the conceptual RLS policy from Section 1).
 *
 * Per Section 5 — Developer Directives:
 *   > "The service that checks teacher conflicts MUST exceptionally
 *   >  bypass the school_id-restricting middleware to read data from
 *   >  other schools — WITHOUT leaking sensitive info from other schools
 *   >  to the client."
 *
 * The result returned to the Deputy only contains:
 *   - The conflicting school's NAME (so the deputy can be informed)
 *   - The conflicting slot's day/time
 * It does NOT leak student lists, grades, or other tenant data.
 */

export interface ConflictCheckInput {
  teacherUserId: string;
  dayOfWeek: number;          // 0..6 (Samik day-of-week)
  weekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS";
  startTime: string;          // "HH:mm"
  endTime: string;            // "HH:mm"
  /**
   * If provided, this slot ID is excluded from the conflict check
   * (used when EDITING an existing slot — it shouldn't conflict with itself).
   */
  excludeSlotId?: string;
}

export interface ConflictFinding {
  /** The school where the conflicting slot is defined. */
  schoolId: string;
  schoolName: string;
  slotId: string;
  dayOfWeek: number;
  weekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS";
  startTime: string;
  endTime: string;
  classroomName: string;
  subjectTitle: string;
}

/**
 * Two weekTypes conflict (overlap in calendar weeks) if:
 *   - either is ALL_WEEKS (covers every week)
 *   - or both are the same parity (ODD+ODD or EVEN+EVEN)
 *
 * ODD_WEEKS vs EVEN_WEEKS = NO week overlap → never a conflict.
 */
function weekTypesOverlap(
  a: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS",
  b: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS"
): boolean {
  if (a === "ALL_WEEKS" || b === "ALL_WEEKS") return true;
  return a === b;
}

/**
 * Detect cross-tenant teacher timetable conflicts.
 *
 * Runs with `bypassTenantFilter: true` (via runBypassingTenant) so the
 * Prisma tenant-extension does NOT inject `WHERE school_id = $current`.
 * This is the documented exception to the RLS rule.
 *
 * The query reads all TimetableSlots for this teacher on this dayOfWeek
 * (across all schools), then performs a client-side time-overlap check
 * against the requested range. SQLite lacks native TIME-overlap operators,
 * so we do the overlap check in TypeScript using the string-comparison
 * formula from `time-utils.ts`.
 *
 * @returns Array of conflict findings. Empty array = no conflict.
 */
export async function detectTeacherConflict(
  input: ConflictCheckInput
): Promise<ConflictFinding[]> {
  // Validate time format
  for (const t of [input.startTime, input.endTime]) {
    if (!HH_MM_REGEX.test(t)) {
      throw new Error(`Invalid HH:mm time format in conflict detector: "${t}"`);
    }
  }
  if (input.startTime >= input.endTime) {
    throw new Error(`start time must be before end time: ${input.startTime} >= ${input.endTime}`);
  }

  return runBypassingTenant(async () => {
    // Cross-tenant query: bypass tenant filter is active, so this reads
    // ALL TimetableSlots for this teacher across ALL schools.
    const candidates = await db.timetableSlot.findMany({
      where: {
        teacherUserId: input.teacherUserId,
        dayOfWeek: input.dayOfWeek,
        ...(input.excludeSlotId ? { id: { not: input.excludeSlotId } } : {}),
      },
      include: {
        school: { select: { id: true, name: true } },
        classRoom: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, title: true } },
        bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
      },
    });

    const conflicts: ConflictFinding[] = [];

    for (const slot of candidates) {
      // Week-type must overlap (ALL_WEEKS is universal)
      if (!weekTypesOverlap(input.weekType, slot.weekType)) continue;

      // Time-range overlap check using the lexicographic HH:mm formula.
      // Touching ranges (e.g. one ends at 09:00, the other starts at 09:00)
      // are NOT considered a conflict.
      const bell = slot.bellSchedule;
      if (!bell) continue;

      try {
        if (timeRangesOverlap(input.startTime, input.endTime, bell.startTime, bell.endTime)) {
          conflicts.push({
            schoolId: slot.school.id,
            schoolName: slot.school.name,
            slotId: slot.id,
            dayOfWeek: slot.dayOfWeek,
            weekType: slot.weekType,
            startTime: bell.startTime,
            endTime: bell.endTime,
            classroomName: `${slot.classRoom.gradeLevel} ${slot.classRoom.name}`,
            subjectTitle: slot.subject.title,
          });
        }
      } catch {
        // Malformed time in DB — skip this slot defensively
        continue;
      }
    }

    return conflicts;
  });
}
