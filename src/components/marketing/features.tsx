"use client";

import { motion } from "framer-motion";
import {
  WifiOff,
  CalendarClock,
  Activity,
  Grid3x3,
  type LucideIcon,
} from "lucide-react";
import { Reveal, staggerContainer, fadeUp } from "./motion";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind tint classes for the icon container. */
  tint: string;
  /** Accent line color. */
  accent: string;
}

const FEATURES: Feature[] = [
  {
    icon: WifiOff,
    title: "حضور و غیاب آفلاین-فرست",
    description:
      "قطعی اینترنت دیگر مانع نیست. ثبت اطلاعات در کلاس و همگام‌سازی خودکار پس از اتصال مجدد، با Idempotency Key ضد تکرار.",
    tint: "bg-emerald/10 text-emerald",
    accent: "from-emerald/30",
  },
  {
    icon: CalendarClock,
    title: "تداخل‌یاب هوشمند برنامه هفتگی",
    description:
      "تخصیص دبیران به کلاس‌ها با موتور بررسی تداخل سراسری بین مدارس — شنبه ۷:۳۰ در مدرسه الف، دیگر قابل رزرو در مدرسه ب نیست.",
    tint: "bg-navy/10 text-navy",
    accent: "from-navy/30",
  },
  {
    icon: Activity,
    title: "داشبورد زنده ناظم",
    description:
      "مانیتورینگ درلحظه کلاس‌های بلاتکلیف و لیست غایبین بدون نیاز به رفرش صفحه — با Server-Sent Events.",
    tint: "bg-info/10 text-info",
    accent: "from-info/30",
  },
  {
    icon: Grid3x3,
    title: "دفتر نمره ماتریسی",
    description:
      "ثبت سریع نمرات توصیفی، عددی و امتیازات انضباطی با یک تاچ — گرید ماتریسی هوشمند با میانگین متحرک ۳۰ روزه.",
    tint: "bg-warning/10 text-warning",
    accent: "from-warning/30",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-sm font-semibold text-emerald tracking-wider">
            چرا سامیک؟
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-navy tracking-tight leading-tight">
            چهار ستون اصلی سامانه
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            هر بخش از سامیک برای حل یک درد واقعی مدیران، ناظمان، معلمان و
            اولیا طراحی شده است — نه صرفاً یک لیست بلند از امکانات بی‌کاربرد.
          </p>
        </Reveal>

        {/* Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="group relative bg-white rounded-2xl border border-border p-6 hover:shadow-xl hover:shadow-navy/5 hover:border-navy/20 transition-all duration-300"
              >
                {/* Top accent line */}
                <div
                  className={`absolute top-0 right-6 left-6 h-[2px] bg-gradient-to-l ${feature.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center mb-5 ${feature.tint} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold text-navy mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
