import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * JWT helpers for Samik (Section 2 & 3 of architecture doc).
 *
 * Two token shapes are used:
 *
 *  1. Root Token — issued right after OTP verification. Contains the user's
 *     full `roles` map across all schools they belong to. Used to render the
 *     Profile Switcher.
 *
 *  2. Contextual Token — issued after the user picks a specific profile
 *     (school + role). Contains a SINGLE `schoolId` + `role`. This is the
 *     token used for all subsequent API calls inside that tenant context.
 *
 * Per Section 3 ("Security Checkpoints"):
 *   - JWT payload contains ONLY: userId, schoolId (optional), role (optional).
 *     NEVER national_code or other PII.
 *   - Access token TTL: 1 hour. Refresh handled in Phase 4.
 *
 * Uses `jose` (WebCrypto) so the same `verify()` works inside Next.js Edge
 * middleware where Node's `jsonwebtoken` is unavailable.
 */

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "samik-dev-secret-change-in-production-min-32-chars-long"
);
const ISSUER = "samik";
const AUDIENCE = "samik-client";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export interface SamikRootPayload extends JWTPayload {
  kind: "root";
  userId: string;
  /** phone for display only — never PII like national code */
  phone: string;
  /** Map of schoolId → array of roles the user holds in that school. */
  roles: Record<string, string[]>;
}

export interface SamikContextualPayload extends JWTPayload {
  kind: "contextual";
  userId: string;
  schoolId: string;
  role: string;
  /** When present, identifies the student this user is a guardian of. */
  studentEnrollmentId?: string;
}

export type SamikPayload = SamikRootPayload | SamikContextualPayload;

export async function signRootToken(payload: {
  userId: string;
  phone: string;
  roles: Record<string, string[]>;
}): Promise<string> {
  return new SignJWT({ ...payload, kind: "root" as const })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(SECRET);
}

export async function signContextualToken(payload: {
  userId: string;
  schoolId: string;
  role: string;
  studentEnrollmentId?: string;
}): Promise<string> {
  return new SignJWT({ ...payload, kind: "contextual" as const })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SamikPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as SamikPayload;
  } catch {
    return null;
  }
}

/**
 * The name of the HTTP-only cookie that holds the active token.
 * We use a cookie (not localStorage) so it is automatically attached to
 * every server-side fetch, and so it cannot be read by JavaScript
 * (XSS-resistant).
 */
export const AUTH_COOKIE_NAME = "samik_session";
export const SCHOOL_HEADER = "x-school-id";
export const IDEMPOTENCY_HEADER = "x-idempotency-key";
