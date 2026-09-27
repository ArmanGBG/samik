"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SamikLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  /** Server-passed initial auth state (avoids flash of "Login" button). */
  initialIsAuthenticated: boolean;
}

const NAV_LINKS = [
  { href: "#features", label: "امکانات" },
  { href: "#roles", label: "نقش‌ها" },
  { href: "#contact", label: "تماس" },
];

export function Navbar({ initialIsAuthenticated }: NavbarProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(initialIsAuthenticated);

  // Hydrate auth state on client (in case cookie changed since SSR)
  useEffect(() => {
    fetch("/api/v1/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAuthed(!!(d && d.ok)))
      .catch(() => setIsAuthed(false));
  }, []);

  // Sticky shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handlePrimaryCta() {
    if (isAuthed) {
      router.push("/select-profile");
    } else {
      router.push("/login");
    }
  }

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/85 backdrop-blur-md shadow-sm border-b border-border/60"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <SamikLogo size={36} className="transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-navy leading-none">سامیک</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5 hidden sm:block">
                سامانه مدیریت یکپارچه کلاس
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/70 hover:text-navy transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-foreground/70 hover:text-navy"
            >
              <a href="#contact">درخواست دمو</a>
            </Button>
            <Button
              size="sm"
              onClick={handlePrimaryCta}
              className={cn(
                "gap-2",
                isAuthed
                  ? "bg-emerald hover:bg-emerald-dark"
                  : "bg-navy hover:bg-navy-dark"
              )}
            >
              {isAuthed ? (
                <>
                  <LayoutDashboard className="h-4 w-4" />
                  داشبورد من
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  ورود به سیستم
                </>
              )}
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 -mr-2 text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="منو"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white/95 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-navy hover:bg-muted/50 transition"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full">
                <a href="#contact" onClick={() => setMobileOpen(false)}>
                  درخواست دمو
                </a>
              </Button>
              <Button
                onClick={() => {
                  setMobileOpen(false);
                  handlePrimaryCta();
                }}
                className={cn(
                  "w-full gap-2",
                  isAuthed
                    ? "bg-emerald hover:bg-emerald-dark"
                    : "bg-navy hover:bg-navy-dark"
                )}
              >
                {isAuthed ? (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    داشبورد من
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    ورود به سیستم
                  </>
                )}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
