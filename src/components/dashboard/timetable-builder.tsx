"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Calendar,
  Trash2,
  AlertTriangle,
  DoorClosed,
  BookOpen,
  Users,
  Clock,
  GraduationCap,
} from "lucide-react";
import { DAYS_OF_WEEK, dayToPersian } from "@/lib/timetable/days";
import { hhmmToPersian } from "@/lib/timetable/time-utils";
import { cn } from "@/lib/utils";

interface Classroom { id: string; gradeLevel: string; name: string; }
interface Subject { id: string; title: string; }
interface Teacher { id: string; firstName: string; lastName: string; fullName: string; }
interface Bell { id: string; title: string; startTime: string; endTime: string; }
interface Slot {
  id: string;
  classRoom: { id: string; name: string; gradeLevel: string };
  subject: { id: string; title: string };
  teacher: { id: string; firstName: string; lastName: string };
  bellSchedule: { id: string; title: string; startTime: string; endTime: string };
  dayOfWeek: number;
  weekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS";
}

const WEEK_TYPES = [
  { value: "ALL_WEEKS", label: "هر هفته", short: "همه" },
  { value: "ODD_WEEKS", label: "هفته‌های فرد", short: "فرد" },
  { value: "EVEN_WEEKS", label: "هفته‌های زوج", short: "زوج" },
];

const WEEK_TYPE_TINT: Record<string, string> = {
  ALL_WEEKS: "bg-emerald/10 text-emerald border-emerald/30",
  ODD_WEEKS: "bg-info/10 text-info border-info/30",
  EVEN_WEEKS: "bg-warning/10 text-warning border-warning/30",
};

