import { NextRequest, NextResponse } from "next/server";
import { issueOtp, OtpRateLimitError } from "@/lib/auth/otp";
import { z } from "zod";

const Body = z.object({
  phone: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد."),
});

/**
 * POST /api/v1/auth/otp
 *
 * Issue a one-time password for the given phone number.
 * In dev, the OTP code is returned in the response so the architect can
 * log in without an SMS gateway. In prod, the code is sent via SMS only
 * and `code` is null.
 *
 * Rate-limit: max 3 requests per phone per 5 minutes (per Section 3).
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    );
  }

  try {
    const { code, expiresInMs } = issueOtp(body.phone);
    return NextResponse.json({
      ok: true,
      expiresInMs,
      // Dev convenience: surface the OTP so the user can paste it from the toast.
      // In prod, this is `null`.
      devCode: code,
      message: code
        ? `کد یک‌بار مصرف (محیط توسعه): ${code}`
        : "کد یک‌بار مصرف ارسال شد. لطفاً صبر کنید.",
    });
  } catch (e) {
    if (e instanceof OtpRateLimitError) {
      return NextResponse.json(
        { ok: false, error: e.message, retryAfterMs: e.retryAfterMs },
        { status: 429 }
      );
    }
    throw e;
  }
}
