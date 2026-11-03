import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildUserProfiles } from "@/lib/auth/session";
import { signRootToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { runWithTenant } from "@/lib/prisma/tenant-context";
import { hashPassword, verifyPassword, DEFAULT_INITIAL_PASSWORD } from "@/lib/auth/password";
import { toAsciiDigitsOnly, toEnglishDigits } from "@/lib/persian-digits";

const LoginSchema = z.object({
  identifier: z.string().min(1, "نام کاربری (کد ملی یا شماره موبایل) الزامی است."),
  password: z.string().min(1, "رمز عبور الزامی است."),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * POST /api/v1/auth/login-password
 *
 * Fast, frictionless password login for students, teachers, and staff.
 * - Accepts nationalCode OR phoneNumber as the identifier.
 * - Performs Lazy Migration: If an existing user has no passwordHash,
 *   matches against DEFAULT_INITIAL_PASSWORD ("123456"), hashes it,
 *   and saves it on first successful login.
 * - Supports persistent sessions (up to 30 days) via `rememberMe`.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof LoginSchema>;
  try {
    body = LoginSchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
      { status: 400 }
    );
  }

  const cleanIdentifier = toAsciiDigitsOnly(body.identifier.trim());
  const cleanPassword = toEnglishDigits(body.password.trim());

  if (!cleanIdentifier || !cleanPassword) {
    return NextResponse.json(
      { ok: false, error: "نام کاربری و رمز عبور الزامی هستند." },
      { status: 400 }
    );
  }

  try {
    // Look up user by nationalCode OR phoneNumber across all schools
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
          nationalCode: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          passwordHash: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "کاربری با این کد ملی یا شماره موبایل یافت نشد." },
        { status: 401 }
      );
    }

    // Verify password
    let passwordMatches = false;

    if (user.passwordHash) {
      passwordMatches = verifyPassword(cleanPassword, user.passwordHash);
    } else {
      // Lazy migration: First login with default password (123456)
      if (cleanPassword === DEFAULT_INITIAL_PASSWORD) {
        passwordMatches = true;
        const newHash = hashPassword(DEFAULT_INITIAL_PASSWORD);
        await runWithTenant({ bypassTenantFilter: true }, () =>
          db.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          })
        );
      }
    }

    if (!passwordMatches) {
      return NextResponse.json(
        {
          ok: false,
          error: user.passwordHash
            ? "رمز عبور وارد شده اشتباه است."
            : "رمز عبور اشتباه است. (رمز اولیه پیش‌فرض ۱۲۳۴۵۶ است)",
        },
        { status: 401 }
      );
    }

    // Build profiles across all schools
    const profiles = await buildUserProfiles(user.id);
    const rolesMap: Record<string, string[]> = {};
    for (const p of profiles) {
      if (!rolesMap[p.schoolId]) rolesMap[p.schoolId] = [];
      if (!rolesMap[p.schoolId].includes(p.role)) {
        rolesMap[p.schoolId].push(p.role);
      }
    }

    // Session TTL: 30 days if rememberMe, otherwise 24 hours
    const ttlSeconds = body.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    const token = await signRootToken({
      userId: user.id,
      phone: user.phoneNumber,
      roles: rolesMap,
      expiresInSeconds: ttlSeconds,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
      profiles,
      hasMultipleProfiles: profiles.length > 1,
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ttlSeconds,
    });

    return res;
  } catch (err: any) {
    console.error("[LOGIN_PASSWORD_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطا در برقراری ارتباط با سرور." },
      { status: 500 }
    );
  }
}
