import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  OtpExpiredError,
  OtpInvalidError,
  OtpMaxAttemptsError,
  OtpNotFoundError,
  verifyOtp,
} from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { findUserByPhone, buildUserProfiles } from "@/lib/auth/session";
import { signRootToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { runWithTenant } from "@/lib/prisma/tenant-context";

const Body = z.object({
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است."),
  code: z.string().regex(/^\d{6}$/, "کد باید ۶ رقم باشد."),
});

/**
 * POST /api/v1/auth/verify
 *
 * Verify OTP and mint a Root Token. Per Section 3 of the architecture doc:
 *   - If phone is unknown, auto-create a User record (passwordless — phone is
 *     the only identity key). This is the "no duplicate accounts" rule.
 *   - Return a Root Token (cookie) that contains the user's full `roles` map.
 *   - Return the list of profiles for the Profile Switcher.
 *
 * If the user has zero profiles (no staff employments, no enrollments), we
 * still mint a Root Token but the UI shows an "access denied" page — they
 * must be onboarded by a Principal first.
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

  // Verify OTP
  try {
    verifyOtp(body.phone, body.code);
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

  // Get or create user (Section 3 — phone is the unique business key)
  let user = await runWithTenant({ bypassTenantFilter: true }, () =>
    findUserByPhone(body.phone)
  );
  if (!user) {
    // First-time login: create a minimal record. The user has no profiles yet.
    user = await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.create({
        data: {
          phoneNumber: body.phone,
          nationalCode: `PENDING-${body.phone}`, // resolved at onboarding
          firstName: "کاربر",
          lastName: "جدید",
        },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
        },
      })
    );
  }

  const profiles = await buildUserProfiles(user.id);
  const rolesMap: Record<string, string[]> = {};
  for (const p of profiles) {
    if (!rolesMap[p.schoolId]) rolesMap[p.schoolId] = [];
    if (!rolesMap[p.schoolId].includes(p.role)) {
      rolesMap[p.schoolId].push(p.role);
    }
  }

  const token = await signRootToken({
    userId: user.id,
    phone: user.phoneNumber,
    roles: rolesMap,
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
    maxAge: 60 * 60, // 1 hour
  });
  return res;
}
