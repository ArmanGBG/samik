/**
 * Day-of-week helpers (Section 5 of architecture doc).
 *
 * `TimetableSlot.dayOfWeek` is stored as an Integer 0..6 per the final ERD
 * (Section 9). The mapping below follows the Iranian school week, where
 * Saturday (شنبه) is the first day:
 *
 *   0 = Saturday   (شنبه)
 *   1 = Sunday     (یکشنبه)
 *   2 = Monday     (دوشنبه)
 *   3 = Tuesday    (سه‌شنبه)
 *   4 = Wednesday  (چهارشنبه)
 *   5 = Thursday   (پنجشنبه)
 *   6 = Friday     (جمعه) — weekend, usually no classes
 *
 * NOTE: JavaScript `Date.prototype.getDay()` returns 0=Sunday..6=Saturday.
 * Use `jsGetDayToSamikDay()` to convert.
 */

export interface DayInfo {
  value: number;
  englishName: string;
  persianName: string;
  persianShort: string;
  isWeekend: boolean;
}

export const DAYS_OF_WEEK: DayInfo[] = [
  { value: 0, englishName: "Saturday",  persianName: "شنبه",      persianShort: "ش", isWeekend: false },
  { value: 1, englishName: "Sunday",    persianName: "یکشنبه",    persianShort: "ی", isWeekend: false },
  { value: 2, englishName: "Monday",    persianName: "دوشنبه",    persianShort: "د", isWeekend: false },
  { value: 3, englishName: "Tuesday",   persianName: "سه‌شنبه",   persianShort: "س", isWeekend: false },
  { value: 4, englishName: "Wednesday", persianName: "چهارشنبه",  persianShort: "چ", isWeekend: false },
  { value: 5, englishName: "Thursday",  persianName: "پنجشنبه",   persianShort: "پ", isWeekend: false },
  { value: 6, englishName: "Friday",    persianName: "جمعه",      persianShort: "ج", isWeekend: true  },
];

export function dayToPersian(d: number): string {
  return DAYS_OF_WEEK[d]?.persianName ?? `روز ${d}`;
}

/**
 * Convert a JavaScript Date's getDay() (0=Sunday..6=Saturday) to the
 * Samik dayOfWeek (0=Saturday..6=Friday).
 *
 *   JS getDay()=6 (Saturday)   → Samik 0
 *   JS getDay()=0 (Sunday)    → Samik 1
 *   JS getDay()=1 (Monday)    → Samik 2
 *   JS getDay()=2 (Tuesday)   → Samik 3
 *   JS getDay()=3 (Wednesday) → Samik 4
 *   JS getDay()=4 (Thursday)  → Samik 5
 *   JS getDay()=5 (Friday)    → Samik 6
 */
export function jsGetDayToSamikDay(jsDay: number): number {
  // (jsDay + 1) % 7 maps the above table correctly
  return (jsDay + 1) % 7;
}

/**
 * Get the current Samik day-of-week for "now" in the given timezone.
 */
export function currentSamikDayOfWeek(now: Date = new Date()): number {
  return jsGetDayToSamikDay(now.getDay());
}
