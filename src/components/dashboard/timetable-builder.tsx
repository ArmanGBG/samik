"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  CalendarClock,
  Trash2,
  AlertTriangle,
  DoorClosed,
  BookOpen,
  Users,
  Clock,
  GraduationCap,
  Pencil,
} from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/timetable/days";
import { hhmmToPersian } from "@/lib/timetable/time-utils";
import { TEHRAN_TIME_ZONE, zonedDateKeyFor } from "@/lib/timetable/tehran-time";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

interface Classroom { id: string; gradeLevel: string; name: string; }
interface Subject { id: string; title: string; }
interface Teacher { id: string; firstName: string; lastName: string; fullName: string; slotCount?: number; }
interface Bell { id: string; title: string; startTime: string; endTime: string; }
interface Slot {
  id: string;
  classRoom: { id: string; name: string; gradeLevel: string };
  subject: { id: string; title: string };
  teacher: { id: string; firstName: string; lastName: string };
  bellSchedule: { id: string; title: string; startTime: string; endTime: string };
  dayOfWeek: number;
  weekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS" | "SINGLE_SESSION";
  specificDate?: string | null;
}

const WEEK_TYPES = [
  { value: "ALL_WEEKS", label: "هر هفته", short: "همه" },
  { value: "ODD_WEEKS", label: "هفته‌های فرد", short: "فرد" },
  { value: "EVEN_WEEKS", label: "هفته‌های زوج", short: "زوج" },
  { value: "SINGLE_SESSION", label: "فقط یک جلسه (تاریخ مشخص)", short: "تک‌جلسه" },
];

// Tinted backgrounds per week type — used on slot cards + legend badges.
const WEEK_TYPE_TINT: Record<string, string> = {
  ALL_WEEKS: "bg-emerald/10 text-emerald border-emerald/30",
  ODD_WEEKS: "bg-info/10 text-info border-info/30",
  EVEN_WEEKS: "bg-warning/10 text-warning border-warning/30",
  SINGLE_SESSION: "bg-destructive/10 text-destructive border-destructive/30",
};

const WEEK_TYPE_LEGEND: Record<string, string> = {
  ALL_WEEKS: "bg-emerald/15 text-emerald border-emerald/30",
  ODD_WEEKS: "bg-info/15 text-info border-info/30",
  EVEN_WEEKS: "bg-warning/15 text-warning border-warning/30",
  SINGLE_SESSION: "bg-destructive/15 text-destructive border-destructive/30",
};

