"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  WifiOff,
  Bell,
  Check,
  X as XIcon,
  Clock,
  Sparkles,
} from "lucide-react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Subtle geometric background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-[60%] h-[1px] bg-gradient-to-l from-emerald/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[60%] h-[1px] bg-gradient-to-r from-navy/30 to-transparent" />
        <div
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl"
          style={{
            background: "radial-gradient(circle, #10B981 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="text-center lg:text-right">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              <Badge
                variant="outline"
                className="mb-6 bg-emerald/5 border-emerald/30 text-emerald px-3.5 py-1.5 text-xs font-medium"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald ml-2 animate-pulse" />
                طراحی‌شده برای مدارس پیشرو ایران
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.08 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy leading-[1.2] tracking-tight"
            >
              پایان عصر دفتر نمره کاغذی؛
              <br />
              <span className="bg-gradient-to-l from-navy via-emerald-dark to-emerald bg-clip-text text-transparent">
                مدیریت کل مدرسه، زنده و در یک نگاه
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.16 }}
              className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 lg:ml-auto"
            >
              سامیک سامانه یکپارچه حضور و غیاب، دفتر نمره کلاسی و اطلاع‌رسانی اولیاست. معلم حتی بدون اینترنت در کلاس حضور و غیاب می‌زند، ناظم در همان ثانیه غایبین کل مدرسه را روی مانیتور می‌بیند و پیامک غیبت حتی به خطوط مسدودشده اولیا ارسال می‌شود.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.24 }}
              className="mt-8 flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                asChild
                className="bg-emerald hover:bg-emerald-dark text-white h-12 px-7 text-base font-semibold gap-2 shadow-lg shadow-emerald/20 cursor-pointer"
              >
                <Link href="/login">
                  ورود به پنل کاربری
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-6 text-base font-medium gap-2 border-slate-300 hover:border-navy hover:bg-navy/5 text-slate-700 cursor-pointer"
              >
                <a href="#contact">
                  درخواست دمو و مشاوره رایگان
                </a>
              </Button>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.36 }}
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 justify-center lg:justify-start text-xs sm:text-sm text-slate-600 font-medium"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
                ثبت در کلاس حتی بدون اینترنت
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
                پیامک خدماتی غیبت (عبور از بلک‌لیست)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
                جابه‌جایی بین چند مدرسه با یک حساب
              </span>
            </motion.div>
          </div>

          {/* Visual mock — realistic classroom card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 }}
            className="relative"
          >
            <HeroVisualMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/**
 * Visual mock of the teacher's classroom view + Deputy alert.
 */
function HeroVisualMock() {
  return (
    <div className="relative">
      {/* Background shadow/glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-navy/5 via-transparent to-emerald/10 rounded-3xl" />

      <div className="relative bg-white rounded-2xl shadow-2xl shadow-navy/10 border border-slate-200 overflow-hidden">
        {/* Window header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-800">یکشنبه</span>
            <span className="text-slate-500 font-mono">۰۷:۳۰</span>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] gap-1.5 font-normal" variant="outline">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
            در حال برگزاری
          </Badge>
        </div>

        {/* Card Content */}
        <div className="p-5 space-y-4">
          {/* Class banner */}
          <div className="rounded-xl bg-gradient-to-l from-navy via-navy-light to-navy text-white p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/70">زنگ اول (۰۷:۳۰ تا ۰۹:۰۰) — هر هفته</div>
                <div className="text-lg font-bold mt-0.5">ادبیات فارسی — کلاس دهم الف</div>
              </div>
              <Badge className="bg-white/20 hover:bg-white/25 text-white border-0 text-xs">
                ۳۲ دانش‌آموز
              </Badge>
            </div>
          </div>

          {/* 3 Real Student Rows */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-500 mb-1 px-1">
              ثبت سریع حضور و غیاب کلاسی:
            </div>

            {/* Row 1: Present */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-medium text-slate-800">۱. آرش رضایی</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs">
                <Check className="h-3.5 w-3.5" />
                حاضر
              </Badge>
            </div>

            {/* Row 2: Absent */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-rose-100 bg-rose-50/40">
              <span className="text-sm font-medium text-slate-800">۲. امیرحسین محمدی</span>
              <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 gap-1 text-xs text-white">
                <XIcon className="h-3.5 w-3.5" />
                غایب
              </Badge>
            </div>

            {/* Row 3: Late + Behavioral Point */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-100 bg-amber-50/30">
              <span className="text-sm font-medium text-slate-800">۳. پارسا کریمی</span>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-amber-50 text-amber-700 border-amber-300 gap-1 text-xs font-normal">
                  <Clock className="h-3 w-3" />
                  تأخیر
                </Badge>
                <Badge className="bg-emerald-100/80 text-emerald-800 border-emerald-300 text-[10px] gap-0.5 font-medium">
                  <Sparkles className="h-2.5 w-2.5" />
                  +۱ مشارکت کلاسی
                </Badge>
              </div>
            </div>
          </div>

          {/* Next slot */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-400">کلاس بعدی:</span>
            <span className="font-medium text-slate-700">۰۹:۱۵ | ریاضی — دهم ب (هفته فرد)</span>
          </div>
        </div>
      </div>

      {/* Floating badge 1: Offline operation */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.8 }}
        className="absolute -top-4 -left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 p-3 flex items-center gap-2.5 z-10"
      >
        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <WifiOff className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-medium">کارکرد بدون اینترنت</div>
          <div className="text-xs font-bold text-slate-800">ذخیره خودکار در گوشی معلم</div>
        </div>
      </motion.div>

      {/* Floating badge 2: Deputy instant alert */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 1 }}
        className="absolute -bottom-4 -right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 p-3 flex items-center gap-2.5 z-10 max-w-[280px] sm:max-w-none"
      >
        <div className="h-8 w-8 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-navy" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-medium">پنل زنده ناظم</div>
          <div className="text-xs font-bold text-slate-800">۱ غایب در دهم الف ثبت شد — ارسال پیامک به ولی</div>
        </div>
      </motion.div>
    </div>
  );
}
