"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2,
  Activity,
  WifiOff,
  Wifi,
  Clock,
  AlertCircle,
  Phone,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hhmmToPersian } from "@/lib/timetable/time-utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { EmptyState } from "@/components/shared/empty-state";

interface AbsenteeEntry {
  id: string; // unique key for list
  studentId: string;
  studentName: string;
  classroomName: string;
  subjectTitle: string;
  teacherName: string;
  submittedAt: string;
  status: "ABSENT" | "LATE";
  schoolId: string;
}

interface BehavioralEntry {
  id: string;
  studentId: string;
  studentName: string;
  classroomName: string;
  pointType: "POSITIVE" | "NEGATIVE";
  reasonTag: string | null;
  teacherName: string;
  createdAt: string;
  schoolId: string;
}

type SSEEvent =
  | { type: "connected"; schoolId: string }
  | {
      type: "attendance:submitted";
      schoolId: string;
      payload: {
        classSessionId: string;
        classroomName: string;
        subjectTitle: string;
        teacherName: string;
        submittedAt: string;
        absentees: Array<{
          studentId: string;
          studentName: string;
          status: "ABSENT" | "LATE";
        }>;
      };
    }
  | {
      type: "behavioral-point:created";
      schoolId: string;
      payload: BehavioralEntry;
    };

interface PendingClass {
  classroomName: string;
  subjectTitle: string;
  teacherName: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
  minutesSinceStart: number;
}

