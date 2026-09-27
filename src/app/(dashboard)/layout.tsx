import { DashboardShell } from "@/components/layouts/dashboard-shell";

/**
 * Layout for all dashboard routes — wraps the page content in the
 * sidebar + topbar shell. Auth/Tenant/Role guards are enforced by
 * `src/middleware.ts` BEFORE this layout renders.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
