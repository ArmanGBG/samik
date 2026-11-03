import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import { issueOtp, OtpRateLimitError } from "@/lib/auth/otp";
import { getSmsProvider } from "@/lib/sms/provider";
import { toAsciiDigitsOnly } from "@/lib/persian-digits";

const RequestSchema = z.object({
  identifier: z.string().min(1, "کد ملی یا شماره موبایل الزامی است."),
});

/**
 * POST /api/v1/auth/password/forgot-request
 *
 * Initiates self-service password reset by sending an OTP SMS.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
      { status: 400 }
    );
  }

  const cleanIdentifier = toAsciiDigitsOnly(body.identifier.trim());

  try {
    const user = await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.findFirst({
        where: {
          OR: [
            { nationalCode: cleanIdentifier },
            { phoneNumber: cleanIdentifier },
          ],
        },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "کاربری با این مشخصات در سامانه یافت نشد." },
        { status: 404 }
      );
    }

    // Generate OTP
    const { code, expiresInMs } = issueOtp(user.phoneNumber);

    // Send SMS via approved OTP pattern
    if (code) {
      void getSmsProvider()
        .sendOtp(user.phoneNumber, code)
        .catch((err) => {
          console.error("[FORGOT_PASSWORD_SMS_ERROR]", err);
        });
    }

    // Mask phone number for display (e.g. 0939***2416)
    const phone = user.phoneNumber;
    const maskedPhone =
      phone.length === 11
        ? `${phone.slice(0, 4)}***${phone.slice(7)}`
        : phone;

    return NextResponse.json({
      ok: true,
      maskedPhone,
      expiresInMs,
      message: `کد تایید به شماره ${maskedPhone} پیامک شد.`,
    });
  } catch (e) {
    if (e instanceof OtpRateLimitError) {
      return NextResponse.json(
        { ok: false, error: e.message, retryAfterMs: e.retryAfterMs },
        { status: 429 }
      );
    }
    console.error("[FORGOT_PASSWORD_REQUEST_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "خطا در ارسال کد تایید. لطفاً بعداً تلاش کنید." },
      { status: 500 }
    );
  }
}
