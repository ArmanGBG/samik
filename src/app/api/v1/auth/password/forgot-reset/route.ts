import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import {
  verifyOtp,
  OtpExpiredError,
  OtpInvalidError,
  OtpMaxAttemptsError,
  OtpNotFoundError,
} from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/password";
import { toAsciiDigitsOnly, toEnglishDigits } from "@/lib/persian-digits";

const ResetSchema = z.object({
  identifier: z.string().min(1, "کد ملی یا شماره موبایل الزامی است."),
  code: z.string().regex(/^\d{6}$/, "کد تایید باید ۶ رقم باشد."),
  newPassword: z.string().min(4, "رمز عبور جدید باید حداقل ۴ کاراکتر باشد."),
});

/**
 * POST /api/v1/auth/password/forgot-reset
 *
 * Verifies the OTP and updates the user's password.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof ResetSchema>;
  try {
    body = ResetSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
      { status: 400 }
    );
  }

  const cleanIdentifier = toAsciiDigitsOnly(body.identifier.trim());
  const cleanCode = toAsciiDigitsOnly(body.code.trim());
  const cleanNewPass = toEnglishDigits(body.newPassword.trim());

  try {
    const user = await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.findFirst({
        where: {
          OR: [
            { nationalCode: cleanIdentifier },
            { phoneNumber: cleanIdentifier },
          ],
        },
        select: { id: true, phoneNumber: true },
      })
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "کاربری با این مشخصات یافت نشد." },
        { status: 404 }
      );
    }

    // Verify OTP
    try {
      verifyOtp(user.phoneNumber, cleanCode);
    } catch (e) {
      if (
        e instanceof OtpExpiredError ||
        e instanceof OtpInvalidError ||
        e instanceof OtpMaxAttemptsError ||
        e instanceof OtpNotFoundError
      ) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 401 });
      }
      throw e;
    }

    // Hash and save new password
    const newHash = hashPassword(cleanNewPass);
    await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      })
    );

    return NextResponse.json({
      ok: true,
      message: "رمز عبور جدید با موفقیت ثبت شد. اکنون می‌توانید وارد شوید.",
    });
  } catch (err: any) {
    console.error("[FORGOT_PASSWORD_RESET_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطا در تنظیم رمز عبور جدید." },
      { status: 500 }
    );
  }
}
