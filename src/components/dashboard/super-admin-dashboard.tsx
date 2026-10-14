"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Users,
  GraduationCap,
  Loader2,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { toPersianDate } from "@/lib/date-utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SchoolRow {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
  smsBalance: number;
  createdAt: string;
  principal?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  } | null;
  _count: { staffEmployments: number; enrollments: number; classrooms: number };
}

/**
 * SuperAdmin dashboard — platform-wide overview.
 *
 * Per UI/UX Pro Max (Data-Dense Dashboard style):
 *   - KpiCardGrid at top: total schools, active schools, total students, total staff
 *   - Direct click-through from Recent Schools to individual School Control Panels
 *   - Zero action redundancy (removed duplicate bottom card, streamlined primary CTA)
 */
export function SuperAdminDashboard() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/v1/super-admin/schools");
        const d = await r.json();
        if (d.ok) setSchools(d.schools as SchoolRow[]);
      } catch (err) {
        console.error("[LOAD_SUPER_ADMIN_DASHBOARD_ERROR]", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.status === "ACTIVE").length;
  const totalStudents = schools.reduce(
    (sum, s) => sum + (s._count?.enrollments ?? 0),
    0
  );
  const totalStaff = schools.reduce(
    (sum, s) => sum + (s._count?.staffEmployments ?? 0),
    0
  );
  const recentSchools = [...schools]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="داشبورد مدیر سامانه"
        subtitle="نظارت جامع و یکپارچه بر پلتفرم سامیک"
        icon={Building2}
        actions={
          <Button asChild className="bg-navy hover:bg-navy-dark gap-2 shadow-sm cursor-pointer">
            <Link href="/super-admin/schools?new=1">
              <Plus className="h-4 w-4" />
              <span>ثبت مدرسه جدید</span>
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-navy" />
        </div>
      ) : (
        <>
          <KpiCardGrid
            cards={[
              {
                label: "کل مدارس",
                value: totalSchools,
                icon: Building2,
                tint: "navy",
                href: "/super-admin/schools",
              },
              {
                label: "مدارس فعال",
                value: activeSchools,
                icon: CheckCircle2,
                tint: "emerald",
                href: "/super-admin/schools?status=ACTIVE",
              },
              {
                label: "کل دانش‌آموزان",
                value: totalStudents,
                icon: GraduationCap,
                tint: "info",
                href: "/super-admin/students",
              },
              {
                label: "کل پرسنل",
                value: totalStaff,
                icon: Users,
                tint: "warning",
                href: "/super-admin/staff",
              },
            ]}
          />

          {/* Recent schools preview with direct click-through */}
          <ScrollReveal delay={120}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-navy flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>آخرین مدارس ثبت‌شده</span>
                </CardTitle>
                <CardDescription className="mt-1">
                  برای مدیریت امکانات، پرسنل و تنظیمات هر مدرسه، روی آن کلیک کنید.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentSchools.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      هنوز مدرسه‌ای روی پلتفرم ثبت نشده است.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {recentSchools.map((s, i) => (
                      <Link
                        key={s.id}
                        href={`/super-admin/schools/${s.id}`}
                        className="stagger-item flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-border/60 transition-all cursor-pointer group"
                        style={{ animationDelay: `${i * 30}ms` }}
                        title={`ورود به پنل مدیریت مدرسه ${s.name}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-white transition-colors shadow-2xs">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-navy group-hover:text-navy-dark truncate">
                                {s.name}
                              </p>
                              <Badge
                                variant={s.status === "ACTIVE" ? "default" : "destructive"}
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-4",
                                  s.status === "ACTIVE" ? "bg-emerald hover:bg-emerald text-white" : ""
                                )}
                              >
                                {s.status === "ACTIVE" ? "فعال" : "معلق"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span dir="ltr" className="font-mono text-[11px] text-slate-500">
                                {s.subdomain}.samik.app
                              </span>
                              {s.principal && (
                                <span className="text-slate-600">
                                  • مدیر: {s.principal.firstName} {s.principal.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-left hidden md:block">
                            <div className="text-xs font-medium text-slate-700">
                              {(s._count?.enrollments ?? 0).toLocaleString("fa-IR")} دانش‌آموز • {(s._count?.staffEmployments ?? 0).toLocaleString("fa-IR")} کادر
                            </div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              ثبت: {toPersianDate(s.createdAt)}
                            </div>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-navy/10 text-slate-400 group-hover:text-navy flex items-center justify-center transition-colors">
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>
        </>
      )}
    </div>
  );
}
