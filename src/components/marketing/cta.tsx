"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Mail } from "lucide-react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function CTASection() {
  return (
    <section id="contact" className="py-20 lg:py-28 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-dark to-slate-950 p-8 sm:p-12 lg:p-16 text-center shadow-2xl shadow-navy/20"
        >
          {/* Subtle geometric pattern */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #FFFFFF 0, #FFFFFF 1px, transparent 1px, transparent 24px)",
              }}
            />
          </div>

          {/* Accent glow line at top */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-l from-transparent via-emerald to-transparent" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald/15 border border-emerald/30 text-emerald text-xs font-semibold mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              شروع تحول دیجیتال مدرسه
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              آماده‌اید کاغذبازی را برای همیشه
              <br />
              <span className="bg-gradient-to-l from-emerald-light to-emerald bg-clip-text text-transparent">
                از مدرسه خود حذف کنید؟
              </span>
            </h2>

            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              همین امروز فضای اختصاصی مدرسه خود را در سامیک فعال کنید یا درخواست دمو بدهید تا کارشناسان ما در کمتر از ۲۴ ساعت تمامی بخش‌های سامانه را به صورت زنده به شما نمایش دهند.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3.5 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-emerald hover:bg-emerald-dark text-white h-12 px-7 text-base font-semibold gap-2 shadow-xl shadow-emerald/20 cursor-pointer"
              >
                <Link href="/login">
                  ورود به سامانه سامیک
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-7 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40 cursor-pointer font-medium gap-2"
              >
                <a href="mailto:hello@samik.app">
                  <Mail className="h-4 w-4" />
                  درخواست دمو و مشاوره رایگان
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
