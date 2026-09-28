"use client";

import { useEffect, useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  CalendarDays,
  Save,
  AlertCircle,
  AlertTriangle,
  Building2,
  Globe,
  Activity,
} from "lucide-react";
import { calculateWeekParity } from "@/lib/timetable/week-parity";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

interface SchoolInfo {
  id: string;
  name: string;
  subdomain: string;
  termStartDate: string | null;
  status: string;
}

interface SchoolInfoRow {
  icon: typeof Building2;
  label: string;
  value: React.ReactNode;
  dir?: "rtl" | "ltr";
  mono?: boolean;
}

export function TermConfigManager() {
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [termDate, setTermDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/school-config");
      const d = await r.json();
      if (d.ok) {
        setSchool(d.school);
        if (d.school.termStartDate) {
          // Convert ISO to YYYY-MM-DD for <input type="date">
          const dt = new Date(d.school.termStartDate);
          setTermDate(format(dt, "yyyy-MM-dd"));
        }
      }
    } catch (err) {
      console.error("[LOAD_SCHOOL_CONFIG_ERROR]", err);
      toast.error("خطا در دریافت تنظیمات مدرسه.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const iso = termDate
        ? new Date(termDate + "T00:00:00Z").toISOString()
        : null;
      const r = await fetch("/api/v1/principal/school-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termStartDate: iso }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ذخیره ناموفق بود.");
        return;
      }
      toast.success("تاریخ شروع ترم ذخیره شد.");
      load();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  // Live preview of week-parity calculation
  let parityPreview: ReturnType<typeof calculateWeekParity> | null = null;
  if (termDate) {
    const dt = new Date(termDate + "T00:00:00Z");
    parityPreview = calculateWeekParity(dt, new Date());
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  const schoolRows: SchoolInfoRow[] = [
    {
      icon: Building2,
      label: "نام مدرسه",
      value: school?.name ?? "—",
    },
    {
      icon: Globe,
      label: "زیردامنه",
      value: school?.subdomain ?? "—",
      dir: "ltr",
      mono: true,
    },
    {
      icon: Activity,
      label: "وضعیت",
      value: (
        <Badge
          variant="default"
          className={
            school?.status === "ACTIVE"
              ? "bg-emerald hover:bg-emerald"
              : "bg-destructive hover:bg-destructive"
          }
        >
          {school?.status === "ACTIVE" ? "فعال" : "معلق"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="تنظیمات سال تحصیلی"
        subtitle="تنظیم تاریخ شروع ترم — مبنای محاسبهٔ هفته‌های زوج و فرد."
        icon={CalendarDays}
      />

      {/* School info card */}
      <ScrollReveal>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">
              مشخصات مدرسه
            </CardTitle>
            <CardDescription>
              اطلاعات پایهٔ مدرسه — قابل ویرایش توسط مدیر سامانه.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {schoolRows.map((row, i) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="stagger-item flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {row.label}
                    </span>
                  </div>
                  <span
                    dir={row.dir}
                    className={cn(
                      "text-sm font-medium text-left",
                      row.mono && "font-mono tabular-nums"
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Date input card */}
      <ScrollReveal delay={80}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <Save className="h-4 w-4" />
              تاریخ شروع ترم
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-info shrink-0" />
              توصیه می‌شود اولین شنبه (Saturday) سال تحصیلی را انتخاب کنید. هفته‌ای که این تاریخ در آن قرار دارد، به‌عنوان هفتهٔ ۱ (فرد) در نظر گرفته می‌شود.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="termDate" className="text-xs font-medium">
                  تاریخ شروع ترم
                </Label>
                <Input
                  id="termDate"
                  type="date"
                  dir="ltr"
                  className="font-mono text-left tabular-nums"
                  value={termDate}
                  onChange={(e) => setTermDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  هجری شمسی پیشنهادی: ۱۴۰۴/۰۷/۰۱ (معادل 2025-09-23 میلادی — اولین شنبهٔ سال تحصیلی ۱۴۰۴–۱۴۰۵)
                </p>
              </div>

              {parityPreview && !parityPreview.isUnconfigured && (
                <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                  <p className="text-sm font-medium text-navy mb-2 flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    پیش‌نمایش محاسبهٔ هفته
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        شماره هفته
                      </span>
                      <div className="font-mono tabular-nums mt-0.5">
                        {parityPreview.weekNumber.toLocaleString("fa-IR")}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        نوع هفته
                      </span>
                      <div className="mt-0.5">
                        <Badge
                          variant="outline"
                          className={
                            parityPreview.parity === "ODD_WEEKS"
                              ? "bg-info/10 text-info"
                              : "bg-warning/10 text-warning"
                          }
                        >
                          {parityPreview.parity === "ODD_WEEKS"
                            ? "فرد"
                            : "زوج"}
                        </Badge>
                      </div>
                    </div>
                    {parityPreview.isPreTerm && (
                      <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-warning text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        تاریخ در آینده است (پیش از شروع ترم).
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald hover:bg-emerald-dark cursor-pointer gap-2 font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ذخیره تنظیمات ترم...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    ذخیره تنظیمات تاریخ شروع ترم
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </ScrollReveal>

      {/* Batch Archive Card */}
      <ScrollReveal delay={120}>
        <Card className="border-destructive/30 border-2">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              پایان سال تحصیلی و بایگانی دانش‌آموزان
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              در پایان سال تحصیلی، با کلیک روی دکمه زیر، تمامی دانش‌آموزان سال گذشته بایگانی (Archived) می‌شوند تا سیستم برای ثبت‌نام‌های سال جدید آماده شود. سوابق تحصیلی آن‌ها حفظ خواهد شد.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto font-medium"
                onClick={async () => {
                  if (!confirm("آیا از بایگانی گروهی تمامی دانش‌آموزان فعال اطمینان دارید؟ این عملیات برای شروع سال تحصیلی جدید ضروری است و سوابق را پاک نمی‌کند.")) return;
                  
                  const toastId = toast.loading("در حال بایگانی دانش‌آموزان...");
                  try {
                    const r = await fetch("/api/v1/principal/term-config/archive", { method: "POST" });
                    const d = await r.json();
                    if (!d.ok) {
                      toast.error(d.error ?? "خطا در بایگانی.", { id: toastId });
                      return;
                    }
                    toast.success(d.message, { id: toastId });
                  } catch {
                    toast.error("خطا در برقراری ارتباط با سرور", { id: toastId });
                  }
                }}
              >
                بایگانی گروهی دانش‌آموزانِ سال جاری
              </Button>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}
