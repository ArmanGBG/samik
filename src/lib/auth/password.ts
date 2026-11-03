import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Default password formula for new students/users
 * and legacy accounts that haven't set a personal password yet.
 */
export const DEFAULT_INITIAL_PASSWORD = "123456";

/**
 * Securely hashes a plain-text password using Node.js built-in scrypt KDF.
 * Format: `<salt_hex>:<derived_key_hex>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plain-text password against a stored scrypt hash.
 * Resistant to timing attacks using `timingSafeEqual`.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = scryptSync(password, salt, 64);
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
