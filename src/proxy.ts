import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME, SamikPayload } from "@/lib/auth/jwt";

/**
 * 3-Layer Edge Middleware (Section 10 of architecture doc):
 *
 *   Layer 1 — Auth Guard   : verifies JWT cookie. If absent/invalid/expired,
 *                            redirects unauthenticated users to /login and
 *                            returns 401 for API calls.
 *   Layer 2 — Tenant Guard : for contextual tokens, validates that the
 *                            schoolId in the token is still ACTIVE.
 *                            (For Root tokens, only /select-profile, /login,
 *                            /logout, /api/v1/auth/*, /api/v1/me are allowed.)
 *   Layer 3 — Role Guard   : route-prefix-based RBAC. Each dashboard subtree
 *                            (super-admin/principal/deputy/teacher/student) is
 *                            mapped to a required role.
 *
 * NOTE — Edge runtime constraint: this file CANNOT use `db` (Prisma) or
 * Node-only modules. Token verification uses `jose` (WebCrypto). The actual
 * "is school still active?" DB check happens inside the route handler / a
 * server component via `verifyTenantMembership()`. The middleware only does
 * cheap cryptographic checks.
 */

const PUBLIC_PATHS = new Set([
  "/login",
  "/verify",
  "/api/v1/auth/otp",
  "/api/v1/auth/verify",
]);

const ROOT_ONLY_PATHS = new Set(["/select-profile"]);

const ROLE_PATH_MAP: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/super-admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/principal", roles: ["PRINCIPAL"] },
  { prefix: "/deputy", roles: ["DEPUTY"] },
  { prefix: "/teacher", roles: ["TEACHER"] },
  { prefix: "/student", roles: ["STUDENT"] },
  { prefix: "/api/v1/super-admin", roles: ["SUPER_ADMIN"] },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths (login, OTP issue/verify)
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // Static assets / Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/logo.svg" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // === Layer 1: Auth Guard ===
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(req);
  }
  const payload = await verifyToken(token);
  if (!payload) {
    // Token expired or tampered — clear cookie and bounce to /login
    const res = redirectToLogin(req);
    res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Root token: only allow /select-profile, /logout, /me, /api/v1/auth/select-profile,
  // /api/v1/auth/logout, /api/v1/me. Block direct access to dashboards until a
  // contextual profile is chosen.
  if (payload.kind === "root") {
    const allowed = new Set([
      "/select-profile",
      "/api/v1/me",
      "/api/v1/auth/select-profile",
      "/api/v1/auth/logout",
    ]);
    if (allowed.has(pathname)) return NextResponse.next();
    // Root token + has multiple profiles → force to /select-profile
    // Root token + has zero/one profile → also go to /select-profile (it self-routes)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "لطفاً ابتدا پروفایل خود را انتخاب کنید." },
        { status: 403 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/select-profile";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // === Contextual token ===
  // Layer 2: Tenant Guard — at the edge, we only validate that the token HAS
  // a schoolId (deeper DB check is done in route handlers via
  // `verifyTenantMembership`). This split is required because middleware
  // cannot access Prisma.
  if (!payload.schoolId || !payload.role) {
    return redirectToLogin(req);
  }

  // Layer 3: Role Guard — route-prefix RBAC
  for (const { prefix, roles } of ROLE_PATH_MAP) {
    if (pathname.startsWith(prefix)) {
      if (!roles.includes(payload.role)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { ok: false, error: "دسترسی غیرمجاز — نقش شما کافی نیست." },
            { status: 403 }
          );
        }
        // Bounce to the user's own dashboard
        const url = req.nextUrl.clone();
        url.pathname = `/${payload.role.toLowerCase().replace("_", "-")}`;
        url.search = "";
        return NextResponse.redirect(url);
      }
      break; // matched, no further role checks
    }
  }

  // Inject the tenant context into request headers so server components
  // and route handlers can read it via `req.headers.get("x-school-id")`.
  // (They will then call `runWithTenant({ schoolId, role, userId })` to
  // activate the Prisma tenant filter for that request.)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-samik-user-id", payload.userId);
  requestHeaders.set("x-samik-school-id", payload.schoolId);
  requestHeaders.set("x-samik-role", payload.role);
  if (payload.studentEnrollmentId) {
    requestHeaders.set("x-samik-enrollment-id", payload.studentEnrollmentId);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function redirectToLogin(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "نشست فعال نیست. لطفاً وارد شوید." },
      { status: 401 }
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except static asset prefixes
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Re-exported for type inference in route handlers
export type { SamikPayload };
