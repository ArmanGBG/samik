import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

/**
 * Root route — server-side smart redirect.
 *
 *   - No cookie              → /login
 *   - Root token             → /select-profile
 *   - Contextual token       → /<role-slug> (e.g. /teacher, /super-admin)
 *   - Invalid / expired      → /login
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    redirect("/login");
  }

  if (payload.kind === "root") {
    redirect("/select-profile");
  }

  const slug = payload.role.toLowerCase().replace("_", "-");
  redirect(`/${slug}`);
}
