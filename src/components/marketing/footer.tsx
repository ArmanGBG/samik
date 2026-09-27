import Link from "next/link";
import { SamikLogo } from "@/components/brand-logo";

const FOOTER_LINKS = [
  {
    title: "محصول",
    links: [
      { label: "امکانات", href: "#features" },
      { label: "نقش‌ها", href: "#roles" },
      { label: "ورود به سیستم", href: "/login" },
    ],
  },
  {
    title: "منابع",
    links: [
      { label: "مستندات", href: "#" },
      { label: "راهنمای استفاده", href: "#" },
      { label: "سؤالات متداول", href: "#" },
    ],
  },
  {
    title: "شرکت",
    links: [
      { label: "درباره ما", href: "#" },
      { label: "تماس", href: "#contact" },
      { label: "حریم خصوصی", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <SamikLogo size={36} />
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none">سامیک</span>
                <span className="text-[10px] text-white/60 leading-none mt-0.5">
                  سامانه مدیریت یکپارچه کلاس
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
              سامانه یکپارچه، هوشمند و آفلاین-فرست مدیریت کلاس و مدرسه. طراحی
              شده برای آرامش مدیران، سرعت معلمان و اطمینان اولیا.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 hover:text-emerald-light transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/50">
            © ۱۴۰۴ سامیک — تمام حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
            ساخته‌شده در ایران با ❤
          </div>
        </div>
      </div>
    </footer>
  );
}
