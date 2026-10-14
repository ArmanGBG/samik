/**
 * Timezone helpers for Samik (Section 5 — Timezone Consistency).
 *
 * Timetable data is authored and displayed in the school's local timezone
 * (Iran, `Asia/Tehran`, UTC+03:30 with no DST since 2022). Every comparison
 * between a wall-clock time and an instant MUST therefore be resolved through
 * this module, never through `Date.prototype.getHours()` / `toISOString()`,
 * which silently use the *host* timezone (UTC on Vercel, Asia/Tehran on a
 * developer laptop — the bug this module exists to prevent).
 *
 * The previous approach was:
 *
 *   const s = now.toLocaleString("en-US", { timeZone: "Asia/Tehran" });
 *   const tehranNow = new Date(s);      // <-- re-parsed in the HOST timezone
 *
 * That only round-trips when the server happens to run in Asia/Tehran, and
 * even then the resulting instant is shifted, so `toISOString()` disagrees
 * with the Tehran calendar date between 00:00 and 03:30.
 *
 * Everything here derives the wall-clock fields directly from the instant via
 * `Intl.DateTimeFormat`, so the result is identical on any host.
 */

export const TEHRAN_TIME_ZONE = "Asia/Tehran";

export interface ZonedDateParts {
  /** 1-based calendar fields in the target timezone. */
  year: number;
  month: number;
  day: number;
  /** 0-23. Midnight is always 0 (never 24). */
  hour: number;
  minute: number;
  second: number;
  /** JS convention: 0 = Sunday .. 6 = Saturday. */
  jsWeekday: number;
  /** Samik convention: 0 = Saturday .. 6 = Friday. */
  samikDayOfWeek: number;
  /** "YYYY-MM-DD" calendar date in the target timezone. */
  dateKey: string;
  /** Minutes elapsed since midnight in the target timezone. */
  minutesOfDay: number;
  /** "HH:mm" wall clock in the target timezone. */
  hhmm: string;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Break an instant into wall-clock fields for the given timezone.
 *
 * The weekday is derived from the *zoned calendar date* rather than the
 * instant, so the day roll-over at Tehran midnight (which is 20:30 UTC the
 * previous day) is handled correctly.
 */
export function getZonedDateParts(
  date: Date,
  timeZone: string = TEHRAN_TIME_ZONE
): ZonedDateParts {
  const bag: Record<string, string> = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }

  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);
  // Some ICU builds render midnight as hour 24 under hour12:false; normalise.
  const hour = Number(bag.hour) % 24;
  const minute = Number(bag.minute);
  const second = Number(bag.second);

  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    jsWeekday,
    samikDayOfWeek: (jsWeekday + 1) % 7,
    dateKey: `${year}-${pad2(month)}-${pad2(day)}`,
    minutesOfDay: hour * 60 + minute,
    hhmm: `${pad2(hour)}:${pad2(minute)}`,
  };
}

/** Wall-clock fields for `now` in Tehran. */
export function tehranNowParts(now: Date = new Date()): ZonedDateParts {
  return getZonedDateParts(now, TEHRAN_TIME_ZONE);
}

/** "YYYY-MM-DD" for `now` in Tehran. */
export function tehranDateKey(now: Date = new Date()): string {
  return tehranNowParts(now).dateKey;
}

/** Samik day-of-week (0 = Saturday .. 6 = Friday) for `now` in Tehran. */
export function tehranSamikDayOfWeek(now: Date = new Date()): number {
  return tehranNowParts(now).samikDayOfWeek;
}

/** True when the two instants fall on the same Tehran calendar date. */
export function isSameZonedDay(
  a: Date,
  b: Date,
  timeZone: string = TEHRAN_TIME_ZONE
): boolean {
  return getZonedDateParts(a, timeZone).dateKey === getZonedDateParts(b, timeZone).dateKey;
}

const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Samik day-of-week (0 = Saturday .. 6 = Friday) for a "YYYY-MM-DD" key.
 * Used to place SINGLE_SESSION slots in the correct timetable column.
 */
export function samikDayOfWeekForDateKey(dateKey: string): number {
  const m = DATE_KEY_REGEX.exec(dateKey);
  if (!m) throw new Error(`Invalid date key: "${dateKey}"`);
  // Noon avoids any DST-boundary edge case while staying on the same day.
  const jsWeekday = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  ).getUTCDay();
  return (jsWeekday + 1) % 7;
}

/**
 * Parse a stored `specificDate` into the "YYYY-MM-DD" calendar key the user
 * actually picked. Dates are persisted as UTC midnight, so the Tehran
 * rendering of that instant is the intended day.
 */
export function zonedDateKeyFor(
  date: Date | string,
  timeZone: string = TEHRAN_TIME_ZONE
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: "${String(date)}"`);
  return getZonedDateParts(d, timeZone).dateKey;
}

/**
 * Normalise a user-supplied "YYYY-MM-DD" (or full ISO string) into the UTC
 * instant we persist, so that every row is stored as UTC midnight and renders
 * back to the same calendar day in Tehran.
 */
export function normalizeSpecificDate(value: Date | string): Date {
  return new Date(`${zonedDateKeyFor(value)}T00:00:00.000Z`);
}

/**
 * The UTC instant range `[gte, lte]` covering one whole calendar day in the
 * target timezone — used to scope "today's" ClassSession rows.
 */
export function zonedDayRangeUtc(
  dateKey: string,
  timeZone: string = TEHRAN_TIME_ZONE
): { gte: Date; lte: Date } {
  const start = zonedDayStartUtc(dateKey, timeZone);
  return { gte: start, lte: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

/** The UTC instant at which `dateKey` begins in the target timezone. */
export function zonedDayStartUtc(
  dateKey: string,
  timeZone: string = TEHRAN_TIME_ZONE
): Date {
  const m = DATE_KEY_REGEX.exec(dateKey);
  if (!m) throw new Error(`Invalid date key: "${dateKey}"`);
  const targetMidnight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // Two fixed-point passes converge for every real-world offset.
  let guess = targetMidnight;
  for (let i = 0; i < 3; i++) {
    const p = getZonedDateParts(new Date(guess), timeZone);
    const renderedMidnight = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const delta = targetMidnight - renderedMidnight;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}
