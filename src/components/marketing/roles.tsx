"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

interface RoleFeature {
  title: string;
  description: string;
}

interface RoleTab {
  id: string;
  tabLabel: string;
  subLabel: string;
  cardHeadline: string;
  icon: LucideIcon;
  badgeTint: string;
  themeColor: string;
  features: RoleFeature[];
}

const ROLES_DATA: RoleTab[] = [
  {
    id: "principal",
    tabLabel: "مدیر مدرسه",
    subLabel: "آرامش خاطر و اشراف کامل",
    cardHeadline: "مدیریت کلان مدرسه بر پایه آمار دقیق، نه حدس و گمان",
    icon: Building2,
    badgeTint: "bg-navy/10 text-navy border-navy/20",
    themeColor: "from-navy to-navy-dark",
    features: [
      {
        title: "داشبورد مدیریتی در یک نگاه",
        description:
          "مشاهده لحظه‌ای آمار کل دانش‌آموزان، کادر آموزشی، کلاس‌ها و نرخ حضور و غیاب روزانه مدرسه.",
      },
      {
        title: "تعریف ساختار منعطف مدرسه",
        description:
          "ساخت آسان پایه‌ها، رشته‌های تحصیلی (ریاضی، تجربی، انسانی و...)، دروس، سال تحصیلی و زمان‌بندی دقیق زنگ‌ها.",
      },
      {
        title: "چیدمان هوشمند برنامه هفتگی",
        description:
          "تخصیص دبیران به زنگ‌ها با پشتیبانی از هفته‌های زوج/فرد و جلوگیری خودکار از تداخل زمانی دبیران.",
      },
      {
        title: "مدیریت یکپارچه پرسنل و دانش‌آموزان",
        description:
          "ثبت‌نام سریع، دسته‌بندی کلاسی، ثبت شماره ولی اول و دوم و مدیریت دسترسی کادر مدرسه.",
      },
    ],
  },
  {
    id: "deputy",
    tabLabel: "معاون و ناظم",
    subLabel: "کنترل زنده نظم مدرسه",
    cardHeadline: "مانیتورینگ لحظه‌ای کلاس‌ها بدون قدم زدن در راهروها",
    icon: ShieldCheck,
    badgeTint: "bg-emerald/10 text-emerald border-emerald/20",
    themeColor: "from-emerald-600 to-emerald-800",
    features: [
      {
        title: "رادار زنده کلاس‌های بلاتکلیف",
        description:
          "مشاهده لحظه‌ای کلاس‌هایی که زنگ آن‌ها شروع شده اما دبیر هنوز حضور و غیاب را ثبت نکرده است (بدون نیاز به رفرش صفحه).",
      },
      {
        title: "لیست تجمیعی غایبین امروز",
        description:
          "مشاهده تمام غایبین و تاخیرهای مدرسه به محض ثبت توسط معلم در کلاس.",
      },
      {
        title: "کارتابل پیامک خدماتی اولیا",
        description:
          "ارسال پیامک رسمی غیبت با قالب استاندارد و خط خدماتی (تضمین تحویل حتی به خطوط مسدود تبلیغاتی).",
      },
      {
        title: "ثبت انضباط خارج از کلاس و پشتیبانی رمز",
        description:
          "ثبت تشویق یا تذکر انضباطی در حیاط و راهرو، به همراه دکمه بازنشانی فوری رمز عبور دانش‌آموزان فراموش‌کار.",
      },
    ],
  },
  {
    id: "teacher",
    tabLabel: "معلم و دبیر",
    subLabel: "سرعت بالا، بدون کاغذبازی",
    cardHeadline: "تمرکز روی تدریس، نه پر کردن دفترهای کاغذی",
    icon: GraduationCap,
    badgeTint: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    themeColor: "from-sky-600 to-sky-800",
    features: [
      {
        title: "تشخیص خودکار کلاس فعلی",
        description:
          "به محض باز کردن سامانه، کارت کلاس و زنگ در حال برگزاری روبه‌روی معلم قرار می‌گیرد.",
      },
      {
        title: "حضور و غیاب برق‌آسا (حتی بدون اینترنت)",
        description:
          "همه دانش‌آموزان پیش‌فرض «حاضر» هستند؛ فقط غایب یا تاخیر را لمس کنید و تمام!",
      },
      {
        title: "دفتر نمره ماتریسی و امتیازات کلاسی",
        description:
          "ثبت نمرات عددی، توصیفی، پرسش کلاسی و امتیازهای مثبت (+) و منفی (-) با برچسب علت در یک جدول روان.",
      },
      {
        title: "جابه‌جایی آسان بین مدارس",
        description:
          "دبیرانی که در چند مدرسه تدریس می‌کنند، تنها با یک شماره موبایل وارد شده و با یک کلیک بین مدارس خود جابه‌جا می‌شوند.",
      },
    ],
  },
  {
    id: "parent",
    tabLabel: "اولیا و دانش‌آموز",
    subLabel: "اطمینان و شفافیت لحظه‌ای",
    cardHeadline: "همراهی مستمر با روند تحصیلی و انضباطی فرزند",
    icon: HeartHandshake,
    badgeTint: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    themeColor: "from-amber-600 to-amber-800",
    features: [
      {
        title: "اطلاع‌رسانی فوری غیبت و تاخیر",
        description:
          "دریافت پیامک رسمی به محض ثبت غیبت در کلاس درس به همراه تقویم کامل سوابق حضور و غیاب.",
      },
      {
        title: "نمودار خطی پیشرفت تحصیلی",
        description:
          "مشاهده بصری روند رشد یا افت نمرات دانش‌آموز در طول ماه‌های سال تحصیلی به جای اعداد گیج‌کننده.",
      },
      {
        title: "کارنامه اخلاقی و رفتاری شفاف",
        description:
          "مشاهده تجمیعی امتیازات مثبت و منفی ثبت‌شده به همراه تاریخ، علت و نام دبیر ثبت‌کننده.",
      },
      {
        title: "یک حساب برای همه فرزندان",
        description:
          "والدینی که چند فرزند در یک یا چند مدرسه دارند، با یک بار ورود می‌توانند پرونده هر فرزند را به تفکیک بررسی کنند.",
      },
    ],
  },
];

