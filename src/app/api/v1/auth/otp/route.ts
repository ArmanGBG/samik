import { NextRequest, NextResponse } from "next/server";
import { issueOtp, OtpRateLimitError } from "@/lib/auth/otp";
import { getSmsProvider } from "@/lib/sms/provider";
import { z } from "zod";

const Body = z.object({
  phone: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد."),
});

/**
 * POST /api/v1/auth/otp
 *
 * Issue a one-time password for the given phone number, then send it
 * via the active SMS provider's OTP pattern.
 *
 * Per Phase 5.1:
 *   - In dev (no ARTA_USERNAME): `sendOtp()` is simulated (console.log),
 *     and the OTP code is returned in `devCode` for convenience.
 *   - In prod (ARTA_USERNAME set): `sendOtp()` calls the Arta Payamak
 *     pattern API with `ARTA_OTP_PATTERN_CODE`, and `devCode` is null.
 *
 * Rate-limit: max 3 requests per phone per 5 minutes (per Section 3).
 *
 * NOTE: The SMS send is fire-and-forget — we don't await it before
 * responding. The OTP is already stored in the cache; if the SMS
 * fails, the user can request a new one. This keeps the API fast
 * (SMS gateways can take 1-3s to respond).
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

    if (code) {
      // Fire the SMS via the active provider. We DON'T await this —
      // the OTP is already in the cache, and the user can retry if
      // the SMS doesn't arrive. This keeps the response fast.
      //
      // In dev (simulated), this completes in ~300ms.
      // In prod (Arta Payamak), it makes a real API call but we
      // don't block the response on it.
      void getSmsProvider()
        .sendOtp(body.phone, code)
        .catch((err) => {
          console.error("[otp] SMS send failed:", err);
        });

      return NextResponse.json({
        ok: true,
        expiresInMs,
        // Dev convenience: surface the OTP so the user can paste it
        // from the toast. In prod, `code` is null (the OTP is only
        // sent via real SMS — never returned to the client).
        devCode: process.env.NODE_ENV === "development" ? code : null,
        message:
          process.env.NODE_ENV === "development"
            ? `کد یک‌بار مصرف (محیط توسعه): ${code}`
            : "کد یک‌بار مصرف ارسال شد. لطفاً صبر کنید.",
      });
    }

    // `code` is null in prod (OTP issued but not surfaced to the API)
    return NextResponse.json({
      ok: true,
      expiresInMs,
      devCode: null,
      message: "کد یک‌بار مصرف ارسال شد. لطفاً صبر کنید.",
    });
  } catch (e) {
    if (e instanceof OtpRateLimitError) {
      return NextResponse.json(
        { ok: false, error: e.message, retryAfterMs: e.retryAfterMs },
        { status: 429 }
      );
    }
    console.error("[OTP_GENERATE_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "خطا در ارسال کد یک‌بار مصرف. لطفاً لحظاتی بعد تلاش کنید." },
      { status: 500 }
    );
  }
}
