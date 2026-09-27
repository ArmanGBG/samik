/**
 * OTP Store — In-memory OTP simulation (Section 3 of architecture doc).
 *
 * In production this is backed by Redis with a 2-minute TTL. For dev we use
 * a simple Map with manual expiry + rate-limit counters.
 *
 * Rate Limiting (Section 3 — "Security Checkpoints"):
 *   - Max 3 OTP requests per phone number per 5-minute sliding window
 *     (prevents SMS bombing).
 *   - Each OTP expires after 2 minutes.
 *   - Each OTP can be verified at most 5 times (then it is burned).
 */

const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const OTP_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 3;

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface RateLimitRecord {
  requests: number[]; // timestamps
}

interface OtpStore {
  otp: Map<string, OtpRecord>;
  rate: Map<string, RateLimitRecord>;
}

// In Next.js dev mode, route handlers can be hot-reloaded into separate module
// instances. Pin the OTP store to globalThis so it survives across handlers
// (and across HMR). In production (Node), `globalThis` is shared anyway.
const _g = globalThis as unknown as { __samikOtpStore?: OtpStore };
if (!_g.__samikOtpStore) {
  _g.__samikOtpStore = { otp: new Map(), rate: new Map() };
}
const otpStore: Map<string, OtpRecord> = _g.__samikOtpStore.otp;
const rateLimitStore: Map<string, RateLimitRecord> = _g.__samikOtpStore.rate;

function now(): number {
  return Date.now();
}

function pruneRateLimit(rec: RateLimitRecord): RateLimitRecord {
  const cutoff = now() - RATE_LIMIT_WINDOW_MS;
  rec.requests = rec.requests.filter((t) => t >= cutoff);
  return rec;
}

/**
 * Issue a new OTP for the given phone number.
 * Returns the OTP code (for the dev simulation, we surface it to the client so
 * the architect can log in without a real SMS gateway). In production this
 * return value is `null` and the code is delivered via SMS only.
 *
 * @throws Error if rate-limited.
 */
export function issueOtp(phone: string): { code: string | null; expiresInMs: number } {
  // Rate limit check
  const rl = pruneRateLimit(rateLimitStore.get(phone) ?? { requests: [] });
  if (rl.requests.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now() - rl.requests[0]);
    throw new OtpRateLimitError(retryAfterMs);
  }
  rl.requests.push(now());
  rateLimitStore.set(phone, rl);

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, {
    code,
    expiresAt: now() + OTP_TTL_MS,
    attempts: 0,
  });

  return {
    code: process.env.NODE_ENV === "development" ? code : null,
    expiresInMs: OTP_TTL_MS,
  };
}

/**
 * Verify an OTP. On success, the OTP is consumed (cannot be reused).
 * On failure (wrong / expired / exhausted), throws.
 */
export function verifyOtp(phone: string, code: string): boolean {
  const rec = otpStore.get(phone);
  if (!rec) throw new OtpNotFoundError();
  if (now() > rec.expiresAt) {
    otpStore.delete(phone);
    throw new OtpExpiredError();
  }
  if (rec.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(phone);
    throw new OtpMaxAttemptsError();
  }
  rec.attempts += 1;
  if (rec.code !== code) {
    throw new OtpInvalidError();
  }
  // Consume
  otpStore.delete(phone);
  return true;
}

export class OtpRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`تعداد درخواست‌های شما بیش از حد مجاز است. ${Math.ceil(retryAfterMs / 1000)} ثانیه دیگر تلاش کنید.`);
    this.name = "OtpRateLimitError";
  }
}
export class OtpExpiredError extends Error {
  constructor() {
    super("کد یک‌بار مصرف منقضی شده است. لطفاً کد جدیدی درخواست کنید.");
    this.name = "OtpExpiredError";
  }
}
export class OtpInvalidError extends Error {
  constructor() {
    super("کد یک‌بار مصرف اشتباه است.");
    this.name = "OtpInvalidError";
  }
}
export class OtpMaxAttemptsError extends Error {
  constructor() {
    super("تعداد تلاش‌های اشتباه بیش از حد مجاز است. لطفاً کد جدیدی درخواست کنید.");
    this.name = "OtpMaxAttemptsError";
  }
}
export class OtpNotFoundError extends Error {
  constructor() {
    super("هیچ کد فعالی برای این شماره یافت نشد. لطفاً کد جدیدی درخواست کنید.");
    this.name = "OtpNotFoundError";
  }
}
