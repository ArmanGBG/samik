"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { Reveal } from "./motion";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "اگر اینترنت مدرسه یا دیتا در کلاس درس قطع باشد، کار معلم متوقف می‌شود؟",
    answer:
      "خیر! سامیک به گونه‌ای طراحی شده که معلم بدون اینترنت هم می‌تواند حضور و غیاب و نمرات را در گوشی یا تبلت خود ثبت کند. اطلاعات در دستگاه ذخیره شده و به محض اتصال مجدد به اینترنت، به صورت خودکار و بدون هیچ‌گونه تکراری به سرور مدرسه ارسال می‌شود.",
  },
  {
    question: "بسیاری از اولیا پیامک‌های تبلیغاتی گوشی خود را بسته‌اند؛ آیا پیامک غیبت به دستشان می‌رسد؟",
    answer:
      "بله، ۱۰۰ درصد. سامانه پیامکی سامیک متصل به خطوط خدماتی رسمی با الگوهای مصوب است و پیامک‌های غیبت حتی به شماره‌هایی که پیامک تبلیغاتی را مسدود کرده‌اند (بلک‌لیست مخابرات) بدون مشکل تحویل داده می‌شود.",
  },
  {
    question: "آیا برای هر بار ورود دانش‌آموزان یا معلمان هزینه پیامک کسر می‌شود؟",
    answer:
      "خیر. علاوه بر امکان ورود با کد یک‌بارمصرف پیامکی، تمامی کاربران (دانش‌آموزان، اولیا و کادر مدرسه) می‌توانند با «کد ملی یا شماره موبایل» و «رمز عبور ثابت» وارد شوند. اگر دانش‌آموزی رمز خود را فراموش کند، مدیر یا معاون مدرسه می‌تواند تنها با یک کلیک رمز او را بازنشانی کند.",
  },
  {
    question: "بعضی از دبیران ما در چند مدرسه تدریس می‌کنند یا همزمان ولی دانش‌آموز هم هستند؛ آیا باید چند اکانت بسازند؟",
    answer:
      "اصلاً. در سامیک هر فرد تنها با شماره موبایل خود وارد می‌شود و در صفحه انتخاب پروفایل، می‌تواند با یک کلیک بین نقش‌های مختلف خود (معلم در مدرسه الف، معاون در مدرسه ب، یا ولی دانش‌آموز) جابه‌جا شود.",
  },
  {
    question: "آیا اطلاعات مدرسه ما کاملاً محرمانه و جدا از سایر مدارس است؟",
    answer:
      "بله. هر مدرسه در سامیک دارای فضای داده‌ای کاملاً ایزوله و اختصاصی است و هیچ مدرسه یا کاربری در سطح سامانه امکان دسترسی به اطلاعات مدرسه دیگر را ندارد.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 lg:py-28 relative bg-slate-50/60 border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <span className="text-xs sm:text-sm font-bold text-emerald tracking-wider uppercase">
            پاسخ به دغدغه‌های شما
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy tracking-tight leading-tight">
            سوالات پرتکرار مدیران مدارس
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            پاسخ شفاف به پرتکرارترین پرسش‌هایی که مدیران و معاونان قبل از پیوستن به سامیک مطرح می‌کنند.
          </p>
        </Reveal>

        {/* Accordion */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/40">
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full space-y-3">
            {FAQS.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className="border border-slate-100 rounded-2xl px-5 py-1.5 data-[state=open]:border-emerald-200 data-[state=open]:bg-emerald-50/20 transition-all"
              >
                <AccordionTrigger className="text-right text-sm sm:text-base font-bold text-navy hover:text-emerald hover:no-underline py-4 leading-relaxed">
                  <div className="flex items-center gap-3 text-right">
                    <HelpCircle className="h-5 w-5 text-emerald shrink-0" />
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 pb-4 pr-8 pl-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
