"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, CalendarRange, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/timetable/days";

const WEEK_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  ALL_WEEKS: {
    label: "همه هفته‌ها",
    className: "bg-emerald/15 text-emerald border-emerald/30",
  },
  ODD_WEEKS: {
    label: "هفته‌های فرد",
    className: "bg-info/15 text-info border-info/30",
  },
  EVEN_WEEKS: {
    label: "هفته‌های زوج",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  SINGLE_SESSION: {
    label: "تک‌جلسه",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function TeacherWeeklyTimetable() {
  const [slots, setSlots] = useState<any[]>([]);
  const [bells, setBells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [meRes, ttRes, bellsRes] = await Promise.all([
          fetch("/api/v1/me", { cache: "no-store" }),
          fetch("/api/v1/deputy/timetable", { cache: "no-store" }),
          fetch("/api/v1/principal/bell-schedules", { cache: "no-store" }),
        ]);
        const me = await meRes.json();
        const tt = await ttRes.json();
        const b = await bellsRes.json();
        if (cancelled) return;

        if (!me.ok) return setError(me.error ?? "خطا در دریافت اطلاعات کاربر.");
        if (!tt.ok) return setError(tt.error ?? "خطا در دریافت برنامه هفتگی.");
        if (!b.ok) return setError(b.error ?? "خطا در دریافت زنگ‌ها.");

        const teacherId = me.user.id;
        const mySlots = (tt.slots || []).filter((s: any) => s.teacher.id === teacherId);

        // The bell-schedules endpoint returns `bellSchedules`. Reading
        // `b.bells` yielded an empty list, which rendered a table with a
        // header and zero rows — the grid looked completely blank.
        const bellList = b.bellSchedules || b.bells || b.data || [];

        setSlots(mySlots);
        setBells(bellList);
      } catch (err) {
        console.error("Error loading teacher timetable", err);
        if (!cancelled) setError("خطا در برقراری ارتباط با سرور.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const matrixGrid = useMemo(() => {
    const grid = new Map<number, Map<string, any[]>>();
    DAYS_OF_WEEK.forEach((d) => {
      grid.set(d.value, new Map<string, any[]>());
      bells.forEach((b) => grid.get(d.value)!.set(b.id, []));
    });
    slots.forEach((s) => {
      if (!grid.has(s.dayOfWeek)) return;
      if (!grid.get(s.dayOfWeek)!.has(s.bellSchedule.id)) {
        grid.get(s.dayOfWeek)!.set(s.bellSchedule.id, []);
      }
      grid.get(s.dayOfWeek)!.get(s.bellSchedule.id)!.push(s);
    });
    return grid;
  }, [slots, bells]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center p-10 text-destructive gap-3">
          <AlertCircle className="h-10 w-10 opacity-40" />
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (bells.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center p-10 text-muted-foreground gap-3">
          <CalendarRange className="h-10 w-10 opacity-20" />
          <p>زنگ‌های مدرسه تعریف نشده است. ابتدا از بخش «زنگ‌ها» زمان‌بندی را ثبت کنید.</p>
        </CardContent>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center p-10 text-muted-foreground gap-3">
          <CalendarRange className="h-10 w-10 opacity-20" />
          <p>هیچ کلاسی در برنامه هفتگی شما یافت نشد.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          برنامه هفتگی من
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100/90 border-b border-border/80">
                <th className="p-4 text-right font-bold text-xs text-navy border-l border-border/70 w-[160px] sticky right-0 bg-slate-100 z-10">
                  زنگ و ساعت تدریس
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th
                    key={day.value}
                    className="p-4 text-center font-bold text-xs text-navy border-l border-border/70 last:border-l-0"
                  >
                    <div className="text-base font-bold text-navy">{day.persianName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bells.map((bell) => (
                <tr key={bell.id} className="border-b border-border/80 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-sm border-l border-border/70 sticky right-0 bg-white/95 backdrop-blur-sm z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-navy">{bell.title}</span>
                      <span className="text-xs text-muted-foreground font-normal tabular-nums tracking-wider bg-slate-100 self-start px-2 py-0.5 rounded-md">
                        {bell.startTime} الی {bell.endTime}
                      </span>
                    </div>
                  </td>
                  {DAYS_OF_WEEK.map((day) => {
                    const cellSlots = matrixGrid.get(day.value)?.get(bell.id) ?? [];
                    return (
                      <td
                        key={day.value}
                        className="p-3 border-l border-border/70 align-top last:border-l-0 min-w-[170px]"
                      >
                        {cellSlots.length === 0 ? (
                          <div className="min-h-[72px] flex items-center justify-center text-xs text-slate-300 font-light select-none">
                            —
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {cellSlots.map((slot) => {
                              const weekBadge = WEEK_TYPE_BADGE[slot.weekType] || WEEK_TYPE_BADGE.ALL_WEEKS;
                              return (
                                <Link
                                  href={`/teacher/session/${slot.id}`}
                                  key={slot.id}
                                  className={cn(
                                    "block hover:ring-2 hover:ring-primary/50",
                                    "p-3 rounded-xl border shadow-2xs transition-all space-y-2 text-right",
                                    slot.weekType === "ALL_WEEKS"
                                      ? "bg-emerald/5 border-emerald/25 text-emerald-950"
                                      : slot.weekType === "ODD_WEEKS"
                                      ? "bg-info/5 border-info/25 text-blue-950"
                                      : slot.weekType === "EVEN_WEEKS"
                                      ? "bg-warning/5 border-warning/25 text-orange-950"
                                      : "bg-destructive/5 border-destructive/25 text-red-950"
                                  )}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <div className="font-bold text-sm leading-tight line-clamp-2">
                                      {slot.subject.title}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <Badge variant="outline" className="text-[10px] bg-white text-navy font-semibold px-2 py-0 h-4 border-black/10 shadow-sm">
                                        پایه {slot.classRoom.gradeLevel} - {slot.classRoom.name}
                                      </Badge>
                                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-4 font-normal", weekBadge.className)}>
                                        {weekBadge.label}
                                      </Badge>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
