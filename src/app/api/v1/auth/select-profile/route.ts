import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken, signContextualToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { buildUserProfiles } from "@/lib/auth/session";

const Body = z.object({
  schoolId: z.string().min(1), // UUID for normal roles, "__global__" for SUPER_ADMIN
  role: z.enum(["SUPER_ADMIN", "PRINCIPAL", "DEPUTY", "TEACHER", "STUDENT"]),
  studentEnrollmentId: z.string().uuid().optional(),
});

/**
 * POST /api/v1/auth/select-profile
 *
 * Mint a Contextual Token (Section 3 — "Contextual Token") for the chosen
 * profile (school + role). The Root Token is replaced by this Contextual
 * Token in the cookie. Subsequent API calls carry only the contextual
 * scope, preventing accidental cross-tenant data access.
 *
 * For SUPER_ADMIN, schoolId is the sentinel "__global__" — no actual
 * School record is associated. The Tenant Guard in `tenant-guard.ts`
 * uses `withSuperAdmin()` for SUPER_ADMIN routes (no schoolId in token).
 */
export async function POST(req: NextRequest) {
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return NextResponse.json({ ok: false, error: "نشست فعال نیست." }, { status: 401 });
  }
  const rootPayload = await verifyToken(cookieToken);
  if (!rootPayload || rootPayload.kind !== "root") {
    return NextResponse.json(
      { ok: false, error: "توکن ریشه معتبر نیست. لطفاً مجدداً وارد شوید." },
      { status: 401 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    );
  }

  // Re-verify from DB (token claims alone are not trusted for authorization)
  const profiles = await buildUserProfiles(rootPayload.userId);
  const match = profiles.find(
    (p) =>
      p.schoolId === body.schoolId &&
      p.role === body.role &&
      (body.role === "STUDENT" ? p.studentEnrollmentId === body.studentEnrollmentId : true)
  );
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "شما در این مدرسه این نقش را ندارید." },
      { status: 403 }
    );
  }

  // For SUPER_ADMIN, the contextual token has no schoolId (global scope).
  // The `withSuperAdmin()` helper in tenant-guard.ts handles SUPER_ADMIN
  // routes by running with bypassTenantFilter=true.
  const token = await signContextualToken({
    userId: rootPayload.userId,
    schoolId: body.role === "SUPER_ADMIN" ? "__global__" : body.schoolId,
    role: body.role,
    studentEnrollmentId: body.studentEnrollmentId,
  });

  const res = NextResponse.json({
    ok: true,
    profile: {
      schoolId: match.schoolId,
      schoolName: match.schoolName,
      role: match.role,
      label: match.label,
    },
  });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return res;
}