export function Roles() {
  const [activeTabId, setActiveTabId] = useState<string>("principal");
  const activeRole = ROLES_DATA.find((r) => r.id === activeTabId)!;
  const ActiveIcon = activeRole.icon;

  return (
    <section id="roles" className="py-20 lg:py-28 relative bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <span className="text-xs sm:text-sm font-bold text-emerald tracking-wider uppercase">
            یک سامانه، چهار دیدگاه تخصصی
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy tracking-tight leading-tight">
            ابزار اختصاصی برای هر عضو خانواده مدرسه
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            در سامیک هر کس دقیقاً همان میز کاری را می‌بیند که برای انجام سریع‌تر وظایف روزانه‌اش به آن نیاز دارد.
          </p>
        </Reveal>

        {/* Tab triggers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-1.5 bg-slate-100/80 rounded-2xl max-w-4xl mx-auto mb-10">
          {ROLES_DATA.map((role) => {
            const Icon = role.icon;
            const isActive = role.id === activeTabId;
            return (
              <button
                key={role.id}
                onClick={() => setActiveTabId(role.id)}
                className={cn(
                  "flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-white text-navy shadow-md shadow-navy/5 border border-slate-200/80 scale-[1.02]"
                    : "text-slate-600 hover:text-navy hover:bg-white/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-emerald" : "text-slate-400"
                  )}
                />
                <span>{role.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-10 shadow-lg shadow-slate-200/30 overflow-hidden relative"
            >
              {/* Header card of role */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm text-navy shrink-0">
                    <ActiveIcon className="h-6 w-6 text-emerald" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      میز کار تخصصی {activeRole.tabLabel}
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-navy mt-0.5">
                      {activeRole.cardHeadline}
                    </h3>
                  </div>
                </div>
                <div className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activeRole.subLabel}
                </div>
              </div>

              {/* 4 Feature cards */}
              <div className="grid sm:grid-cols-2 gap-5 mt-6">
                {activeRole.features.map((feat) => (
                  <div
                    key={feat.title}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex items-start gap-3.5"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                        {feat.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
