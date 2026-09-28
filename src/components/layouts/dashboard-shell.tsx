"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/stores/auth-store";
import { SamikLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  School,
  Users,
  CalendarClock,
  ClipboardCheck,
  BookOpen,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  ShieldCheck,
  LayoutDashboard,
  GraduationCap,
  DoorClosed,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RealtimeProvider, useRealtimeStatus } from "@/lib/realtime/realtime-context";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  /** If true, this item is only shown for the matching role. */
  roles?: string[];
  /** Explicit route prefix for this nav item (overrides the user's role route).
   *  Used when a Principal accesses Deputy routes (e.g. timetable → /deputy/timetable). */
  routePrefix?: string;
}

const NAV: NavItem[] = [
  { href: "overview", label: "داشبورد", icon: LayoutDashboard },
  // SuperAdmin
  { href: "schools", label: "مدارس", icon: School, roles: ["SUPER_ADMIN"] },
  // Principal
  // Principal structure (also accessible by Deputy for classroom/subject/bell management)
  { href: "structure/classrooms", label: "کلاس‌ها", icon: DoorClosed, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/principal" },
  { href: "structure/subjects", label: "دروس", icon: BookOpen, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/principal" },
  { href: "structure/bell-schedules", label: "زنگ‌ها", icon: Clock, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/principal" },
  { href: "structure/term", label: "سال تحصیلی", icon: CalendarClock, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/principal" },
  { href: "staff", label: "پرسنل", icon: Users, roles: ["PRINCIPAL"] },
  { href: "students", label: "دانش‌آموزان", icon: GraduationCap, roles: ["PRINCIPAL"] },
  // Deputy (also accessible by Principal — Principal inherits Deputy access)
  { href: "timetable", label: "برنامه هفتگی", icon: CalendarClock, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/deputy" },
  { href: "live-attendance", label: "حضور و غیاب زنده", icon: ClipboardCheck, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/deputy" },
  { href: "notifications", label: "کارتابل پیامک", icon: Bell, roles: ["PRINCIPAL", "DEPUTY"], routePrefix: "/deputy" },
  // Teacher
  { href: "attendance", label: "حضور و غیاب کلاس", icon: ClipboardCheck, roles: ["TEACHER"] },
  { href: "gradebook", label: "دفتر نمره", icon: BookOpen, roles: ["TEACHER"] },
  // Student
  { href: "", label: "داشبورد", icon: LayoutDashboard, roles: ["STUDENT"] },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "مدیر سامانه",
  PRINCIPAL: "مدیر مدرسه",
  DEPUTY: "ناظم / معاون",
  TEACHER: "معلم",
  STUDENT: "دانش‌آموز / ولی",
};

const ROLE_ROUTE: Record<string, string> = {
  SUPER_ADMIN: "/super-admin",
  PRINCIPAL: "/principal",
  DEPUTY: "/deputy",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

const APP_VERSION = "۰.۱.۰";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    auth.fetch();
  }, []);

  // Bootstrap: if loading or unauthenticated, defer (middleware will redirect)
  if (auth.state.status === "loading" || auth.state.status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite">
        <div className="animate-pulse text-muted-foreground">در حال بارگذاری سامیک...</div>
      </div>
    );
  }

  // If root token, force profile selection (should have been handled by middleware)
  if (auth.state.status === "root") {
    if (typeof window !== "undefined") {
      // Use location.replace via a microtask to avoid mutating window during render
      queueMicrotask(() => {
        window.location.replace("/select-profile");
      });
    }
    return null;
  }

  // Contextual — render the dashboard shell
  const { role, schoolName, firstName, lastName } = auth.state;
  const route = ROLE_ROUTE[role]!;
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim() || "؟";

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <RealtimeProvider>
      <div className="min-h-screen flex flex-col bg-offwhite">
        {/* Top bar — 56px height (h-14), compact px-4 */}
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-white/95 backdrop-blur flex items-center px-4 gap-3">
          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden cursor-pointer"
                aria-label="باز کردن منوی دسترسی سریع"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-70 p-0 bg-sidebar" style={{ width: 280 }}>
              <SidebarHeader schoolName={schoolName} />
              <div className="py-3">
                <NavLinks
                  items={visibleNav}
                  route={route}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <SidebarFooter />
            </SheetContent>
          </Sheet>

          {/* School name + role label — compact */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {ROLE_LABEL[role]}
            </p>
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {schoolName}
            </p>
          </div>

          {/* Realtime Live Indicator */}
          <RealtimeIndicator />

          {/* Profile switcher — compact avatar (h-8 w-8), name hidden on mobile */}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 pr-2 pl-2 h-9 cursor-pointer"
              aria-label="منوی حساب کاربری و انتخاب پروفایل"
            >
              <Avatar className="h-8 w-8 bg-navy text-white">
                <AvatarFallback className="bg-navy text-white text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">
                {firstName} {lastName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">
                  {firstName} {lastName}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {ROLE_LABEL[role]} — {schoolName}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/select-profile")} className="cursor-pointer gap-2">
              <ShieldCheck className="h-4 w-4" />
              تغییر نقش یا مدرسه (پروفایل)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => auth.logout()} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              خروج از حساب کاربری
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 flex">
        {/* Desktop sidebar — 240px width (w-60), 56px header (h-14) */}
        <aside className="hidden lg:flex w-60 flex-col bg-sidebar border-l border-sidebar-border">
          <SidebarHeader schoolName={schoolName} />
          <div className="flex-1 overflow-y-auto py-3">
            <NavLinks items={visibleNav} route={route} pathname={pathname} />
          </div>
          <SidebarFooter />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 p-4 lg:p-6">{children}</div>
          {/* Footer — compact py-2, sticky to bottom */}
          <footer className="mt-auto border-t border-border bg-white px-4 py-2 text-center text-xs text-muted-foreground">
            سامیک © ۱۴۰۴ — سامانه مدیریت یکپارچه کلاس
          </footer>
        </main>
      </div>
    </div>
    </RealtimeProvider>
  );
}

function RealtimeIndicator() {
  const { isConnected } = useRealtimeStatus();
  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors select-none",
        isConnected
          ? "bg-emerald/10 text-emerald border border-emerald/30"
          : "bg-muted text-muted-foreground border border-border"
      )}
      title={isConnected ? "ارتباط زنده Real-time برقرار است" : "در حال تلاش برای برقراری ارتباط..."}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isConnected ? "bg-emerald animate-pulse" : "bg-muted-foreground"
        )}
      />
      {isConnected ? "برخط (زنده)" : "در حال اتصال"}
    </div>
  );
}

