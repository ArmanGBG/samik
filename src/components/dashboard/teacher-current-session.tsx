"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { hhmmToPersian } from "@/lib/timetable/time-utils";

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Status bar */}
      <Card>
        <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{todayName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span dir="ltr" className="text-sm font-mono">{server.nowHHmmFa}</span>
            </div>
            {!server.isUnconfigured && (
              <Badge variant="outline" className={
                server.parity === "ODD_WEEKS" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"
              }>
                هفته {server.weekNumber.toLocaleString("fa-IR")} — {server.parity === "ODD_WEEKS" ? "فرد" : "زوج"}
              </Badge>
            )}
            {server.isUnconfigured && (
              <Badge variant="outline" className="bg-warning/10 text-warning">
                <AlertCircle className="h-3 w-3 ml-1" />
                سال تحصیلی پیکربندی نشده
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ml-1 ${refreshing ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </Button>
        </CardContent>
      </Card>

      {/* Hero Card */}
      {activeSession ? (
        <Card className="border-emerald/30 bg-gradient-to-l from-emerald to-emerald-dark text-white shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-light text-xs font-medium mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
              کلاس در حال برگزاری
            </div>
            <CardTitle className="text-3xl">{activeSession.subjectTitle}</CardTitle>
            <CardDescription className="text-white/90">
              {activeSession.bellTitle} — {activeSession.startTimeFa} تا {activeSession.endTimeFa}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/15 p-3">
                <div className="flex items-center gap-2 text-white/70 text-xs">
                  <DoorClosed className="h-3 w-3" />
                  کلاس
                </div>
                <div className="text-base font-semibold mt-1">
                  {activeSession.classRoomName}
                </div>
              </div>
              <div className="rounded-lg bg-white/15 p-3">
                <div className="flex items-center gap-2 text-white/70 text-xs">
                  <Clock className="h-3 w-3" />
                  زمان
                </div>
                <div dir="ltr" className="text-base font-semibold mt-1 font-mono">
                  {activeSession.startTimeFa} – {activeSession.endTimeFa}
                </div>
              </div>
              <div className="rounded-lg bg-white/15 p-3">
                <div className="flex items-center gap-2 text-white/70 text-xs">
                  <Calendar className="h-3 w-3" />
                  نوع هفته
                </div>
                <div className="text-base font-semibold mt-1">
                  {WEEK_TYPE_LABEL[activeSession.weekType] ?? activeSession.weekType}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              className="bg-white text-emerald hover:bg-white/90"
              onClick={() => router.push(`/teacher/attendance/${activeSession.slotId}`)}
            >
              <PlayCircle className="h-4 w-4 ml-2" />
              شروع حضور و غیاب
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              کلاس فعالی در این زنگ ندارید
            </CardTitle>
            <CardDescription>
              {agenda.length > 0
                ? "در ادامه برنامه امروز شما نمایش داده می‌شود."
                : "هیچ کلاسی برای امروز تعریف نشده است."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Agenda for today */}
      {agenda.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">برنامه امروز شما</CardTitle>
            <CardDescription>
              {agenda.length} کلاس — هفته {server.weekNumber > 0 ? server.weekNumber.toLocaleString("fa-IR") : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {agenda.map((item, idx) => {
                const isActive = activeSession?.slotId === item.slotId;
                return (
                  <div
                    key={item.slotId}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isActive ? "border-emerald bg-emerald/5" : "border-border"
                    }`}
                  >
                    <div className="text-xs text-muted-foreground font-mono shrink-0 w-16" dir="ltr">
                      {item.startTimeFa}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">
                          {item.subjectTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <GraduationCap className="h-3 w-3" />
                        {item.classroomName}
                        <span>•</span>
                        {item.bellTitle}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={WEEK_TYPE_TINT[item.weekType] ?? ""}
                    >
                      {WEEK_TYPE_LABEL[item.weekType] ?? item.weekType}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
