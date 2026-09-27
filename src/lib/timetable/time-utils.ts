import { z } from "zod";

/**
 * Time validation utilities for Samik (Section 5 of architecture doc).
 *
 * All times are stored as `String` in "HH:mm" 24-hour format because
 * SQLite has no native TIME type. The format is chosen so that simple
 * string comparison (new_start < existing_end AND new_end > existing_start)
 * correctly computes time-range overlaps without any numeric conversion.
 *
 * "07:30" < "09:00"  →  true   (lexicographic = chronological for HH:mm 24h)
 * "21:00" < "07:00"  →  false  (no AM/PM ambiguity — both are 24-hour)
 *
 * Per Section 5 — Timezone Consistency directive: times are stored without
 * dates, and compared on the server in the school's local timezone
 * (default Asia/Tehran).
 */

export const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const hhmmSchema = z
  .string()
  .regex(HH_MM_REGEX, "زمان باید در قالب HH:mm (۲۴ ساعته) باشد، مثلاً 07:30");

/**
 * Check whether two [start, end) time ranges overlap.
 * Per the interval-overlap formula:
 *   overlap = max(a_start, b_start) < min(a_end, b_end)
 *
 * For "HH:mm" 24-hour strings, lexicographic comparison equals chronological
 * comparison because:
 *   - All strings have exactly 5 chars: "HH:MM"
 *   - Hour and minute are zero-padded to 2 digits
 *   - The colon is a fixed separator that does not affect ordering
 *
 * Therefore "07:30" < "09:00" via string comparison is equivalent to
 * 7*60+30 = 450 < 9*60+0 = 540 numerically.
 */
export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  // Validate format defensively
  for (const t of [aStart, aEnd, bStart, bEnd]) {
    if (!HH_MM_REGEX.test(t)) {
      throw new Error(`Invalid HH:mm time format: "${t}"`);
    }
  }
  // Touching ranges (a.end === b.start) do NOT overlap — a class ending at
  // 09:00 and another starting at 09:00 in the same room are not a conflict.
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Convert "HH:mm" → minutes since midnight (for sorting / display).
 */
export function hhmmToMinutes(t: string): number {
  const m = HH_MM_REGEX.exec(t);
  if (!m) throw new Error(`Invalid HH:mm: "${t}"`);
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Convert minutes since midnight → "HH:mm".
 */
export function minutesTohhmm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Format "HH:mm" for Persian display (e.g. "07:30" → "۰۷:۳۰").
 */
export function hhmmToPersian(t: string): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return t.replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}