/**
 * Sidebar header — 56px height (h-14), compact logo + school name.
 */
function SidebarHeader({ schoolName }: { schoolName: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 h-14 border-b border-sidebar-border">
      <SamikLogo size={28} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-sidebar-foreground leading-tight">سامیک</p>
        <p className="text-[11px] text-sidebar-foreground/60 truncate leading-tight">
          {schoolName}
        </p>
      </div>
    </div>
  );
}

/**
 * Sidebar footer — compact version badge.
 */
function SidebarFooter() {
  return (
    <div className="border-t border-sidebar-border px-3 py-2">
      <div className="flex items-center justify-between rounded-md bg-sidebar-accent/30 px-2.5 py-1.5">
        <span className="text-[11px] text-sidebar-foreground/70 tabular-nums">
          نسخه {APP_VERSION}
        </span>
        <span className="text-[10px] text-sidebar-foreground/50">فاز اول</span>
      </div>
    </div>
  );
}

interface NavLinksProps {
  items: NavItem[];
  route: string;
  pathname: string;
  onNavigate?: () => void;
}

function NavLinks({ items, route, pathname, onNavigate }: NavLinksProps) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item, i) => {
        // Use the item's routePrefix if specified (e.g. Deputy routes for
        // Principal users), otherwise fall back to the user's role route.
        const effectiveRoute = item.routePrefix ?? route;
        const href =
          item.href === "overview"
            ? effectiveRoute
            : `${effectiveRoute}/${item.href}`;
        const isActive =
          pathname === href ||
          (item.href === "overview" && pathname === effectiveRoute);
        const Icon = item.icon;
        return (
          <Link
            key={item.href + i}
            href={href}
            onClick={onNavigate}
            style={{ animationDelay: `${i * 30}ms` }}
            className={cn(
              "stagger-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium",
              "border-l-2 transition-colors duration-200 cursor-pointer",
              isActive
                ? "bg-emerald text-white shadow-sm border-l-emerald"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-transparent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
