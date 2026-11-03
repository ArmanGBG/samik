import Link from "next/link";
import { SamikLogo } from "@/components/brand-logo";
import { Mail, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy text-white border-t border-navy-light/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <SamikLogo size={36} />
              <div className="flex flex-col">
                <span className="text-xl font-bold leading-none">سامیک</span>
                <span className="text-[11px] text-white/60 leading-none mt-1">
                  سامانه هوشمند مدیریت یکپارچه کلاس و مدرسه
                </span>
              </div>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed max-w-md">
              طراحی‌شده برای آرامش مدیران، سرعت معلمان، دقت ناظمان و اطمینان خاطر اولیا در مدارس سراسر ایران. پایان بخشیدن به کاغذبازی با ابزارهای کارآمد و مدرن.
            </p>
          </div>

          {/* Column 2: Quick Access */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">دسترسی سریع</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="text-white/70 hover:text-emerald-light transition-colors">
                  امکانات سامانه
                </a>
              </li>
              <li>
                <a href="#comparison" className="text-white/70 hover:text-emerald-light transition-colors">
                  مقایسه با روش سنتی
                </a>
              </li>
              <li>
                <a href="#roles" className="text-white/70 hover:text-emerald-light transition-colors">
                  پنل‌های تخصصی نقش‌ها
                </a>
              </li>
              <li>
                <a href="#faq" className="text-white/70 hover:text-emerald-light transition-colors">
                  سوالات متداول
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Account & Support */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">حساب کاربری و پشتیبانی</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="text-white/70 hover:text-emerald-light transition-colors">
                  ورود به پنل کاربری
                </Link>
              </li>
              <li>
                <a href="#contact" className="text-white/70 hover:text-emerald-light transition-colors">
                  درخواست دمو و مشاوره
                </a>
              </li>
              <li className="pt-2">
                <a
                  href="mailto:hello@samik.app"
                  className="inline-flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-emerald-light transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  hello@samik.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© ۱۴۰۵ سامیک — تمامی حقوق محفوظ است.</p>
          <div className="flex items-center gap-1.5 text-white/60">
            <span>ساخته‌شده با</span>
            <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400 inline" />
            <span>برای آینده آموزش ایران</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
