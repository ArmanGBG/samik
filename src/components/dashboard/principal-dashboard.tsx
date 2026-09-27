"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  DoorClosed,
  BookOpen,
  Clock,
  GraduationCap,
  CalendarDays,
  Users,
  Loader2,
  ArrowLeft,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { cn } from "@/lib/utils";

interface ClassRoom {
  id: string;
  gradeLevel: string;
  name: string;
  studentCount: number;
  slotCount: number;
  assessmentCount: number;
}

interface Subject {
  id: string;
  title: string;
  slotCount: number;
}

interface Bell {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  slotCount: number;
}

interface SchoolInfo {
  id: string;
  name: string;
  subdomain: string;
  termStartDate: string | null;
  status: string;
}

interface QuickAction {
  href: string;
  title: string;
  description: string;
  icon: typeof DoorClosed;
  tint: "navy" | "emerald" | "info" | "warning";
}

const TINTS: Record<
  QuickAction["tint"],
  { iconBg: string; iconText: string; border: string; hoverBorder: string }
> = {
  navy: {
    iconBg: "bg-navy/10",
    iconText: "text-navy",
    border: "border-navy/20",
    hoverBorder: "hover:border-navy/50",
  },
  emerald: {
    iconBg: "bg-emerald/10",
    iconText: "text-emerald",
    border: "border-emerald/20",
    hoverBorder: "hover:border-emerald/50",
  },
  info: {
    iconBg: "bg-info/10",
    iconText: "text-info",
    border: "border-info/20",
    hoverBorder: "hover:border-info/50",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconText: "text-warning",
    border: "border-warning/20",
    hoverBorder: "hover:border-warning/50",
  },
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/principal/structure/classrooms",
    title: "کلاس‌ها",
    description: "تعریف پایه‌ها و کلاس‌های فیزیکی مدرسه.",
    icon: DoorClosed,
    tint: "navy",
  },
  {
    href: "/principal/structure/subjects",
    title: "دروس",
    description: "تعریف دروس قابل ارائه در مدرسه.",
    icon: BookOpen,
    tint: "emerald",
  },
  {
    href: "/principal/structure/bell-schedules",
    title: "زنگ‌های مدرسه",
    description: "تعریف ساعات شروع و پایان هر زنگ.",
    icon: Clock,
    tint: "info",
  },
  {
    href: "/principal/structure/term",
    title: "سال تحصیلی",
    description: "تنظیم تاریخ شروع ترم و محاسبهٔ هفته‌های زوج/فرد.",
    icon: CalendarDays,
    tint: "warning",
  },
];

/**
 * Principal dashboard — school structure overview.
 *
 * Per UI/UX Pro Max (Data-Dense Dashboard style):
 *   - KpiCardGrid: total classrooms, subjects, bell schedules, students
 *   - Quick action cards linking to structure/* pages
 *   - Data sourced from existing list endpoints (already return _count aggregates)
 */
export function PrincipalDashboard() {
  const [classrooms, setClassrooms] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [bells, setBells] = useState<Bell[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, subjectsRes, bellsRes, schoolRes] = await Promise.all([
          fetch("/api/v1/principal/classrooms"),
          fetch("/api/v1/principal/subjects"),
          fetch("/api/v1/principal/bell-schedules"),
          fetch("/api/v1/principal/school-config"),
        ]);
        const [rooms, subs, bellData, schoolData] = await Promise.all([
          roomsRes.json(),
          subjectsRes.json(),
          bellsRes.json(),
          schoolRes.json(),
        ]);
        if (rooms.ok) setClassrooms(rooms.classrooms);
        if (subs.ok) setSubjects(subs.subjects);
        if (bellData.ok) setBells(bellData.bellSchedules);
        if (schoolData.ok) setSchool(schoolData.school);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalClassrooms = classrooms.length;
  const totalSubjects = subjects.length;
  const totalBells = bells.length;
  const totalStudents = classrooms.reduce(
    (sum, c) => sum + (c.studentCount ?? 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="داشبورد مدیر مدرسه"
        subtitle={
          school
            ? `${school.name} — نظارت بر ساختار و منابع مدرسه`
            : "نظارت بر ساختار و منابع مدرسه"
        }
        icon={Building2}
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
                label: "کل کلاس‌ها",
                value: totalClassrooms,
                icon: DoorClosed,
                tint: "navy",
              },
              {
                label: "کل دروس",
                value: totalSubjects,
                icon: BookOpen,
                tint: "emerald",
              },
              {
                label: "زنگ‌های مدرسه",
                value: totalBells,
                icon: Clock,
                tint: "info",
              },
              {
                label: "کل دانش‌آموزان",
                value: totalStudents,
                icon: GraduationCap,
                tint: "warning",
              },
            ]}
          />

          {/* Quick actions */}
          <ScrollReveal delay={120}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-navy" />
                <h2 className="text-sm font-semibold text-navy">
                  دسترسی سریع
                </h2>
                <span className="text-xs text-muted-foreground">
                  — مدیریت ساختار مدرسه
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {QUICK_ACTIONS.map((action, i) => {
                  const tint = TINTS[action.tint];
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={cn(
                        "kpi-card stagger-item group rounded-xl border bg-card p-4 flex flex-col gap-3 cursor-pointer transition-colors",
                        tint.border,
                        tint.hoverBorder
                      )}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                          tint.iconBg,
                          tint.iconText
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {action.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-end">
                        <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-navy group-hover:translate-x-[-2px] transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>

          {/* School info summary */}
          {school && (
            <ScrollReveal delay={200}>
              <div className="rounded-xl border border-navy/15 bg-navy/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {school.name}
                    </p>
                    <p
                      dir="ltr"
                      className="text-[11px] text-muted-foreground font-mono tabular-nums text-left"
                    >
                      {school.subdomain}.samik.app
                    </p>
                  </div>
                </div>
                <Link
                  href="/principal/structure/term"
                  className="text-xs font-medium text-navy hover:text-navy-dark cursor-pointer flex items-center gap-1 transition-colors"
                >
                  تنظیمات سال تحصیلی
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </ScrollReveal>
          )}
        </>
      )}
    </div>
  );
}
