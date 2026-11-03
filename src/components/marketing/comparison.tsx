"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { Reveal } from "./motion";

interface ComparisonRow {
  topic: string;
  traditional: string;
  samik: string;
}

const COMPARISONS: ComparisonRow[] = [
  {
    topic: "ثبت حضور و غیاب",
    traditional: "خواندن تک‌به‌تک اسامی در دفتر کاغذی و اتلاف وقت تدریس",
    samik: "پیش‌فرض همه حاضر؛ ثبت غایبین کل کلاس در کمتر از ۱۰ ثانیه",
  },
  {
    topic: "اطلاع‌رسانی به ناظم",
    traditional: "نوشتن اسامی روی برگه و فرستادن نماینده کلاس به دفتر",
    samik: "نمایش زنده غایبین و کلاس‌های ثبت‌نشده روی مانیتور ناظم",
  },
  {
    topic: "پیامک غیبت به اولیا",
    traditional: "تماس تلفنی دستی یا نرسیدن پیامک به خاطر بلک‌لیست مخابراتی",
    samik: "ارسال یک‌کلیکی با خط خدماتی رسمی (عبور ۱۰۰٪ از بلک‌لیست)",
  },
  {
    topic: "قطعی اینترنت مدرسه",
    traditional: "قفل شدن سایت‌های معمولی و از دست رفتن اطلاعات ثبت‌شده",
    samik: "ثبت آفلاین در لحظه و همگام‌سازی خودکار پس از وصل شدن اینترنت",
  },
  {
    topic: "دبیران چندمدرسه‌ای",
    traditional: "تداخل ساعت کاری دبیران پروازی و سردرگمی در برنامه‌ریزی",
    samik: "تشخیص خودکار تداخل ساعت دبیر در مدارس دیگر + جابه‌جایی اکانت با یک کلیک",
  },
  {
    topic: "فراموشی رمز دانش‌آموز",
    traditional: "دردسر پشتیبانی یا هزینه پیامک برای هر بار ورود به سیستم",
    samik: "ورود راحت با کد ملی و رمز عبور + بازنشانی رمز توسط معاون با یک کلیک",
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-20 lg:py-28 relative bg-slate-50/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="max-w-3xl mx-auto text-center mb-14">
          <span className="text-xs sm:text-sm font-bold text-emerald tracking-wider uppercase">
            تفاوت را لمس کنید
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy tracking-tight leading-tight">
            مدرسه شما قبل و بعد از سامیک
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            ببینید سامیک چگونه چالش‌های روزمره، خسته‌کننده و وقت‌گیر کادر مدرسه را به فرآیندهایی لذت‌بخش و لحظه‌ای تبدیل می‌کند.
          </p>
        </Reveal>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-700 py-4 px-6">
            <div className="col-span-3 text-right">دغدغه روزمره مدرسه</div>
            <div className="col-span-4 text-right flex items-center gap-1.5 text-rose-700">
              <XCircle className="h-4 w-4" />
              روش سنتی و کاغذی
            </div>
            <div className="col-span-5 text-right flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald" />
              با سامانه هوشمند سامیک
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {COMPARISONS.map((row, i) => (
              <div
                key={row.topic}
                className="grid grid-cols-12 items-center py-4 px-6 hover:bg-slate-50/50 transition-colors text-sm"
              >
                <div className="col-span-3 font-bold text-navy text-xs sm:text-sm">
                  {row.topic}
                </div>
                <div className="col-span-4 text-slate-500 text-xs sm:text-sm leading-relaxed pr-2 pl-4">
                  <span className="inline-block md:hidden font-bold text-rose-600 ml-1">سنتی:</span>
                  {row.traditional}
                </div>
                <div className="col-span-5 text-slate-800 font-medium text-xs sm:text-sm leading-relaxed bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/60 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                  <span>{row.samik}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {COMPARISONS.map((row) => (
            <div
              key={row.topic}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="text-sm font-bold text-navy border-b border-slate-100 pb-2">
                {row.topic}
              </div>

              {/* Traditional */}
              <div className="rounded-xl bg-rose-50/50 border border-rose-100 p-3 text-xs text-rose-900 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5 text-rose-700">روش سنتی:</span>
                  {row.traditional}
                </div>
              </div>

              {/* Samik */}
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3 text-xs text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5 text-emerald-800">با سامیک:</span>
                  {row.samik}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
