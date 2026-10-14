import { toJalaali, toGregorian } from "jalaali-js";

/**
 * Safely parse input into a valid Date instance or null.
 */
function parseDate(date: string | number | Date | null | undefined): Date | null {
  if (date === null || date === undefined || date === "") return null;
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date/string/timestamp into a two-digit Persian (Solar Hijri) numerical date.
 * Example: "۱۴۰۴/۰۷/۱۰"
 */
export function toPersianDate(
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(date);
  if (!d) return "—";

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  }).format(d);
}

/**
 * Formats a Date/string/timestamp into a long Persian text date.
 * Example: "۱۰ مهر ۱۴۰۴"
 */
export function toPersianDateLong(
  date: string | number | Date | null | undefined
): string {
  const d = parseDate(date);
  if (!d) return "—";

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Formats a Date/string/timestamp into a Persian date + time string.
 * Example: "۱۴۰۴/۰۷/۱۰، ۰۰:۴۰"
 */
export function toPersianDateTime(
  date: string | number | Date | null | undefined
): string {
  const d = parseDate(date);
  if (!d) return "—";

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formats the time part of a date in Persian numerals.
 * Example: "۰۸:۳۰"
 */
export function toPersianTime(
  date: string | number | Date | null | undefined
): string {
  const d = parseDate(date);
  if (!d) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Returns Gregorian date in YYYY-MM-DD format (standard ISO date for HTML inputs).
 */
export function toIsoDateString(
  date: string | number | Date | null | undefined
): string {
  const d = parseDate(date);
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts a Gregorian Date into Jalali year, month, day.
 */
export function gregorianToJalali(date: Date): { jy: number; jm: number; jd: number } {
  return toJalaali(date);
}

/**
 * Converts a Jalali year, month, day into a Gregorian Date.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const g = toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}
