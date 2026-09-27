import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { LandingPage } from "@/components/marketing/landing-page";

/**
 * Root route — public marketing landing page (Phase 2.5).
 *
 * Behavior:
 *   - No cookie / invalid token  → render LandingPage (public marketing)
 *   - Root token                  → redirect to /select-profile
 *   - Contextual token            → redirect to /<role-slug> dashboard
 *
 * Authenticated users skip the landing page — they want their dashboard.
 * The Navbar on the landing page shows "داشبورد من" when authenticated
 * (this branch only fires for users with invalid/expired tokens).
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  let isAuthenticated = false;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      isAuthenticated = true;
      // Authenticated — skip landing, go straight to the right dashboard
      if (payload.kind === "root") {
        redirect("/select-profile");
      }
      const slug = payload.role.toLowerCase().replace("_", "-");
      redirect(`/${slug}`);
    }
  }

  // Not authenticated — show the public landing page
  return <LandingPage isAuthenticated={isAuthenticated} />;
}
