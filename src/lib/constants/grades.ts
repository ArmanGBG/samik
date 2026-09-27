/**
 * Grade + Major constants for Iranian schools.
 *
 * Grades 1-6 are elementary (ابتدایی), 7-9 are middle school (متوسطه اول),
 * 10-12 are high school (متوسطه دوم). Only grades 10-12 have a Major (رشته).
 */

export interface GradeInfo {
  /** Storage value — Persian numerals stored as String in DB */
  value: string;
  /** Display label */
  label: string;
  /** 1-based grade number */
  number: number;
  /** True if this grade has a Major (رشته) — only 10-12 */
  hasMajor: boolean;
}

export const GRADES: GradeInfo[] = [
  { value: "اول",   label: "اول (پایه ۱)",   number: 1,  hasMajor: false },
  { value: "دوم",   label: "دوم (پایه ۲)",   number: 2,  hasMajor: false },
  { value: "سوم",   label: "سوم (پایه ۳)",   number: 3,  hasMajor: false },
  { value: "چهارم", label: "چهارم (پایه ۴)", number: 4,  hasMajor: false },
  { value: "پنجم",  label: "پنجم (پایه ۵)",  number: 5,  hasMajor: false },
  { value: "ششم",   label: "ششم (پایه ۶)",   number: 6,  hasMajor: false },
  { value: "هفتم",  label: "هفتم (پایه ۷)",  number: 7,  hasMajor: false },
  { value: "هشتم",  label: "هشتم (پایه ۸)",  number: 8,  hasMajor: false },
  { value: "نهم",   label: "نهم (پایه ۹)",   number: 9,  hasMajor: false },
  { value: "دهم",   label: "دهم (پایه ۱۰)", number: 10, hasMajor: true },
  { value: "یازدهم",label: "یازدهم (پایه ۱۱)", number: 11, hasMajor: true },
  { value: "دوازدهم",label: "دوازدهم (پایه ۱۲)", number: 12, hasMajor: true },
];

export interface MajorInfo {
  /** Storage value — English enum-like string stored in DB */
  value: string;
  /** Persian display label */
  label: string;
  /** Short badge label */
  short: string;
}

export const MAJORS: MajorInfo[] = [
  { value: "MATHEMATICS", label: "ریاضی فیزیک",    short: "ریاضی" },
  { value: "EXPERIMENTAL", label: "تجربی",           short: "تجربی" },
  { value: "HUMANITIES",  label: "علوم انسانی",     short: "انسانی" },
  { value: "TECHNICAL",   label: "فنی حرفه‌ای",     short: "فنی" },
  { value: "VOCATIONAL",  label: "کاردانش",         short: "کاردانش" },
];

/** Check if a grade value should show the Major select */
export function gradeHasMajor(gradeValue: string): boolean {
  const grade = GRADES.find((g) => g.value === gradeValue);
  return grade?.hasMajor ?? false;
}

/** Get the major display label from its storage value */
export function getMajorLabel(majorValue: string | null | undefined): string {
  if (!majorValue) return "";
  return MAJORS.find((m) => m.value === majorValue)?.label ?? majorValue;
}

/** Get the short badge label from its storage value */
export function getMajorShort(majorValue: string | null | undefined): string {
  if (!majorValue) return "";
  return MAJORS.find((m) => m.value === majorValue)?.short ?? majorValue;
}
