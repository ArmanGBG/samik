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
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Settings,
  GraduationCap,
  DoorClosed,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  /** If true, this item is only shown for the matching role. */
  roles?: string[];
}

const NAV: NavItem[] = [
  { href: "overview", label: "داشبورد", icon: LayoutDashboard },
  // SuperAdmin
  { href: "schools", label: "مدارس", icon: School, roles: ["SUPER_ADMIN"] },
  // Principal
  { href: "structure/classrooms", label: "کلاس‌ها", icon: DoorClosed, roles: ["PRINCIPAL"] },
  { href: "structure/subjects", label: "دروس", icon: BookOpen, roles: ["PRINCIPAL"] },
  { href: "structure/bell-schedules", label: "زنگ‌ها", icon: Clock, roles: ["PRINCIPAL"] },
  { href: "structure/term", label: "سال تحصیلی", icon: CalendarClock, roles: ["PRINCIPAL"] },
  { href: "staff", label: "پرسنل", icon: Users, roles: ["PRINCIPAL"] },
  { href: "students", label: "دانش‌آموزان", icon: GraduationCap, roles: ["PRINCIPAL"] },
  // Deputy
  { href: "timetable", label: "برنامه هفتگی", icon: CalendarClock, roles: ["DEPUTY"] },
  { href: "live-attendance", label: "حضور و غیاب زنده", icon: ClipboardCheck, roles: ["DEPUTY"] },
  { href: "notifications", label: "کارتابل پیامک", icon: Bell, roles: ["DEPUTY"] },
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
    <div className="min-h-screen flex flex-col bg-offwhite">
      {/* Top bar */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-white/95 backdrop-blur flex items-center px-4 gap-3">
        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 bg-sidebar">
            <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
              <SamikLogo size={32} />
              <div>
                <p className="text-sm font-bold text-sidebar-foreground">سامیک</p>
                <p className="text-xs text-sidebar-foreground/60">{schoolName}</p>
              </div>
            </div>
            <div className="py-4">
              <NavLinks
                items={visibleNav}
                route={route}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Breadcrumb / school name */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {schoolName}
          </p>
        </div>

        {/* Profile switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pr-2 pl-3">
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
            <DropdownMenuItem onClick={() => router.push("/select-profile")}>
              <ShieldCheck className="h-4 w-4 ml-2" />
              تغییر پروفایل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => auth.logout()}>
              <LogOut className="h-4 w-4 ml-2" />
              خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-l border-sidebar-border">
          <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
            <SamikLogo size={32} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground">سامیک</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {schoolName}
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <NavLinks items={visibleNav} route={route} pathname={pathname} />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <div className="rounded-lg bg-sidebar-accent/30 px-3 py-2">
              <p className="text-xs text-sidebar-foreground/70">
                نسخه ۰.۱.۰ — فاز اول
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 p-4 lg:p-6">{children}</div>
          <footer className="mt-auto border-t border-border bg-white px-4 py-3 text-center text-xs text-muted-foreground">
            سامیک © ۱۴۰۴ — سامانه مدیریت یکپارچه کلاس
          </footer>
        </main>
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
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const href = `${route}/${item.href === "overview" ? "" : item.href}`;
        const isActive =
          pathname === href ||
          (item.href === "overview" && pathname === route);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-emerald text-white shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
