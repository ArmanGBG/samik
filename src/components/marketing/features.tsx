"use client";

import { motion } from "framer-motion";
import {
  WifiOff,
  Radio,
  CheckSquare,
  CalendarCheck2,
  type LucideIcon,
} from "lucide-react";
import { Reveal, staggerContainer, fadeUp } from "./motion";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  tint: string;
  accent: string;
}

const FEATURES: Feature[] = [
  {
    icon: WifiOff,
    title: "آنتن‌دهی ضعیف کلاس‌ها دیگر مشکل نیست",
    description:
      "کلاس در طبقه منفی است یا اینترنت مدرسه قطع شده؟ هیچ مشکلی نیست. معلم حضور و غیاب و نمرات را روی گوشی خود ثبت می‌کند و به محض وصل شدن اینترنت، اطلاعات به صورت خودکار و بدون تکرار در سامانه ذخیره می‌شود.",
    tint: "bg-emerald/10 text-emerald",
    accent: "from-emerald/40",
  },
  {
    icon: Radio,
    title: "نظارت لحظه‌ای بر تمام کلاس‌ها + پیامک تضمینی",
    description:
      "ناظم دیگر نیازی به گشتن کلاس‌به‌کلاس برای جمع‌آوری برگه غایبین ندارد. کلاس‌هایی که هنوز حضور و غیاب نشده‌اند و لیست غایبین کل مدرسه، زنده روی صفحه ظاهر می‌شوند و پیامک غیبت با خط خدماتی (حتی به شماره‌های مسدود تبلیغاتی) ارسال می‌گردد.",
    tint: "bg-navy/10 text-navy",
    accent: "from-navy/40",
  },
  {
    icon: CheckSquare,
    title: "حضور و غیاب ۱۰ ثانیه‌ای و دفتر نمره هوشمند",
    description:
      "به صورت پیش‌فرض همه دانش‌آموزان «حاضر» هستند؛ معلم فقط غایبین را لمس می‌کند! ثبت نمرات مستمر، توصیفی و امتیازهای مثبت و منفی کلاسی در یک جدول روان انجام می‌شود و نمودار پیشرفت دانش‌آموز خودکار ترسیم می‌گردد.",
    tint: "bg-amber-500/10 text-amber-600",
    accent: "from-amber-500/40",
  },
  {
    icon: CalendarCheck2,
    title: "برنامه‌ریزی هفتگی بدون حتی یک تداخل زمانی",
    description:
      "پشتیبانی کامل از زنگ‌های ثابت و چرخشی (هفته‌های زوج و فرد). اگر دبیری در مدرسه دیگری در همان ساعت کلاس داشته باشد، سامانه هوشمندانه هشدار می‌دهد تا هیچ تداخلی در برنامه دبیران پروازی پیش نیاید.",
    tint: "bg-sky-500/10 text-sky-600",
    accent: "from-sky-500/40",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 relative bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs sm:text-sm font-bold text-emerald tracking-wider uppercase">
            چرا مدارس به سامیک مهاجرت می‌کنند؟
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy tracking-tight leading-tight">
            ساخته‌شده برای واقعیت‌های مدارس ایران
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            ما به جای فرم‌های پیچیده و بی‌استفاده، دقیقاً چالش‌هایی را حل کرده‌ایم که هر روز وقت مدیر، معاون و معلم را می‌گیرند.
          </p>
        </Reveal>

        {/* Grid 2x2 */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="group relative bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 hover:shadow-xl hover:shadow-navy/5 hover:border-navy/20 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top accent line */}
                <div
                  className={`absolute top-0 right-6 left-6 h-[2px] bg-gradient-to-l ${feature.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div>
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center mb-5 ${feature.tint} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-bold text-navy mb-3 leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
