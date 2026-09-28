"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  WifiOff,
  CloudOff,
  Send,
  Users,
} from "lucide-react";
import { AttendanceToggle, type AttendanceState } from "@/components/teacher/attendance-toggle";
import { QuickPointButtons } from "@/components/teacher/quick-point-buttons";
import { enqueueMutation, getQueueStatus, initBackgroundSync } from "@/lib/offline/sync-queue";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { cn } from "@/lib/utils";

interface SlotInfo {
  id: string;
  subjectTitle: string;
  classroomName: string;
  classRoomId: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  weekType: string;
  date: string;
}

interface Student {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface QueueStatus {
  pending: number;
  failed: number;
  syncing: number;
}

export default function RollCallPage() {
  const params = useParams<{ slotId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slot, setSlot] = useState<SlotInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceState>>(new Map());
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, failed: 0, syncing: 0 });

  // Load slot + students on mount
  useEffect(() => {
    initBackgroundSync();
    void loadSlotAndStudents();
    void refreshQueueStatus();
    const id = setInterval(refreshQueueStatus, 3000);
    return () => clearInterval(id);
  }, []);

  async function loadSlotAndStudents() {
    setLoading(true);
    try {
      // Load the teacher's current timetable to find the slot
      const ttRes = await fetch("/api/v1/deputy/timetable");
      const ttData = await ttRes.json();
      if (!ttData.ok) {
        toast.error("خطا در دریافت برنامه هفتگی.");
        return;
      }
      const found = ttData.slots.find((s: any) => s.id === params.slotId);
      if (!found) {
        toast.error("خانه برنامه یافت نشد.");
        router.push("/teacher");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      setSlot({
        id: found.id,
        subjectTitle: found.subject.title,
        classroomName: `${found.classRoom.gradeLevel} ${found.classRoom.name}`,
        classRoomId: found.classRoom.id,
        bellTitle: found.bellSchedule.title,
        startTime: found.bellSchedule.startTime,
        endTime: found.bellSchedule.endTime,
        dayOfWeek: found.dayOfWeek,
        weekType: found.weekType,
        date: today,
      });

      // Load students for this classroom
      const stuRes = await fetch(`/api/v1/teacher/students?classroomId=${found.classRoom.id}`);
      const stuData = await stuRes.json();
      if (stuData.ok) {
        setStudents(stuData.students);
        // Initialize attendance: ALL students default to PRESENT
        const init = new Map<string, AttendanceState>();
        for (const s of stuData.students) init.set(s.id, "PRESENT");
        setAttendance(init);
      }
    } catch (err) {
      console.error("[LOAD_ATTENDANCE_SLOT_ERROR]", err);
      toast.error("خطا در بارگذاری اطلاعات کلاس و دانش‌آموزان.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshQueueStatus() {
    const status = await getQueueStatus();
    setQueueStatus(status);
  }

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0;
    for (const v of attendance.values()) {
      if (v === "PRESENT") present++;
      else if (v === "ABSENT") absent++;
      else if (v === "LATE") late++;
      else if (v === "EXCUSED") excused++;
    }
    return { present, absent, late, excused, total: attendance.size };
  }, [attendance]);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const hasPendingInQueue = queueStatus.pending > 0 || queueStatus.failed > 0;

  const setStudentStatus = useCallback((studentId: string, state: AttendanceState) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(studentId, state);
      return next;
    });
  }, []);

  async function handleCommit() {
    if (!slot) return;
    setSubmitting(true);

    const absentees: string[] = [];
    const latecomers: string[] = [];
    const excused: string[] = [];
    for (const [studentId, state] of attendance) {
      if (state === "ABSENT") absentees.push(studentId);
      else if (state === "LATE") latecomers.push(studentId);
      else if (state === "EXCUSED") excused.push(studentId);
    }

    const payload = {
      timetableSlotId: slot.id,
      date: slot.date,
      absentees,
      latecomers,
      excused,
    };

    // Enqueue in the offline-sync queue.
    // Per Section 10: client generates X-Idempotency-Key per operation;
    // the queue stores it and sends it as a header on flush.
    const { idempotencyKey } = await enqueueMutation({
      endpoint: "/api/v1/attendance/sessions",
      method: "POST",
      body: payload,
    });

    toast.success(
      isOnline
        ? `ثبت نهایی انجام شد. (${stats.present.toLocaleString("fa-IR")} حاضر، ${stats.absent.toLocaleString("fa-IR")} غایب، ${stats.late.toLocaleString("fa-IR")} تاخیر)`
        : `اینترنت قطع است! ثبت شما در صف همگام‌سازی قرار گرفت. به محض اتصال ارسال خواهد شد.`,
      { duration: 6000 }
    );

    setSubmitting(false);
    // Navigate back to dashboard after a brief delay
    setTimeout(() => router.push("/teacher"), 1500);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (!slot) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28">
      <PageHeader
        title={slot.subjectTitle}
        subtitle={
          <>
            {slot.classroomName} • {slot.bellTitle} •{" "}
            <span dir="ltr" className="font-mono tabular-nums">
              {slot.startTime}–{slot.endTime}
            </span>
          </>
        }
        icon={Users}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/teacher")}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-muted/50 cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به برنامه کلاس‌ها
          </Button>
        }
      />

      {/* Stats summary — 4 compact color-coded boxes */}
      <ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatBox label="حاضر" value={stats.present} color="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          <StatBox label="غایب" value={stats.absent} color="destructive" icon={<XCircle className="h-3.5 w-3.5" />} />
          <StatBox label="تاخیر" value={stats.late} color="warning" icon={<Clock className="h-3.5 w-3.5" />} />
          <StatBox label="موجه" value={stats.excused} color="info" icon={<FileText className="h-3.5 w-3.5" />} />
        </div>
      </ScrollReveal>

      {/* Offline banner — compact */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          شما آفلاین هستید. ثبت شما در صف همگام‌سازی قرار می‌گیرد و به محض اتصال ارسال خواهد شد.
        </div>
      )}
      {hasPendingInQueue && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-info/10 border border-info/30 text-info text-xs">
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">
            {queueStatus.pending.toLocaleString("fa-IR")} درخواست در صف انتظار، {queueStatus.failed.toLocaleString("fa-IR")} ناموفق (در حال تلاش مجدد...)
          </span>
        </div>
      )}

      {/* Student list */}
      <ScrollReveal delay={60}>
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-navy">لیست حضور و غیاب</span>
                <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/30 text-[10px] tabular-nums">
                  <Users className="h-3 w-3" />
                  {stats.total.toLocaleString("fa-IR")} دانش‌آموز
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                همه به‌صورت پیش‌فرض حاضر هستند
              </span>
            </div>
            <div className="divide-y divide-border">
              {students.map((student, idx) => {
                const state = attendance.get(student.id) ?? "PRESENT";
                return (
                  <div
                    key={student.id}
                    className={cn(
                      "stagger-item data-table-row flex items-center gap-3 p-2.5 transition-colors",
                      state === "ABSENT" && "bg-destructive/5",
                      state === "LATE" && "bg-warning/5",
                      state === "EXCUSED" && "bg-info/5"
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <span className="text-xs text-muted-foreground font-mono tabular-nums w-6 text-center shrink-0">
                      {(idx + 1).toLocaleString("fa-IR")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {student.fullName}
                      </p>
                    </div>
                    <QuickPointButtons
                      studentUserId={student.id}
                      studentName={student.fullName}
                      size="sm"
                    />
                    <AttendanceToggle
                      value={state}
                      onChange={(next) => setStudentStatus(student.id, next)}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Commit bar — fixed at bottom, compact py-2 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border py-2.5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4">
          <div className="flex-1 text-xs text-muted-foreground tabular-nums">
            {stats.present.toLocaleString("fa-IR")} حاضر • {stats.absent.toLocaleString("fa-IR")} غایب • {stats.late.toLocaleString("fa-IR")} تاخیر • {stats.excused.toLocaleString("fa-IR")} موجه
          </div>
          <Button
            onClick={handleCommit}
            disabled={submitting}
            size="lg"
            className="bg-emerald hover:bg-emerald-dark h-11 px-6 text-sm font-semibold gap-2 shadow-lg shadow-emerald/20 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ارسال و ثبت نهایی لیست...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                ثبت نهایی و ارسال لیست حضور و غیاب
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "emerald" | "destructive" | "warning" | "info";
  icon: React.ReactNode;
}) {
  const colorMap = {
    emerald: "bg-emerald/10 text-emerald border-emerald/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-info/10 text-info border-info/20",
  };
  return (
    <div className={cn("rounded-lg border p-2.5 flex items-center gap-2", colorMap[color])}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular-nums leading-none">
          {value.toLocaleString("fa-IR")}
        </div>
        <div className="text-[11px] mt-0.5">{label}</div>
      </div>
    </div>
  );
}