export function TimetableBuilder() {
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [bells, setBells] = useState<Bell[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    classRoomId: "",
    subjectId: "",
    teacherUserId: "",
    bellScheduleId: "",
    dayOfWeek: 0,
    weekType: "ALL_WEEKS" as "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS",
  });

  // Filter state — focus on a single classroom for the grid view
  const [activeClassroom, setActiveClassroom] = useState<string>("");

  async function loadAll() {
    setLoading(true);
    try {
      const [slotR, clsR, subR, tchR, bellR] = await Promise.all([
        fetch("/api/v1/deputy/timetable").then((r) => r.json()),
        fetch("/api/v1/principal/classrooms").then((r) => r.json()),
        fetch("/api/v1/principal/subjects").then((r) => r.json()),
        fetch("/api/v1/deputy/teachers").then((r) => r.json()),
        fetch("/api/v1/principal/bell-schedules").then((r) => r.json()),
      ]);
      if (slotR.ok) setSlots(slotR.slots);
      if (clsR.ok) {
        setClassrooms(clsR.classrooms);
        if (!activeClassroom && clsR.classrooms.length > 0) {
          setActiveClassroom(clsR.classrooms[0].id);
        }
      }
      if (subR.ok) setSubjects(subR.subjects);
      if (tchR.ok) setTeachers(tchR.teachers);
      if (bellR.ok) setBells(bellR.bellSchedules);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Group slots for the active classroom: Map<dayOfWeek, Map<bellId, Slot[]>>
  const grid = useMemo(() => {
    const m = new Map<number, Map<string, Slot[]>>();
    for (const d of DAYS_OF_WEEK) m.set(d.value, new Map());
    for (const b of bells) {
      for (const d of DAYS_OF_WEEK) {
        m.get(d.value)!.set(b.id, []);
      }
    }
    for (const s of slots) {
      if (s.classRoom.id !== activeClassroom) continue;
      const dayMap = m.get(s.dayOfWeek);
      if (!dayMap) continue;
      const list = dayMap.get(s.bellSchedule.id);
      if (list) list.push(s);
    }
    return m;
  }, [slots, activeClassroom, bells]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/deputy/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!d.ok) {
        if (d.conflict) {
          // Conflict — show details
          toast.error(
            `${d.error} — مدرسه «${d.conflict.schoolName}»، کلاس ${d.conflict.classroomName}، درس ${d.conflict.subjectTitle}`,
            { duration: 8000 }
          );
        } else {
          toast.error(d.error ?? "ثبت ناموفق بود.");
        }
        return;
      }
      toast.success("خانه برنامه ثبت شد.");
      setDialogOpen(false);
      setForm({
        classRoomId: activeClassroom,
        subjectId: "",
        teacherUserId: "",
        bellScheduleId: "",
        dayOfWeek: 0,
        weekType: "ALL_WEEKS",
      });
      loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("حذف این خانه برنامه هفتگی؟")) return;
    const r = await fetch(`/api/v1/deputy/timetable?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!d.ok) {
      toast.error(d.error ?? "حذف ناموفق بود.");
      return;
    }
    toast.success("حذف شد.");
    loadAll();
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  // Empty-state checks
  if (classrooms.length === 0 || subjects.length === 0 || teachers.length === 0 || bells.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              پیش‌نیازها تکمیل نشده‌اند
            </CardTitle>
            <CardDescription>
              برای ساخت برنامه هفتگی، ابتدا باید مدیر مدرسه کلاس‌ها، دروس، زنگ‌ها و
              معلمان را ثبت کرده باشد.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatusRow label="کلاس‌ها" count={classrooms.length} />
              <StatusRow label="دروس" count={subjects.length} />
              <StatusRow label="معلمان" count={teachers.length} />
              <StatusRow label="زنگ‌ها" count={bells.length} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            برنامه هفتگی
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تخصیص درس و معلم به کلاس‌ها — با تشخیص خودکار تداخل دبیران.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald hover:bg-emerald-dark">
              <Plus className="h-4 w-4 ml-2" />
              افزودن خانه برنامه
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-navy">افزودن خانه برنامه جدید</DialogTitle>
              <DialogDescription>
                در صورت تداخل زمانی معلم در مدرسه‌ای دیگر، خطای 409 نمایش داده می‌شود.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit}>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>کلاس</Label>
                  <Select
                    value={form.classRoomId || activeClassroom}
                    onValueChange={(v) => setForm({ ...form, classRoomId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب کلاس..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.gradeLevel} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>درس</Label>
                    <Select
                      value={form.subjectId}
                      onValueChange={(v) => setForm({ ...form, subjectId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب درس..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>معلم</Label>
                    <Select
                      value={form.teacherUserId}
                      onValueChange={(v) => setForm({ ...form, teacherUserId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب معلم..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>زنگ</Label>
                    <Select
                      value={form.bellScheduleId}
                      onValueChange={(v) => setForm({ ...form, bellScheduleId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب زنگ..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bells.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.title} ({hhmmToPersian(b.startTime)}–{hhmmToPersian(b.endTime)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>روز هفته</Label>
                    <Select
                      value={String(form.dayOfWeek)}
                      onValueChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v, 10) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب روز..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>
                            {d.persianName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>نوع هفته</Label>
                  <Select
                    value={form.weekType}
                    onValueChange={(v) => setForm({ ...form, weekType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب نوع هفته..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_TYPES.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={submitting || !form.classRoomId || !form.subjectId || !form.teacherUserId || !form.bellScheduleId}
                  className="bg-emerald hover:bg-emerald-dark"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      در حال بررسی تداخل...
                    </>
                  ) : (
                    "ثبت خانه"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Classroom selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-navy flex items-center gap-2">
            <DoorClosed className="h-4 w-4" />
            نمایش برنامه کلاس:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {classrooms.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveClassroom(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all",
                  activeClassroom === c.id
                    ? "bg-navy text-white border-navy"
                    : "border-border bg-white hover:border-navy/50"
                )}
              >
                {c.gradeLevel} {c.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timetable grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-navy">
            شبکه برنامه هفتگی —{" "}
            {classrooms.find((c) => c.id === activeClassroom)?.gradeLevel}{" "}
            {classrooms.find((c) => c.id === activeClassroom)?.name}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Badge variant="outline" className={WEEK_TYPE_TINT.ALL_WEEKS}>همه</Badge>
              هر هفته
            </span>
            <span className="flex items-center gap-1.5">
              <Badge variant="outline" className={WEEK_TYPE_TINT.ODD_WEEKS}>فرد</Badge>
              هفته‌های فرد
            </span>
            <span className="flex items-center gap-1.5">
              <Badge variant="outline" className={WEEK_TYPE_TINT.EVEN_WEEKS}>زوج</Badge>
              هفته‌های زوج
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border-l border-border p-2 text-right sticky right-0 bg-muted/50 min-w-[120px]">
                    زنگ / روز
                  </th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th
                      key={d.value}
                      className={cn(
                        "border-l border-border p-2 text-center min-w-[160px] last:border-l-0",
                        d.isWeekend && "bg-warning/5"
                      )}
                    >
                      <div className="font-semibold">{d.persianName}</div>
                      <div className="text-xs text-muted-foreground">{d.englishName}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bells.map((bell, idx) => (
                  <tr key={bell.id} className={idx % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                    <td className="border-l border-border p-2 sticky right-0 bg-inherit">
                      <div className="font-medium text-navy">{bell.title}</div>
                      <div dir="ltr" className="text-xs text-muted-foreground font-mono">
                        {hhmmToPersian(bell.startTime)} – {hhmmToPersian(bell.endTime)}
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map((d) => {
                      const cellSlots = grid.get(d.value)?.get(bell.id) ?? [];
                      return (
                        <td
                          key={d.value}
                          className={cn(
                            "border-l border-border p-1.5 align-top last:border-l-0",
                            d.isWeekend && "bg-warning/5"
                          )}
                        >
                          <div className="space-y-1">
                            {cellSlots.length === 0 ? (
                              <div className="text-xs text-muted-foreground/40 text-center py-2">
                                —
                              </div>
                            ) : (
                              cellSlots.map((s) => (
                                <div
                                  key={s.id}
                                  className={cn(
                                    "rounded-md border p-1.5 text-xs space-y-1 group",
                                    WEEK_TYPE_TINT[s.weekType]
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="font-semibold leading-tight">
                                      {s.subject.title}
                                    </div>
                                    <button
                                      onClick={() => onDelete(s.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 rounded p-0.5"
                                      title="حذف"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] opacity-80">
                                    <GraduationCap className="h-3 w-3" />
                                    {s.teacher.firstName} {s.teacher.lastName}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                    {WEEK_TYPES.find((w) => w.value === s.weekType)?.short}
                                  </Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryStat
              icon={<DoorClosed className="h-4 w-4" />}
              label="کل خانه‌های این کلاس"
              value={slots.filter((s) => s.classRoom.id === activeClassroom).length}
            />
            <SummaryStat
              icon={<BookOpen className="h-4 w-4" />}
              label="دروس منحصراً فرد"
              value={slots.filter((s) => s.classRoom.id === activeClassroom && s.weekType === "ODD_WEEKS").length}
            />
            <SummaryStat
              icon={<Clock className="h-4 w-4" />}
              label="دروس منحصراً زوج"
              value={slots.filter((s) => s.classRoom.id === activeClassroom && s.weekType === "EVEN_WEEKS").length}
            />
            <SummaryStat
              icon={<Users className="h-4 w-4" />}
              label="معلمان منحصراً درگیر"
              value={new Set(slots.filter((s) => s.classRoom.id === activeClassroom).map((s) => s.teacher.id)).size}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between items-center p-2 rounded border bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={count > 0 ? "default" : "destructive"}>
        {count.toLocaleString("fa-IR")}
      </Badge>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold text-navy">
        {value.toLocaleString("fa-IR")}
      </div>
    </div>
  );
}
