/**
 * Week Parity Calculator (Section 5 of architecture doc).
 *
 * The school sets `School.termStartDate` — the anchor date. The 7-day
 * window containing that date is "Week 1 = ODD_WEEKS". Every subsequent
 * 7-day window alternates ODD / EVEN / ODD / EVEN / ...
 *
 * Examples (termStartDate = 2024-09-21, a Saturday):
 *   2024-09-21 to 2024-09-27 → Week 1 → ODD
 *   2024-09-28 to 2024-10-04 → Week 2 → EVEN
 *   2024-10-05 to 2024-10-11 → Week 3 → ODD
 *   ...
 *
 * Before the term start date, parity is still computed by counting
 * backwards — but we return ODD by default to be safe. The teacher
 * current-session endpoint treats "before term start" as "no current
 * session" anyway.
 *
 * Per Section 5 — Reference Week directive: the architecture doc says the
 * reference_date identifies the FIRST SATURDAY of the academic year. We
 * do not strictly require that here — any date works as the parity anchor.
 * The Principal UI will recommend picking the first Saturday.
 */

export type WeekParity = "ODD_WEEKS" | "EVEN_WEEKS";

export interface WeekParityResult {
  /** ODD_WEEKS or EVEN_WEEKS */
  parity: WeekParity;
  /** 1-based week number since termStartDate (always >= 1). */
  weekNumber: number;
  /** True if today is BEFORE the termStartDate (pre-term). */
  isPreTerm: boolean;
  /** True if termStartDate is not configured. */
  isUnconfigured: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Calculate the current week parity for a school, based on its termStartDate.
 *
 * @param termStartDate  The anchor date (School.termStartDate). If null,
 *                       returns isUnconfigured=true (caller should treat as
 *                       "no parity constraint" — only ALL_WEEKS slots match).
 * @param now            The current timestamp (default: new Date()).
 *                       In production we always pass this explicitly to
 *                       make the function pure and testable.
 */
export function calculateWeekParity(
  termStartDate: Date | null | undefined,
  now: Date = new Date()
): WeekParityResult {
  if (!termStartDate) {
    return {
      parity: "ODD_WEEKS", // unused when isUnconfigured
      weekNumber: 0,
      isPreTerm: false,
      isUnconfigured: true,
    };
  }

  const diffMs = now.getTime() - termStartDate.getTime();

  if (diffMs < 0) {
    // Pre-term — parity still calculable but conceptually meaningless.
    // We return ODD as the safe default for matching.
    const weeksBefore = Math.floor(-diffMs / MS_PER_WEEK) + 1;
    const parity: WeekParity = weeksBefore % 2 === 1 ? "ODD_WEEKS" : "EVEN_WEEKS";
    return {
      parity,
      weekNumber: -weeksBefore,
      isPreTerm: true,
      isUnconfigured: false,
    };
  }

  // Week 1 starts at termStartDate. Week N starts at termStartDate + (N-1)*7 days.
  // weekNumber = floor(diffDays / 7) + 1
  const weekNumber = Math.floor(diffMs / MS_PER_WEEK) + 1;
  const parity: WeekParity = weekNumber % 2 === 1 ? "ODD_WEEKS" : "EVEN_WEEKS";

  return {
    parity,
    weekNumber,
    isPreTerm: false,
    isUnconfigured: false,
  };
}

/**
 * Decide whether a `TimetableSlot.weekType` matches the current parity.
 *
 *   ALL_WEEKS  → always matches
 *   ODD_WEEKS  → matches if current parity is ODD
 *   EVEN_WEEKS → matches if current parity is EVEN
 *
 * If the school has no termStartDate configured, ONLY ALL_WEEKS slots
 * match (we don't know the parity).
 */
export function weekTypeMatches(
  slotWeekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS",
  parityResult: WeekParityResult
): boolean {
  if (slotWeekType === "ALL_WEEKS") return true;
  if (parityResult.isUnconfigured) return false;
  return slotWeekType === parityResult.parity;
}