export function DeputyLiveDashboard() {
  const [connected, setConnected] = useState(false);
  const [absentees, setAbsentees] = useState<AbsenteeEntry[]>([]);
  const [behavioral, setBehavioral] = useState<BehavioralEntry[]>([]);
  const [pendingClasses, setPendingClasses] = useState<PendingClass[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load pending classes (computed from timetable + current time)
  const loadPendingClasses = useCallback(async () => {
    setLoadingPending(true);
    try {
      const r = await fetch("/api/v1/deputy/timetable");
      const d = await r.json();
      if (!d.ok) return;

      // Find slots that should be active right now (current time within bell range)
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const todaySamikDay = (now.getDay() + 1) % 7; // Saturday=0..Friday=6

      const active: PendingClass[] = [];
      for (const slot of d.slots) {
        if (slot.dayOfWeek !== todaySamikDay) continue;
        const [sh, sm] = slot.bellSchedule.startTime.split(":").map(Number);
        const [eh, em] = slot.bellSchedule.endTime.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        // Active if now is between start and end
        if (nowMin >= startMin && nowMin < endMin) {
          active.push({
            classroomName: `${slot.classRoom.gradeLevel} ${slot.classRoom.name}`,
            subjectTitle: slot.subject.title,
            teacherName: `${slot.teacher.firstName} ${slot.teacher.lastName}`,
            bellTitle: slot.bellSchedule.title,
            startTime: slot.bellSchedule.startTime,
            endTime: slot.bellSchedule.endTime,
            minutesSinceStart: nowMin - startMin,
          });
        }
      }
      setPendingClasses(active);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // SSE connection
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = new EventSource("/api/v1/sse/deputy");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 5 seconds
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connectSSE, 5000);
    };
    es.onmessage = (e) => {
      try {
        const event: SSEEvent = JSON.parse(e.data);
        if (event.type === "connected") {
          setConnected(true);
          return;
        }
        if (event.type === "attendance:submitted") {
          const newAbsentees: AbsenteeEntry[] = event.payload.absentees.map(
            (a, i) => ({
              id: `${event.payload.classSessionId}-${a.studentId}-${i}`,
              studentId: a.studentId,
              studentName: a.studentName,
              classroomName: event.payload.classroomName,
              subjectTitle: event.payload.subjectTitle,
              teacherName: event.payload.teacherName || "—",
              submittedAt: event.payload.submittedAt,
              status: a.status,
              schoolId: event.schoolId,
            })
          );
          if (newAbsentees.length > 0) {
            setAbsentees((prev) => [newAbsentees[0], ...newAbsentees.slice(1), ...prev].slice(0, 50));
          }
          // Show toast
          toast.success(
            `حضور و غیاب ${event.payload.classroomName} ثبت شد (${newAbsentees.length} غایب/تاخیری)`,
            { duration: 4000 }
          );
          // Refresh pending classes (the submitted one should disappear)
          void loadPendingClasses();
        }
        if (event.type === "behavioral-point:created") {
          setBehavioral((prev) => [event.payload, ...prev].slice(0, 50));
        }
      } catch {
        // ignore malformed events (e.g. heartbeat comments)
      }
    };
  }, [loadPendingClasses]);

  useEffect(() => {
    connectSSE();
    void loadPendingClasses();
    // Refresh pending classes every 60 seconds
    const id = setInterval(loadPendingClasses, 60_000);
    return () => {
      clearInterval(id);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      eventSourceRef.current?.close();
    };
  }, [connectSSE, loadPendingClasses]);

  const stats = {
    pendingCount: pendingClasses.length,
    absenteesCount: absentees.length,
    lateCount: absentees.filter((a) => a.status === "LATE").length,
    positivePoints: behavioral.filter((b) => b.pointType === "POSITIVE").length,
    negativePoints: behavioral.filter((b) => b.pointType === "NEGATIVE").length,
  };

  // SSE connection badge — compact pill, emerald when connected / red pulse when disconnected.
  const sseBadge = (
    <Badge
      variant="outline"
      className={cn(
        "text-xs px-2 py-0.5 gap-1.5 font-medium",
        connected
          ? "bg-emerald/10 text-emerald border-emerald/30"
          : "bg-destructive/10 text-destructive border-destructive/30"
      )}
    >
      {connected ? (
        <>
          <Wifi className="h-3 w-3" />
          متصل (SSE)
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 animate-pulse" />
          در حال اتصال...
        </>
      )}
    </Badge>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="داشبورد زنده"
        subtitle="مانیتورینگ درلحظه حضور و غیاب و انضباط مدرسه"
        icon={Activity}
        actions={sseBadge}
      />

      {/* KPI row */}
      <KpiCardGrid
        cards={[
          {
            label: "کلاس‌های در حال برگزاری",
            value: stats.pendingCount,
            icon: Clock,
            tint: "info",
          },
          {
            label: "غایبین امروز",
            value: stats.absenteesCount,
            icon: AlertCircle,
            tint: "destructive",
          },
          {
            label: "امتیازات مثبت",
            value: stats.positivePoints,
            icon: ThumbsUp,
            tint: "emerald",
          },
          {
            label: "امتیازات منفی",
            value: stats.negativePoints,
            icon: ThumbsDown,
            tint: "warning",
          },
        ]}
      />

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Classes */}
        <ScrollReveal delay={120}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <Clock className="h-4 w-4" />
                کلاس‌های در حال برگزاری
                <Badge variant="outline" className="text-xs mr-1 tabular-nums">
                  {pendingClasses.length.toLocaleString("fa-IR")}
                </Badge>
              </CardTitle>
              <CardDescription>
                کلاس‌هایی که زنگ آن‌ها شروع شده اما هنوز ثبت نهایی نشده‌اند.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-navy" />
                </div>
              ) : pendingClasses.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="هیچ کلاسی در حال برگزاری نیست."
                  description="زنگ‌های فعال به‌محض شروع در اینجا نمایش داده می‌شوند."
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pendingClasses.map((c, i) => (
                    <div
                      key={`${c.classroomName}-${c.bellTitle}-${i}`}
                      className={cn(
                        "stagger-item flex items-center gap-3 p-3 rounded-lg border",
                        c.minutesSinceStart > 10
                          ? "border-warning/30 bg-warning/5"
                          : "border-border"
                      )}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {c.classroomName} — {c.subjectTitle}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {c.teacherName} • {c.bellTitle}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-xs text-muted-foreground tabular-nums font-mono">
                          {hhmmToPersian(c.startTime)}–{hhmmToPersian(c.endTime)}
                        </div>
                        <div
                          className={cn(
                            "text-xs font-bold tabular-nums",
                            c.minutesSinceStart > 10
                              ? "text-warning"
                              : "text-muted-foreground"
                          )}
                        >
                          {c.minutesSinceStart.toLocaleString("fa-IR")} دقیقه
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Live Absentees Feed */}
        <ScrollReveal delay={180}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                استریم زنده غایبین
                <Badge variant="outline" className="text-xs mr-1 tabular-nums">
                  {absentees.length.toLocaleString("fa-IR")}
                </Badge>
              </CardTitle>
              <CardDescription>
                به محض ثبت توسط معلمان، غایبین و تاخیری‌ها در این لیست ظاهر می‌شوند.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {absentees.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="هنوز غایبی ثبت نشده است."
                  description="با ثبت حضور و غیاب توسط معلمان، فهرست غایبین به‌روز می‌شود."
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {absentees.map((a, i) => (
                    <AbsenteeRow key={a.id} absentee={a} index={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* Behavioral Points Feed */}
      <ScrollReveal delay={240}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              فعالیت‌های انضباطی زنده
              <Badge variant="outline" className="text-xs mr-1 tabular-nums">
                {behavioral.length.toLocaleString("fa-IR")}
              </Badge>
            </CardTitle>
            <CardDescription>
              امتیازات مثبت و منفی ثبت‌شده توسط معلمان در امروز.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {behavioral.length === 0 ? (
              <EmptyState
                icon={ThumbsUp}
                title="هنوز امتیاز انضباطی ثبت نشده است."
                description="امتیازات مثبت و منفیِ ثبت‌شده توسط معلمان در اینجا نمایش داده می‌شوند."
              />
            ) : (
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {behavioral.map((b, i) => (
                  <div
                    key={b.id}
                    className={cn(
                      "stagger-item inline-flex items-center gap-2 p-2 rounded-lg border text-xs",
                      b.pointType === "POSITIVE"
                        ? "bg-emerald/5 border-emerald/20 text-emerald"
                        : "bg-destructive/5 border-destructive/20 text-destructive"
                    )}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {b.pointType === "POSITIVE" ? (
                      <ThumbsUp className="h-3 w-3" />
                    ) : (
                      <ThumbsDown className="h-3 w-3" />
                    )}
                    <span className="font-medium">{b.studentName}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground">{b.classroomName}</span>
                    {b.reasonTag && (
                      <>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="italic">{b.reasonTag}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}

function AbsenteeRow({
  absentee,
  index,
}: {
  absentee: AbsenteeEntry;
  index: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <div
        className={cn(
          "stagger-item flex items-center gap-3 p-3 rounded-lg border",
          absentee.status === "ABSENT"
            ? "border-destructive/20 bg-destructive/5"
            : "border-warning/20 bg-warning/5"
        )}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <div
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            absentee.status === "ABSENT" ? "bg-destructive" : "bg-warning"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{absentee.studentName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {absentee.classroomName} • {absentee.subjectTitle} •{" "}
            <span dir="ltr" className="tabular-nums font-mono">
              {new Date(absentee.submittedAt).toLocaleTimeString("fa-IR")}
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            absentee.status === "ABSENT"
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning"
          )}
        >
          {absentee.status === "ABSENT" ? "غایب" : "تاخیر"}
        </Badge>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-info hover:text-info hover:bg-info/10 cursor-pointer"
            aria-label="تماس با ولی"
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="text-navy">تماس با ولی</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">دانش‌آموز</div>
            <div className="font-medium">{absentee.studentName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">کلاس</div>
            <div>{absentee.classroomName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">وضعیت</div>
            <Badge
              className={
                absentee.status === "ABSENT"
                  ? "bg-destructive text-white"
                  : "bg-warning text-white"
              }
            >
              {absentee.status === "ABSENT" ? "غایب" : "تاخیر"}
            </Badge>
          </div>
          <Button className="w-full bg-emerald hover:bg-emerald-dark gap-2 cursor-pointer">
            <Phone className="h-4 w-4" />
            تماس با ولی
          </Button>
          <Button variant="outline" className="w-full cursor-pointer">
            توجیه غیبت (EXCUSED)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
