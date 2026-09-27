"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Eye,
  GraduationCap,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal, fadeUp } from "./motion";

interface RoleCard {
  role: string;
  roleLabel: string;
  icon: LucideIcon;
  tint: string;
  iconTint: string;
  bullets: string[];
  /** For alternating layout. */
  reverse?: boolean;
}

const ROLES: RoleCard[] = [
  {
    role: "PRINCIPAL",
    roleLabel: "مدیر مدرسه",
    icon: Building2,
    tint: "bg-navy/5 border-navy/20",
    iconTint: "bg-navy text-white",
    bullets: [
      "گزارش‌گیری کلان از وضعیت حضور و غیاب، نمرات و انضباط در سطح مدرسه",
      "نظارت یکپارچه روی پرسنل و دانش‌آموزان با ساختار دسترسی سلسله‌مراتبی",
      "تعریف پایه‌ها، کلاس‌ها، دروس و زنگ‌ها با اعتبارسنجی تداخل زمانی",
      "ارتقای سال تحصیلی با یک کلیک — بدون از دست رفتن سوابق",
    ],
  },
  {
    role: "DEPUTY",
    roleLabel: "ناظم / معاون",
    icon: Eye,
    tint: "bg-emerald/5 border-emerald/20",
    iconTint: "bg-emerald text-white",
    reverse: true,
    bullets: [
      "کنترل زنده نظم مدرسه با داشبورد Command Center مبتنی بر SSE",
      "فهرست لحظه‌ای کلاس‌های بلاتکلیفی که معلم هنوز حضور غیاب آن‌ها را ثبت نکرده",
      "ارتباط سریع با اولیا برای توجیه غیبت‌ها با گردش کار تأیید پیامک",
      "ثبت موارد انضباطی خارج از کلاس روی پروفایل دانش‌آموز",
    ],
  },
  {
    role: "TEACHER",
    roleLabel: "معلم",
    icon: GraduationCap,
    tint: "bg-info/5 border-info/20",
    iconTint: "bg-info text-white",
    bullets: [
      "رهایی از کاغذبازی با دفتر نمره ماتریسی و ثبت سریع امتیازات +/-",
      "رابط کاربری فوق‌سریع با پیش‌فرض حاضر بودن همه دانش‌آموزان",
      "یادآوری خودکار کلاس فعلی با Hero Card هوشمند",
      "پشتیبانی کامل آفلاین — حتی بدون اینترنت کلاس را ثبت کنید",
    ],
  },
  {
    role: "PARENT",
    roleLabel: "اولیا دانش‌آموزان",
    icon: Heart,
    tint: "bg-warning/5 border-warning/20",
    iconTint: "bg-warning text-white",
    reverse: true,
    bullets: [
      "اطلاع‌رسانی آنی غیبت‌ها، تاخیرها و افت نمرات",
      "مشاهده روند پیشرفت تحصیلی فرزندان با نمودار خطی",
      "کنترر امتیازات انضباطی مثبت و منفی در بالای پروفایل",
      "پشتیبانی از چندین فرزند در چندین مدرسه با یک لاگین",
    ],
  },
];

export function Roles() {
  return (
    <section id="roles" className="py-20 lg:py-28 bg-gradient-to-b from-transparent via-muted/20 to-transparent relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal variant="fadeUp" className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-emerald tracking-wider">
            برای هر نقش
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-navy tracking-tight leading-tight">
            یک تجربهٔ دقیقاً متناسب
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            سامیک به هر کاربر چیزی بیشتر از یک داشبورد می‌دهد: یک ابزار تخصصی
            متناسب با روزمره‌ترین وظایف او.
          </p>
        </Reveal>

        {/* Alternating rows */}
        <div className="space-y-8 lg:space-y-12">
          {ROLES.map((role) => (
            <RoleRow key={role.role} role={role} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoleRow({ role }: { role: RoleCard }) {
  const Icon = role.icon;
  return (
    <Reveal variant="fadeUp">
      <div
        className={`relative rounded-3xl border p-6 sm:p-10 ${role.tint} overflow-hidden`}
      >
        {/* Decorative geometric corner */}
        <div className="absolute top-0 left-0 w-40 h-40 opacity-[0.04] pointer-events-none">
          <div className="absolute inset-0 bg-current" style={{ color: "var(--foreground)" }} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Icon + label */}
          <div className={role.reverse ? "lg:order-2" : ""}>
            <div className="flex items-center gap-4">
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${role.iconTint} shadow-lg`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  نقش سامیک
                </div>
                <h3 className="text-2xl font-bold text-navy">
                  {role.roleLabel}
                </h3>
              </div>
            </div>
          </div>

          {/* Bullets */}
          <div className={role.reverse ? "lg:order-1" : ""}>
            <ul className="space-y-3">
              {role.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                      role.role === "PRINCIPAL"
                        ? "bg-navy"
                        : role.role === "DEPUTY"
                        ? "bg-emerald"
                        : role.role === "TEACHER"
                        ? "bg-info"
                        : "bg-warning"
                    }`}
                  />
                  <span className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
