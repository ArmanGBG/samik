"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Users,
  GraduationCap,
  Loader2,
  ArrowLeft,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
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

interface SchoolRow {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
  smsBalance: number;
  createdAt: string;
  _count: { staffEmployments: number; enrollments: number; classrooms: number };
}

/**
 * SuperAdmin dashboard — platform-wide overview.
 *
 * Per UI/UX Pro Max (Data-Dense Dashboard style):
 *   - KpiCardGrid at top: total schools, active schools, total students, total staff
 *   - Data sourced from existing GET /api/v1/super-admin/schools endpoint
 *     (already returns _count aggregates per school)
 *   - Recent schools preview table + quick action card
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
        subtitle="نظارت بر کل پلتفرم"
        icon={Building2}
        actions={
          <Button asChild className="bg-navy hover:bg-navy-dark gap-2 shadow-sm">
            <Link href="/super-admin/schools">
              <Plus className="h-4 w-4" />
              <span>مدیریت و ثبت مدارس جدید</span>
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
              },
              {
                label: "مدارس فعال",
                value: activeSchools,
                icon: CheckCircle2,
                tint: "emerald",
              },
              {
                label: "کل دانش‌آموزان",
                value: totalStudents,
                icon: GraduationCap,
                tint: "info",
              },
              {
                label: "کل پرسنل",
                value: totalStaff,
                icon: Users,
                tint: "warning",
              },
            ]}
          />

          {/* Recent schools preview */}
          <ScrollReveal delay={120}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-navy">
                  آخرین مدارس ثبت‌شده
                </CardTitle>
                <CardDescription>
                  پنج مدرسهٔ اخیر — برای مشاهدهٔ کامل و ثبت مدرسهٔ جدید به صفحهٔ مدارس بروید.
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
                  <div className="divide-y">
                    {recentSchools.map((s, i) => (
                      <div
                        key={s.id}
                        className="stagger-item flex items-center justify-between gap-3 py-2.5"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p
                              dir="ltr"
                              className="text-[11px] text-muted-foreground font-mono tabular-nums text-left"
                            >
                              {s.subdomain}.samik.app
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                            {format(new Date(s.createdAt), "yyyy/MM/dd", {
                              locale: faIR,
                            })}
                          </span>
                          <Badge
                            variant={s.status === "ACTIVE" ? "default" : "destructive"}
                            className={
                              s.status === "ACTIVE"
                                ? "bg-emerald hover:bg-emerald"
                                : ""
                            }
                          >
                            {s.status === "ACTIVE" ? "فعال" : "معلق"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Quick action card */}
          <ScrollReveal delay={200}>
            <Link
              href="/super-admin/schools"
              className="kpi-card rounded-xl border border-navy/20 bg-navy/5 hover:bg-navy/10 p-4 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">
                    آنبوردینگ مدرسهٔ جدید
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ثبت مدرسهٔ جدید، تخصیص زیردامنه و لایسنس اولیه.
                  </p>
                </div>
              </div>
              <ArrowLeft className="h-5 w-5 text-navy/70 group-hover:translate-x-[-2px] transition-transform" />
            </Link>
          </ScrollReveal>
        </>
      )}
    </div>
  );
}
