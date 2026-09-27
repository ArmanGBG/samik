"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  PlayCircle,
  Calendar,
  Clock,
  GraduationCap,
  BookOpen,
  DoorClosed,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { dayToPersian } from "@/lib/timetable/days";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface ActiveSession {
  slotId: string;
  classRoomId: string;
  classRoomName: string;
  subjectTitle: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
  startTimeFa: string;
  endTimeFa: string;
  weekType: string;
}

interface AgendaItem {
  slotId: string;
  subjectTitle: string;
  classroomName: string;
  classRoomId: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
  startTimeFa: string;
  endTimeFa: string;
  weekType: string;
}

interface CurrentSessionResponse {
  ok: boolean;
  server: {
    now: string;
    nowHHmm: string;
    nowHHmmFa: string;
    todaySamikDay: number;
    parity: string | null;
    weekNumber: number;
    isPreTerm: boolean;
    isUnconfigured: boolean;
    toleranceMinutes: number;
  };
  school: { id: string; name: string; termStartDate: string | null };
  activeSession: ActiveSession | null;
  agenda: AgendaItem[];
}

const WEEK_TYPE_LABEL: Record<string, string> = {
  ALL_WEEKS: "هر هفته",
  ODD_WEEKS: "هفته‌های فرد",
  EVEN_WEEKS: "هفته‌های زوج",
};

const WEEK_TYPE_TINT: Record<string, string> = {
  ALL_WEEKS: "bg-emerald/10 text-emerald border-emerald/30",
  ODD_WEEKS: "bg-info/10 text-info border-info/30",
  EVEN_WEEKS: "bg-warning/10 text-warning border-warning/30",
};

export function TeacherCurrentSession() {
  const router = useRouter();
  const [data, setData] = useState<CurrentSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const r = await fetch("/api/v1/teacher/current-session");
      const d = await r.json();
      if (d.ok) setData(d);
      else toast.error(d.error ?? "خطا در دریافت جلسه فعلی.");
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Auto-refresh every 60s while the page is open
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (!data) return null;

  const { server, activeSession, agenda } = data;
  const todayName = dayToPersian(server.todaySamikDay);

  // Build subtitle: today + time + parity badge — compact, inline
  const subtitle = `${todayName} • ${server.nowHHmmFa}${
    !server.isUnconfigured && server.parity
      ? ` • هفته ${server.weekNumber.toLocaleString("fa-IR")} — ${server.parity === "ODD_WEEKS" ? "فرد" : "زوج"}`
      : ""
  }`;

  // PageHeader actions: parity badge (when configured) + warning badge (when unconfigured) + refresh button
  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {!server.isUnconfigured && server.parity && (
        <Badge
          variant="outline"
          className={cn(
            "tabular-nums text-xs",
            server.parity === "ODD_WEEKS"
              ? "bg-info/10 text-info border-info/30"
              : "bg-warning/10 text-warning border-warning/30"
          )}
        >
          هفته {server.weekNumber.toLocaleString("fa-IR")} — {server.parity === "ODD_WEEKS" ? "فرد" : "زوج"}
        </Badge>
      )}
      {server.isUnconfigured && (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
          <AlertCircle className="h-3 w-3" />
          سال تحصیلی پیکربندی نشده
        </Badge>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => load(true)}
        disabled={refreshing}
        className="h-8 gap-1.5 text-xs"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        به‌روزرسانی
      </Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="داشبورد معلم"
        subtitle={subtitle}
        icon={GraduationCap}
        actions={headerActions}
      />

      {/* Hero Card — active session, or EmptyState */}
      <ScrollReveal>
        {activeSession ? (
          <Card className="border-emerald/30 bg-gradient-to-l from-emerald to-emerald-dark text-white shadow-lg shadow-emerald/20 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* Top row: live indicator + subject + bell title */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-emerald-light text-xs font-medium mb-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
                    کلاس در حال برگزاری
                  </div>
                  <h2 className="text-2xl font-bold leading-tight truncate">
                    {activeSession.subjectTitle}
                  </h2>
                  <p className="text-white/90 text-sm mt-1">
                    {activeSession.bellTitle} —{" "}
                    <span dir="ltr" className="font-mono tabular-nums">
                      {activeSession.startTimeFa} تا {activeSession.endTimeFa}
                    </span>
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="bg-white text-emerald hover:bg-white/90 h-10 px-5 shadow-sm"
                  onClick={() => router.push(`/teacher/attendance/${activeSession.slotId}`)}
                >
                  <PlayCircle className="h-4 w-4" />
                  شروع حضور و غیاب
                </Button>
              </div>

              {/* Three compact info cards: class + time + week type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <HeroInfoCard
                  icon={<DoorClosed className="h-3.5 w-3.5" />}
                  label="کلاس"
                  value={activeSession.classRoomName}
                />
                <HeroInfoCard
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="زمان"
                  value={`${activeSession.startTimeFa} – ${activeSession.endTimeFa}`}
                  ltr
                />
                <HeroInfoCard
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="نوع هفته"
                  value={WEEK_TYPE_LABEL[activeSession.weekType] ?? activeSession.weekType}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-0">
              <EmptyState
                icon={PlayCircle}
                title="کلاس فعالی در این زنگ ندارید"
                description={
                  agenda.length > 0
                    ? "در ادامه برنامه امروز شما نمایش داده می‌شود."
                    : "هیچ کلاسی برای امروز تعریف نشده است."
                }
              />
            </CardContent>
          </Card>
        )}
      </ScrollReveal>

      {/* Agenda for today */}
      {agenda.length > 0 && (
        <ScrollReveal delay={60}>
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-navy" />
                  <span className="font-medium text-sm text-navy">برنامه امروز شما</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {agenda.length.toLocaleString("fa-IR")} کلاس
                  {!server.isUnconfigured && (
                    <>
                      {" "}• هفته {server.weekNumber > 0 ? server.weekNumber.toLocaleString("fa-IR") : "—"}
                    </>
                  )}
                </span>
              </div>
              <div className="divide-y divide-border">
                {agenda.map((item, idx) => {
                  const isActive = activeSession?.slotId === item.slotId;
                  const tint = WEEK_TYPE_TINT[item.weekType];
                  return (
                    <div
                      key={item.slotId}
                      className={cn(
                        "stagger-item data-table-row flex items-center gap-3 p-2.5 transition-colors",
                        isActive ? "bg-emerald/5" : "hover:bg-muted/50"
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div
                        dir="ltr"
                        className="text-xs text-muted-foreground font-mono tabular-nums shrink-0 w-14 text-center"
                      >
                        {item.startTimeFa}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {item.subjectTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <GraduationCap className="h-3 w-3" />
                          <span className="truncate">{item.classroomName}</span>
                          <span aria-hidden>•</span>
                          <span className="truncate">{item.bellTitle}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] shrink-0", tint)}
                      >
                        {WEEK_TYPE_LABEL[item.weekType] ?? item.weekType}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}

function HeroInfoCard({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/15 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-white/70 text-[11px]">
        {icon}
        {label}
      </div>
      <div
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "text-base font-semibold mt-1",
          ltr && "font-mono tabular-nums"
        )}
      >
        {value}
      </div>
    </div>
  );
}
