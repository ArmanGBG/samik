import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { buildUserProfiles } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";

/**
 * GET /api/v1/me
 *
 * Returns the current session info:
 *   - If Root Token: returns the list of profiles for the switcher.
 *   - If Contextual Token: returns the active school + role.
 *   - If no token: 401.
 *
 * Used by client-side route guards and the Profile Switcher dropdown.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "نشست فعال نیست." }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "توکن نامعتبر است." }, { status: 401 });
  }

  if (payload.kind === "root") {
    const profiles = await buildUserProfiles(payload.userId);
    const user = await runWithTenant({ bypassTenantFilter: true }, () =>
      db.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, firstName: true, lastName: true, phoneNumber: true },
      })
    );
    return NextResponse.json({
      ok: true,
      kind: "root",
      user,
      profiles,
      requiresProfileSelection: profiles.length > 1,
    });
  }

  // Contextual token — return active profile
  const user = await runWithTenant({ bypassTenantFilter: true }, () =>
    db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true },
    })
  );

  // For SUPER_ADMIN, there is no school record — return null school.
  // The auth-store handles this case.
  let school = null;
  if (payload.schoolId !== "__global__") {
    school = await runWithTenant({ bypassTenantFilter: true }, () =>
      db.school.findUnique({
        where: { id: payload.schoolId },
        select: { id: true, name: true, subdomain: true },
      })
    );
  } else {
    school = { id: "__global__", name: "پلتفرم سامیک", subdomain: "platform" };
  }

  return NextResponse.json({
    ok: true,
    kind: "contextual",
    user,
    school,
    role: payload.role,
    studentEnrollmentId: payload.studentEnrollmentId,
  });
}
