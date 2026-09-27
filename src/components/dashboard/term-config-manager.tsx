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
import { Loader2, CalendarDays, Save, AlertCircle } from "lucide-react";
import { calculateWeekParity } from "@/lib/timetable/week-parity";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";

interface SchoolInfo {
  id: string;
  name: string;
  subdomain: string;
  termStartDate: string | null;
  status: string;
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
    } finally {
      setSubmitting(false);
    }
  }

  // Live preview of week-parity calculation
  let parityPreview = null;
  if (termDate) {
    const dt = new Date(termDate + "T00:00:00Z");
    const result = calculateWeekParity(dt, new Date());
    parityPreview = result;
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          تنظیمات سال تحصیلی
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تنظیم تاریخ شروع ترم — مبنای محاسبه هفته‌های زوج و فرد.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">مشخصات مدرسه</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">نام مدرسه</span>
            <span className="font-medium">{school?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">زیردامنه</span>
            <span dir="ltr" className="font-mono text-sm">
              {school?.subdomain}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">وضعیت</span>
            <Badge variant="default" className="bg-emerald hover:bg-emerald">
              {school?.status === "ACTIVE" ? "فعال" : "معلق"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Save className="h-4 w-4" />
            تاریخ شروع ترم
          </CardTitle>
          <CardDescription className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-info shrink-0" />
            توصیه می‌شود اولین شنبه (Saturday) سال تحصیلی را انتخاب کنید. هفته‌ای که این
            تاریخ در آن قرار دارد، به‌عنوان هفته ۱ (فرد) در نظر گرفته می‌شود.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="termDate">تاریخ شروع ترم</Label>
              <Input
                id="termDate"
                type="date"
                dir="ltr"
                className="font-mono text-left"
                value={termDate}
                onChange={(e) => setTermDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                هجری شمسی پیشنهادی: ۱۴۰۴/۰۷/۰۱ (معادل 2025-09-23 میلادی — اولین شنبه سال تحصیلی ۱۴۰۴–۱۴۰۵)
              </p>
            </div>

            {parityPreview && !parityPreview.isUnconfigured && (
              <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-sm">
                <p className="font-medium text-navy mb-2">پیش‌نمایش محاسبه هفته:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground">شماره هفته:</span>
                    <span className="font-mono mr-2">
                      {parityPreview.weekNumber.toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">نوع هفته:</span>
                    <Badge
                      variant="outline"
                      className={
                        parityPreview.parity === "ODD_WEEKS"
                          ? "mr-2 bg-info/10 text-info"
                          : "mr-2 bg-warning/10 text-warning"
                      }
                    >
                      {parityPreview.parity === "ODD_WEEKS" ? "فرد" : "زوج"}
                    </Badge>
                  </div>
                  {parityPreview.isPreTerm && (
                    <div className="text-warning col-span-2">
                      ⚠ تاریخ انتخاب‌شده در آینده است (پیش از شروع ترم).
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
              className="bg-emerald hover:bg-emerald-dark"
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                "ذخیره"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
