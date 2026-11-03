import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import { hashPassword, verifyPassword, DEFAULT_INITIAL_PASSWORD } from "@/lib/auth/password";
import { toEnglishDigits } from "@/lib/persian-digits";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز عبور فعلی الزامی است."),
  newPassword: z.string().min(4, "رمز عبور جدید باید حداقل ۴ کاراکتر باشد."),
});

/**
 * POST /api/v1/auth/password/change
 *
 * Allows any logged-in user (student, teacher, deputy, etc.)
 * to change their own password.
 */
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-samik-user-id");
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "نشست شما منقضی شده است. لطفاً مجدداً وارد شوید." },
      { status: 401 }
    );
  }

  let body: z.infer<typeof ChangePasswordSchema>;
  try {
    body = ChangePasswordSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
      { status: 400 }
    );
  }

  const currentPass = toEnglishDigits(body.currentPassword.trim());
  const newPass = toEnglishDigits(body.newPassword.trim());

  try {
    const user = await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, passwordHash: true },
      })
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "کاربر یافت نشد." },
        { status: 404 }
      );
    }

    // Verify current password
    let isValid = false;
    if (user.passwordHash) {
      isValid = verifyPassword(currentPass, user.passwordHash);
    } else {
      isValid = currentPass === DEFAULT_INITIAL_PASSWORD;
    }

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "رمز عبور فعلی نادرست است." },
        { status: 400 }
      );
    }

    // Save new hashed password
    const newHash = hashPassword(newPass);
    await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      })
    );

    return NextResponse.json({
      ok: true,
      message: "رمز عبور شما با موفقیت به‌روزرسانی شد.",
    });
  } catch (err: any) {
    console.error("[CHANGE_PASSWORD_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطا در تغییر رمز عبور." },
      { status: 500 }
    );
  }
}