export function TimetableBuilder({
  schoolId,
  hideHeader = false,
}: {
  schoolId?: string;
  hideHeader?: boolean;
} = {}) {
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
    weekType: "ALL_WEEKS" as "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS" | "SINGLE_SESSION",
    specificDate: "",
  });

  // Edit slot state
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    subjectId: "",
    teacherUserId: "",
    bellScheduleId: "",
    dayOfWeek: 0,
    weekType: "ALL_WEEKS" as "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS" | "SINGLE_SESSION",
    specificDate: "",
  });

  // Filter state — classroom vs teacher view
  const [viewMode, setViewMode] = useState<"classroom" | "teacher">("classroom");
  const searchParams = useSearchParams();
  const [activeClassroom, setActiveClassroom] = useState<string>(searchParams?.get("classId") || "");
  const [activeTeacher, setActiveTeacher] = useState<string>("");

  async function loadAll() {
    setLoading(true);
    try {
      const qs = schoolId ? `?schoolId=${schoolId}` : "";
      const [slotR, clsR, subR, tchR, bellR] = await Promise.all([
        fetch(`/api/v1/deputy/timetable${qs}`).then((r) => r.json()),
        fetch(`/api/v1/principal/classrooms${qs}`).then((r) => r.json()),
        fetch(`/api/v1/principal/subjects${qs}`).then((r) => r.json()),
        fetch(`/api/v1/deputy/teachers${qs}`).then((r) => r.json()),
        fetch(`/api/v1/principal/bell-schedules${qs}`).then((r) => r.json()),
      ]);
      if (slotR.ok) setSlots(slotR.slots);
      if (clsR.ok) {
        setClassrooms(clsR.classrooms);
        if (!activeClassroom && !searchParams?.get("classId") && clsR.classrooms.length > 0) {
          setActiveClassroom(clsR.classrooms[0].id);
        }
      }
      if (subR.ok) setSubjects(subR.subjects);
      if (tchR.ok) {
        setTeachers(tchR.teachers);
        if (!activeTeacher && tchR.teachers.length > 0) {
          setActiveTeacher(tchR.teachers[0].id);
        }
      }
      if (bellR.ok) setBells(bellR.bellSchedules);
    } catch (err) {
      console.error("[TIMETABLE_LOAD_ERROR]", err);
      toast.error("خطا در بارگذاری برنامه هفتگی.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [schoolId]);

  // Group slots for active classroom or active teacher: Map<dayOfWeek, Map<bellId, Slot[]>>
  const grid = useMemo(() => {
    const m = new Map<number, Map<string, Slot[]>>();
    for (const d of DAYS_OF_WEEK) m.set(d.value, new Map());
    for (const b of bells) {
      for (const d of DAYS_OF_WEEK) {
        m.get(d.value)!.set(b.id, []);
      }
    }
    for (const s of slots) {
      if (viewMode === "classroom") {
        if (s.classRoom.id !== activeClassroom) continue;
      } else {
        if (s.teacher.id !== activeTeacher) continue;
      }
      const dayMap = m.get(s.dayOfWeek);
      if (!dayMap) continue;
      const list = dayMap.get(s.bellSchedule.id);
      if (list) list.push(s);
    }
    return m;
  }, [slots, activeClassroom, activeTeacher, bells, viewMode]);

  // Derived summary stats
  const summary = useMemo(() => {
    const filtered =
      viewMode === "classroom"
        ? slots.filter((s) => s.classRoom.id === activeClassroom)
        : slots.filter((s) => s.teacher.id === activeTeacher);
    return {
      total: filtered.length,
      oddOnly: filtered.filter((s) => s.weekType === "ODD_WEEKS").length,
      evenOnly: filtered.filter((s) => s.weekType === "EVEN_WEEKS").length,
      uniqueTeachers: new Set(filtered.map((s) => s.teacher.id)).size,
      uniqueClasses: new Set(filtered.map((s) => s.classRoom.id)).size,
    };
  }, [slots, activeClassroom, activeTeacher, viewMode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const qs = schoolId ? `?schoolId=${schoolId}` : "";
      const r = await fetch(`/api/v1/deputy/timetable${qs}`, {
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
        specificDate: "",
      });
      loadAll();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("حذف این خانه برنامه هفتگی؟")) return;
    try {
      const qs = schoolId ? `&schoolId=${schoolId}` : "";
      const r = await fetch(`/api/v1/deputy/timetable?id=${id}${qs}`, { method: "DELETE" });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "حذف ناموفق بود.");
        return;
      }
      toast.success("حذف شد.");
      loadAll();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  function openEditDialog(slot: Slot) {
    setEditingSlot(slot);
    setEditForm({
      subjectId: slot.subject.id,
      teacherUserId: slot.teacher.id,
      bellScheduleId: slot.bellSchedule.id,
      dayOfWeek: slot.dayOfWeek,
      weekType: slot.weekType,
      specificDate: slot.specificDate ? zonedDateKeyFor(new Date(slot.specificDate)) : "",
    });
  }

  async function onEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingSlot) return;
    setEditSubmitting(true);
    try {
      const qs = schoolId ? `&schoolId=${schoolId}` : "";
      const r = await fetch(`/api/v1/deputy/timetable?id=${editingSlot.id}${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const d = await r.json();
      if (!d.ok) {
        if (d.conflict) {
          toast.error(
            `${d.error} — مدرسه «${d.conflict.schoolName}»، کلاس ${d.conflict.classroomName}، درس ${d.conflict.subjectTitle}`,
            { duration: 8000 }
          );
        } else {
          toast.error(d.error ?? "ویرایش ناموفق بود.");
        }
        return;
      }
      toast.success("خانه برنامه ویرایش شد.");
      setEditingSlot(null);
      loadAll();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  // Empty-state checks — pre-reqs not yet set up by principal.
  if (classrooms.length === 0 || subjects.length === 0 || teachers.length === 0 || bells.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="برنامه هفتگی"
          subtitle="تخصیص درس و معلم به کلاس‌ها — با تشخیص خودکار تداخل دبیران."
          icon={CalendarClock}
        />
        <ScrollReveal>
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
        </ScrollReveal>
      </div>
    );
  }

  const activeClassroomObj = classrooms.find((c) => c.id === activeClassroom);
  const activeTeacherObj = teachers.find((t) => t.id === activeTeacher);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (open) {
            setForm((f) => ({
              ...f,
              classRoomId: viewMode === "classroom" ? (f.classRoomId || activeClassroom) : f.classRoomId,
              teacherUserId: viewMode === "teacher" ? (f.teacherUserId || activeTeacher) : f.teacherUserId,
            }));
          }
        }}
      >
        {!hideHeader && (
          <PageHeader
            title="برنامه هفتگی"
            subtitle="تخصیص درس و معلم به کلاس‌ها — با تشخیص خودکار تداخل دبیران."
            icon={CalendarClock}
            actions={
              <DialogTrigger asChild>
                <Button className="bg-emerald hover:bg-emerald-dark gap-2 shadow-sm cursor-pointer">
                  <Plus className="h-4 w-4" />
                  افزودن درس به برنامه هفتگی
                </Button>
              </DialogTrigger>
            }
          />
        )}
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
                    <Label className="text-xs font-medium">کلاس</Label>
                    <Select
                      value={form.classRoomId || activeClassroom}
                      onValueChange={(v) => setForm({ ...form, classRoomId: v })}
                    >
                      <SelectTrigger className="h-9">
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
                      <Label className="text-xs font-medium">درس</Label>
                      <Select
                        value={form.subjectId}
                        onValueChange={(v) => setForm({ ...form, subjectId: v })}
                      >
                        <SelectTrigger className="h-9">
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
                      <Label className="text-xs font-medium">معلم</Label>
                      <Select
                        value={form.teacherUserId}
                        onValueChange={(v) => setForm({ ...form, teacherUserId: v })}
                      >
                        <SelectTrigger className="h-9">
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
                      <Label className="text-xs font-medium">زنگ</Label>
                      <Select
                        value={form.bellScheduleId}
                        onValueChange={(v) => setForm({ ...form, bellScheduleId: v })}
                      >
                        <SelectTrigger className="h-9">
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
                      <Label className="text-xs font-medium">روز هفته</Label>
                      <Select
                        value={String(form.dayOfWeek)}
                        onValueChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v, 10) })}
                      >
                        <SelectTrigger className="h-9">
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
                    <Label className="text-xs font-medium">نوع هفته</Label>
                    <Select
                      value={form.weekType}
                      onValueChange={(v) => setForm({ ...form, weekType: v as any })}
                    >
                      <SelectTrigger className="h-9">
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
                  {form.weekType === "SINGLE_SESSION" && (
                    <div className="space-y-1.5 col-span-2 mt-2">
                      <Label className="text-xs font-medium text-destructive">تاریخ برگزاری (تک‌جلسه)</Label>
                      <PersianDatePicker
                        value={form.specificDate || null}
                        onChange={(isoDate) => {
                          const updates: any = { specificDate: isoDate };
                          if (isoDate) {
                            const d = new Date(isoDate);
                            if (!isNaN(d.getTime())) {
                              updates.dayOfWeek = (d.getDay() + 1) % 7;
                            }
                          }
                          setForm({ ...form, ...updates });
                        }}
                        placeholder="انتخاب تاریخ"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    type="submit"
                    disabled={submitting || !form.classRoomId || !form.subjectId || !form.teacherUserId || !form.bellScheduleId}
                    className="bg-emerald hover:bg-emerald-dark gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال بررسی تداخل زمانی و ثبت...
                      </>
                    ) : (
                      "تأیید و ثبت در برنامه هفتگی"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
      </Dialog>

      {/* Classroom / Teacher selector — compact dual button group */}
      <ScrollReveal>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm text-navy flex items-center gap-2">
                {viewMode === "classroom" ? (
                  <>
                    <DoorClosed className="h-4 w-4" />
                    <span>برنامه هفتگی کلاس‌ها:</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-4 w-4" />
                    <span>برنامه کاری معلمان:</span>
                  </>
                )}
              </CardTitle>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode("classroom")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1",
                    viewMode === "classroom"
                      ? "bg-white text-navy shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-navy"
                  )}
                >
                  <DoorClosed className="h-3.5 w-3.5" />
                  <span>بر اساس کلاس</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("teacher")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1",
                    viewMode === "teacher"
                      ? "bg-white text-navy shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-navy"
                  )}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>بر اساس معلم</span>
                </button>
              </div>
            </div>
            {hideHeader && (
              <Button
                size="sm"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    classRoomId: viewMode === "classroom" ? (f.classRoomId || activeClassroom) : f.classRoomId,
                    teacherUserId: viewMode === "teacher" ? (f.teacherUserId || activeTeacher) : f.teacherUserId,
                  }));
                  setDialogOpen(true);
                }}
                className="bg-emerald hover:bg-emerald-dark gap-1.5 shadow-sm cursor-pointer text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن درس به برنامه
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {viewMode === "classroom" ? (
              <div className="flex flex-wrap gap-1.5">
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={activeClassroom === c.id}
                    aria-label={`نمایش برنامه هفتگی کلاس ${c.gradeLevel} ${c.name}`}
                    onClick={() => setActiveClassroom(c.id)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30",
                      activeClassroom === c.id
                        ? "bg-navy text-white border-navy shadow-sm"
                        : "border-border bg-white hover:border-navy/50 hover:bg-muted/40"
                    )}
                  >
                    {c.gradeLevel} {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teachers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">هنوز معلمی برای این مدرسه ثبت نشده است.</p>
                ) : (
                  teachers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={activeTeacher === t.id}
                      aria-label={`نمایش برنامه کاری معلم ${t.fullName}`}
                      onClick={() => setActiveTeacher(t.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 flex items-center gap-1.5",
                        activeTeacher === t.id
                          ? "bg-navy text-white border-navy shadow-sm"
                          : "border-border bg-white hover:border-navy/50 hover:bg-muted/40"
                      )}
                    >
                      <span>{t.fullName}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full tabular-nums",
                          activeTeacher === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {t.slotCount ?? 0} زنگ
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Timetable grid */}
      <ScrollReveal delay={60}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-navy tabular-nums">
              {viewMode === "classroom"
                ? `شبکه برنامه هفتگی — کلاس ${activeClassroomObj?.gradeLevel ?? ""} ${activeClassroomObj?.name ?? ""}`
                : `شبکه برنامه هفتگی — ${activeTeacherObj?.fullName ?? "معلم"}`}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3">
              {WEEK_TYPES.map((w) => (
                <span key={w.value} className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("h-5 px-2 text-[10px] font-medium", WEEK_TYPE_LEGEND[w.value])}
                  >
                    {w.short}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{w.label}</span>
                </span>
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-auto rounded-lg border max-h-[32rem]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky-table-header">
                  <tr className="bg-muted/60">
                    <th
                      className="border-l border-border p-1.5 text-right font-medium text-muted-foreground sticky right-0 z-[5] bg-muted/60 min-w-[120px]"
                    >
                      زنگ / روز
                    </th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th
                        key={d.value}
                        className={cn(
                          "border-l border-border p-1.5 text-center min-w-[140px] last:border-l-0",
                          d.isWeekend && "bg-warning/5"
                        )}
                      >
                        <div className="font-semibold text-foreground text-xs">{d.persianName}</div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">{d.englishName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bells.map((bell, idx) => (
                    <tr key={bell.id} className={cn("data-table-row", idx % 2 === 0 ? "bg-white" : "bg-muted/20")}>
                      <td className="border-l border-border p-1.5 sticky right-0 z-[5] bg-inherit">
                        <div className="font-medium text-navy text-xs">{bell.title}</div>
                        <div dir="ltr" className="text-[10px] text-muted-foreground font-mono tabular-nums">
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm({
                                      classRoomId: viewMode === "classroom" ? activeClassroom : "",
                                      subjectId: "",
                                      teacherUserId: viewMode === "teacher" ? activeTeacher : "",
                                      bellScheduleId: bell.id,
                                      dayOfWeek: d.value,
                                      weekType: "ALL_WEEKS",
                                      specificDate: "",
                                    });
                                    setDialogOpen(true);
                                  }}
                                  className="w-full flex items-center justify-center py-3 rounded-md border border-dashed border-border/40 text-muted-foreground/30 hover:border-navy/40 hover:text-navy/50 hover:bg-navy/5 transition-all cursor-pointer group/add"
                                  aria-label={`افزودن درس برای ${d.persianName} — ${bell.title}`}
                                >
                                  <Plus className="h-3.5 w-3.5 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                                </button>
                              ) : (
                                cellSlots.map((s) => (
                                  <div
                                    key={s.id}
                                    className={cn(
                                      "kpi-card rounded-md border p-1.5 text-xs space-y-1 group cursor-pointer",
                                      WEEK_TYPE_TINT[s.weekType]
                                    )}
                                    onClick={() => openEditDialog(s)}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="font-semibold leading-tight">
                                        {s.subject.title}
                                      </div>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); openEditDialog(s); }}
                                                className="text-navy hover:bg-navy/10 rounded p-0.5 cursor-pointer"
                                                aria-label="ویرایش این درس"
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top"><span>ویرایش</span></TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                                                className="text-destructive hover:bg-destructive/10 rounded p-0.5 cursor-pointer"
                                                aria-label="حذف این درس از برنامه هفتگی"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top"><span>حذف</span></TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] opacity-80">
                                      {viewMode === "classroom" ? (
                                        <>
                                          <GraduationCap className="h-3 w-3" />
                                          <span>{s.teacher.firstName} {s.teacher.lastName}</span>
                                        </>
                                      ) : (
                                        <>
                                          <DoorClosed className="h-3 w-3" />
                                          <span>کلاس {s.classRoom.gradeLevel} {s.classRoom.name}</span>
                                        </>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-medium">
                                      {s.weekType === "SINGLE_SESSION" && s.specificDate ? new Date(s.specificDate).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', timeZone: TEHRAN_TIME_ZONE }) : WEEK_TYPES.find((w) => w.value === s.weekType)?.short}
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

            {/* Summary stats — KpiCardGrid */}
            <div className="mt-4">
              <KpiCardGrid
                cards={[
                  {
                    label: viewMode === "classroom" ? "کل خانه‌های این کلاس" : "کل زنگ‌های تدریس هفتگی",
                    value: summary.total,
                    icon: viewMode === "classroom" ? DoorClosed : CalendarClock,
                    tint: "navy",
                  },
                  {
                    label: "دروس منحصراً فرد",
                    value: summary.oddOnly,
                    icon: BookOpen,
                    tint: "info",
                  },
                  {
                    label: "دروس منحصراً زوج",
                    value: summary.evenOnly,
                    icon: Clock,
                    tint: "warning",
                  },
                  viewMode === "classroom"
                    ? {
                        label: "معلمان منحصراً درگیر",
                        value: summary.uniqueTeachers,
                        icon: Users,
                        tint: "emerald",
                      }
                    : {
                        label: "کلاس‌های تحت آموزش",
                        value: summary.uniqueClasses,
                        icon: DoorClosed,
                        tint: "emerald",
                      },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* ── Edit Slot Dialog ── */}
      <Dialog open={!!editingSlot} onOpenChange={(open) => { if (!open) setEditingSlot(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش خانه برنامه هفتگی</DialogTitle>
            <DialogDescription>
              {editingSlot && (
                <span>
                  کلاس {editingSlot.classRoom.gradeLevel} {editingSlot.classRoom.name} — روز {DAYS_OF_WEEK.find(d => d.value === editingSlot.dayOfWeek)?.persianName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onEdit}>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">درس</Label>
                  <Select value={editForm.subjectId} onValueChange={(v) => setEditForm({ ...editForm, subjectId: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="انتخاب درس..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">معلم</Label>
                  <Select value={editForm.teacherUserId} onValueChange={(v) => setEditForm({ ...editForm, teacherUserId: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="انتخاب معلم..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">زنگ</Label>
                  <Select value={editForm.bellScheduleId} onValueChange={(v) => setEditForm({ ...editForm, bellScheduleId: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="انتخاب زنگ..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bells.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title} ({b.startTime}–{b.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">نوع هفته</Label>
                  <Select value={editForm.weekType} onValueChange={(v) => setEditForm({ ...editForm, weekType: v as typeof editForm.weekType })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEK_TYPES.map((w) => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  {editForm.weekType === "SINGLE_SESSION" && (
                    <div className="space-y-1.5 col-span-2 mt-2">
                      <Label className="text-xs font-medium text-destructive">تاریخ برگزاری (تک‌جلسه)</Label>
                      <PersianDatePicker
                        value={editForm.specificDate || null}
                        onChange={(isoDate) => setEditForm({ ...editForm, specificDate: isoDate })}
                        placeholder="انتخاب تاریخ"
                      />
                    </div>
                  )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">روز هفته</Label>
                <Select
                  value={String(editForm.dayOfWeek)}
                  onValueChange={(v) => setEditForm({ ...editForm, dayOfWeek: Number(v) })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.filter(d => !d.isWeekend).map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.persianName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2 flex-row-reverse justify-start">
              <Button type="submit" disabled={editSubmitting} className="bg-navy hover:bg-navy-dark gap-2">
                {editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                ذخیره تغییرات
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingSlot(null)}>
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between items-center p-2 rounded-lg border bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={count > 0 ? "default" : "destructive"} className="tabular-nums">
        {count.toLocaleString("fa-IR")}
      </Badge>
    </div>
  );
}

// 1790851938
