"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  CloudOff,
  Send,
  Users,
} from "lucide-react";
import { AttendanceToggle, type AttendanceState } from "@/components/teacher/attendance-toggle";
import { QuickPointButtons } from "@/components/teacher/quick-point-buttons";
import { enqueueMutation, getQueueStatus, initBackgroundSync } from "@/lib/offline/sync-queue";
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
        ? `ثبت نهایی انجام شد. (${stats.present} حاضر، ${stats.absent} غایب، ${stats.late} تاخیر)`
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
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-3">
        <button
          onClick={() => router.push("/teacher")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-navy transition"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به داشبورد
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-navy">{slot.subjectTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {slot.classroomName} • {slot.bellTitle} •{" "}
              <span dir="ltr" className="font-mono">
                {slot.startTime}–{slot.endTime}
              </span>
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/30">
            <Users className="h-3 w-3 ml-1" />
            {stats.total} دانش‌آموز
          </Badge>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2">
        <StatBox label="حاضر" value={stats.present} color="emerald" />
        <StatBox label="غایب" value={stats.absent} color="destructive" />
        <StatBox label="تاخیر" value={stats.late} color="warning" />
        <StatBox label="موجه" value={stats.excused} color="info" />
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
          <WifiOff className="h-4 w-4" />
          شما آفلاین هستید. ثبت شما در صف همگام‌سازی قرار می‌گیرد و به محض اتصال ارسال خواهد شد.
        </div>
      )}
      {hasPendingInQueue && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/30 text-info text-sm">
          <CloudOff className="h-4 w-4" />
          {queueStatus.pending} درخواست در صف انتظار، {queueStatus.failed} ناموفق (در حال تلاش مجدد...)
        </div>
      )}

      {/* Student list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy flex items-center justify-between">
            <span>لیست حضور و غیاب</span>
            <span className="text-xs text-muted-foreground font-normal">
              همه به‌صورت پیش‌فرض حاضر هستند
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {students.map((student, idx) => {
              const state = attendance.get(student.id) ?? "PRESENT";
              return (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center gap-3 p-3 transition-colors",
                    state === "ABSENT" && "bg-destructive/5",
                    state === "LATE" && "bg-warning/5",
                    state === "EXCUSED" && "bg-info/5"
                  )}
                >
                  <span className="text-xs text-muted-foreground font-mono w-6 text-center">
                    {(idx + 1).toLocaleString("fa-IR")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
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

      {/* Commit button — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            {stats.present} حاضر • {stats.absent} غایب • {stats.late} تاخیر • {stats.excused} موجه
          </div>
          <Button
            onClick={handleCommit}
            disabled={submitting}
            size="lg"
            className="bg-emerald hover:bg-emerald-dark h-12 px-8 text-base gap-2 shadow-lg shadow-emerald/20"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                ثبت نهایی لیست
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
}: {
  label: string;
  value: number;
  color: "emerald" | "destructive" | "warning" | "info";
}) {
  const colorMap = {
    emerald: "bg-emerald/10 text-emerald border-emerald/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-info/10 text-info border-info/20",
  };
  return (
    <div className={cn("rounded-xl border p-3 text-center", colorMap[color])}>
      <div className="text-2xl font-bold">{value.toLocaleString("fa-IR")}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
