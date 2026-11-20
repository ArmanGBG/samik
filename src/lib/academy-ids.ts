import { randomBytes } from "crypto";

/**
 * Generate a short, collision-resistant code for Academy classes.
 * Format: CLS-XXXXXX (e.g. CLS-8K2P9Q)
 * Excludes confusing characters like 0, O, 1, I, L.
 */
const SAFE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateAcademyClassId(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return `CLS-${code}`;
}

export function generateStudentCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return `STU-${code}`;
}

export function generateTeacherCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return `TCH-${code}`;
}
