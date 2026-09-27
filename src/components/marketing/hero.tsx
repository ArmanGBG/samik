"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  PlayCircle,
  WifiOff,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Subtle geometric background — strict, no blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Diagonal accent line — top-right to bottom-left */}
        <div className="absolute top-0 right-0 w-[60%] h-[1px] bg-gradient-to-l from-emerald/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[60%] h-[1px] bg-gradient-to-r from-navy/30 to-transparent" />
        {/* Radial spotlight (very subtle) */}
        <div
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #10B981 0%, transparent 70%)",
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
                className="mb-6 bg-emerald/5 border-emerald/30 text-emerald px-3 py-1.5"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald ml-2 animate-pulse" />
                نسخه ۰.۱ — اکنون در دسترس
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.08 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy leading-[1.15] tracking-tight"
            >
              سامیک؛
              <br />
              <span className="bg-gradient-to-l from-navy to-emerald-dark bg-clip-text text-transparent">
                پایان عصر دفتر نمره کاغذی
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.16 }}
              className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 lg:ml-auto"
            >
              سیستم یکپارچه، هوشمند و آفلاین-فرست مدیریت کلاس و مدرسه. طراحی
              شده برای آرامش مدیران، سرعت معلمان و اطمینان اولیا.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.24 }}
              className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                asChild
                className="bg-navy hover:bg-navy-dark text-white h-12 px-7 text-base gap-2 shadow-lg shadow-navy/20"
              >
                <Link href="/login">
                  ورود به سیستم
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-7 text-base gap-2 border-border hover:border-navy hover:bg-navy/5"
              >
                <a href="#contact">
                  <PlayCircle className="h-4 w-4" />
                  درخواست دمو
                </a>
              </Button>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.36 }}
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                چندمستاجره امن
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                آفلاین-فرست
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                RTL کامل
              </span>
            </motion.div>
          </div>

          {/* Visual mock — geometric dashboard preview */}
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
 * Pure-CSS geometric mock of the teacher dashboard Hero Card.
 * No external images — uses gradients + borders only.
 */
function HeroVisualMock() {
  return (
    <div className="relative">
      {/* Background frame */}
      <div className="absolute -inset-4 bg-gradient-to-br from-navy/5 via-transparent to-emerald/5 rounded-3xl" />

      <div className="relative bg-white rounded-2xl shadow-2xl shadow-navy/10 border border-border overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald/60" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground font-mono">
              samik.app/teacher
            </span>
          </div>
        </div>

        {/* Mock dashboard content */}
        <div className="p-5 space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">یکشنبه</span>
              <span className="text-muted-foreground font-mono">۰۷:۳۰</span>
            </div>
            <Badge className="bg-info/10 text-info border-info/30" variant="outline">
              هفته ۱ — فرد
            </Badge>
          </div>

          {/* Hero Card */}
          <div className="rounded-xl bg-gradient-to-l from-emerald to-emerald-dark text-white p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-1.5 text-emerald-light text-xs mb-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                کلاس در حال برگزاری
              </div>
              <div className="text-2xl font-bold mb-2">ادبیات</div>
              <div className="text-white/80 text-xs">زنگ اول — ۰۷:۳۰ تا ۰۹:۰۰</div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-lg bg-white/15 p-2">
                  <div className="text-[10px] text-white/70">کلاس</div>
                  <div className="text-sm font-semibold mt-0.5">دهم الف</div>
                </div>
                <div className="rounded-lg bg-white/15 p-2">
                  <div className="text-[10px] text-white/70">زمان</div>
                  <div className="text-sm font-semibold mt-0.5 font-mono" dir="ltr">
                    ۰۷:۳۰
                  </div>
                </div>
                <div className="rounded-lg bg-white/15 p-2">
                  <div className="text-[10px] text-white/70">نوع</div>
                  <div className="text-sm font-semibold mt-0.5">هر هفته</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mini agenda */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
              <div className="text-xs font-mono text-muted-foreground w-10">۰۹:۱۵</div>
              <div className="flex-1 text-sm">ریاضیات — دهم ب</div>
              <Badge variant="outline" className="text-[10px]">
                همه
              </Badge>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
              <div className="text-xs font-mono text-muted-foreground w-10">۱۱:۰۰</div>
              <div className="flex-1 text-sm">فیزیک — یازدهم الف</div>
              <Badge variant="outline" className="text-[10px]">
                فرد
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.8 }}
        className="absolute -top-3 -left-3 bg-white rounded-xl shadow-lg border border-border p-3 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-emerald/10 flex items-center justify-center">
          <WifiOff className="h-4 w-4 text-emerald" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">آفلاین</div>
          <div className="text-xs font-semibold text-navy">همگام‌سازی خودکار</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.95 }}
        className="absolute -bottom-3 -right-3 bg-white rounded-xl shadow-lg border border-border p-3 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-navy/10 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-navy" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">امنیت</div>
          <div className="text-xs font-semibold text-navy">RLS چندمستاجره</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 1.1 }}
        className="absolute top-1/2 -right-6 bg-white rounded-xl shadow-lg border border-border p-2.5 hidden lg:flex items-center gap-2"
      >
        <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-warning" />
        </div>
        <div className="text-xs font-semibold text-navy">Idempotent</div>
      </motion.div>
    </div>
  );
}
