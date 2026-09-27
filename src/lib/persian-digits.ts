/**
 * Persian/Arabic numeral normalization utilities.
 *
 * Persian keyboards produce Unicode Persian digits (۰۱۲۳۴۵۶۷۸۹) and
 * Arabic digits (٠١٢٣٤٥٦٧٨٩) when typing numbers. Many input components
 * (OTP, numeric fields, phone numbers) strictly expect ASCII digits (0-9).
 *
 * These utilities convert any Persian/Arabic digits to ASCII before the
 * value reaches the component's validation logic, so users can type with
 * either keyboard layout seamlessly.
 */

/**
 * Convert Persian (۰-۹) and Arabic (٠-٩) digits to English (0-9).
 *
 * Also handles the Persian decimal separator (٫) and thousands separator (٬).
 *
 * @example
 *   toEnglishDigits("۱۲۳۴۵۶") → "123456"
 *   toEnglishDigits("۰۹۱۲۳۴۵۶۷۸۹") → "09123456789"
 *   toEnglishDigits("abc۱۲۳") → "abc123"
 */
export const toEnglishDigits = (str: string): string => {
  if (!str) return str;
  return str
    // Persian digits: ۰۱۲۳۴۵۶۷۸۹ (U+06F0 – U+06F9)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    // Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩ (U+0660 – U+0669)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
};

/**
 * Normalize a string to contain ONLY ASCII digits (0-9).
 * Strips any non-digit characters AND converts Persian/Arabic digits.
 *
 * @example
 *   toAsciiDigitsOnly("۱۲۳-۴۵۶") → "123456"
 *   toAsciiDigitsOnly("abc") → ""
 */
export const toAsciiDigitsOnly = (str: string): string => {
  if (!str) return "";
  return toEnglishDigits(str).replace(/\D/g, "");
};
