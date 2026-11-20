"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceToggle, type AttendanceState } from "@/components/teacher/attendance-toggle";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { toast } from "sonner";
import {
  Loader2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  CalendarDays,
  DoorClosed,
  Check,
  Send,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tehranDateKey } from "@/lib/timetable/tehran-time";

interface SlotItem {
  id: string;
  dayOfWeek: number;
  subjectTitle: string;
  teacherName: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
}

interface ClassroomSummary {
  id: string;
  name: string;
  gradeLevel: string;
  major: string | null;
  studentCount: number;
  slots: SlotItem[];
}

interface StudentItem {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nationalCode: string;
  phoneNumber?: string;
  guardianPhone1?: string;
  guardianPhone2?: string;
  status: AttendanceState;
}

export function AdminAttendanceDialog({
  open,
  onOpenChange,
  initialClassroomId,
  initialSlotId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClassroomId?: string;
  initialSlotId?: string;
  onSuccess?: () => void;
}) {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(initialClassroomId || "");
  const [selectedDate, setSelectedDate] = useState<string>(tehranDateKey());
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(initialSlotId || "");

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync initial props when opened
  useEffect(() => {
    if (open) {
      if (initialClassroomId) setSelectedClassroomId(initialClassroomId);
      if (initialSlotId) setSelectedSlotId(initialSlotId);
      loadClassrooms();
    }
  }, [open, initialClassroomId, initialSlotId]);

  // Load classrooms list
  const loadClassrooms = async () => {
    setLoadingClassrooms(true);
    try {
      const res = await fetch("/api/v1/attendance/classrooms", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setClassrooms(data.classrooms || []);
        // Auto-select first classroom if none selected
        if (!selectedClassroomId && data.classrooms?.length > 0) {
          setSelectedClassroomId(data.classrooms[0].id);
        }
      }
    } catch (err) {
      console.error("[LOAD_CLASSROOMS_ERROR]", err);
      toast.error("خطا در دریافت لیست کلاس‌ها.");
    } finally {
      setLoadingClassrooms(false);
    }
  };

  // Load students and slots for selected classroom
  const loadClassroomData = useCallback(async (classroomId: string, date: string) => {
    if (!classroomId) return;
    setLoadingStudents(true);
    try {
      const res = await fetch(
        `/api/v1/attendance/classrooms?classroomId=${classroomId}&date=${date}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.ok) {
        const loadedSlots: SlotItem[] = data.slots || [];
        setSlots(loadedSlots);

        // Auto-select slot if not set or invalid for this class
        if (loadedSlots.length > 0) {
          const match = loadedSlots.find((s) => s.id === selectedSlotId);
          if (!match) {
            setSelectedSlotId(loadedSlots[0].id);
          }
        } else {
          setSelectedSlotId("");
        }

        // Map students
        const loadedStudents: StudentItem[] = (data.students || []).map((st: any) => ({
          id: st.id,
          enrollmentId: st.enrollmentId,
          firstName: st.firstName,
          lastName: st.lastName,
          fullName: st.fullName,
          nationalCode: st.nationalCode,
          phoneNumber: st.phoneNumber,
          guardianPhone1: st.guardianPhone1,
          guardianPhone2: st.guardianPhone2,
          status: (st.initialAttendance as AttendanceState) || "PRESENT",
        }));
        setStudents(loadedStudents);
      } else {
        toast.error(data.error || "خطا در بارگذاری دانش‌آموزان کلاس.");
      }
    } catch (err) {
      console.error("[LOAD_CLASSROOM_DATA_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSlotId]);

  useEffect(() => {
    if (open && selectedClassroomId) {
      loadClassroomData(selectedClassroomId, selectedDate);
    }
  }, [open, selectedClassroomId, selectedDate, loadClassroomData]);

  // Statistics
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    for (const s of students) {
      if (s.status === "PRESENT") present++;
      else if (s.status === "ABSENT") absent++;
    }
    return { total: students.length, present, absent };
  }, [students]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nationalCode.includes(q) ||
        (s.guardianPhone1 && s.guardianPhone1.includes(q))
    );
  }, [students, searchQuery]);

  // Toggle student status
  const handleToggle = (studentId: string, nextStatus: AttendanceState) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: nextStatus } : s))
    );
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "PRESENT" })));
    toast.info("همه دانش‌آموزان این کلاس حاضر علامت‌گذاری شدند.");
  };

  // Submit attendance
  const handleSubmit = async () => {
    if (!selectedSlotId) {
      toast.error("لطفاً یک زنگ یا درس مشخص کنید.");
      return;
    }
    if (students.length === 0) {
      toast.error("هیچ دانش‌آموزی در این کلاس ثبت‌نام نشده است.");
      return;
    }

    setSubmitting(true);
    const absentees = students
      .filter((s) => s.status === "ABSENT")
      .map((s) => s.id);

    try {
      const res = await fetch("/api/v1/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetableSlotId: selectedSlotId,
          date: selectedDate,
          absentees,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(
          `حضور و غیاب با موفقیت ثبت شد. (${stats.present.toLocaleString("fa-IR")} حاضر، ${stats.absent.toLocaleString("fa-IR")} غایب)`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "خطا در ثبت حضور و غیاب.");
      }
    } catch (err) {
      console.error("[SUBMIT_ATTENDANCE_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClassroomObj = classrooms.find((c) => c.id === selectedClassroomId);
  const selectedSlotObj = slots.find((s) => s.id === selectedSlotId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-slate-50/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-navy flex items-center gap-2">
                <DoorClosed className="h-5 w-5 text-navy/80" />
                <span>ثبت حضور و غیاب کلاسی (مدیریت / ناظم)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                ثبت و بازبینی فوری حضور و غیاب برای هر کلاس دلخواه مدرسه با درج رسمی در تاریخچه و صدور پیامک به اولیاء
              </DialogDescription>
            </div>
            {/* Quick counters */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/30 text-xs">
                {stats.present.toLocaleString("fa-IR")} حاضر
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                {stats.absent.toLocaleString("fa-IR")} غایب
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Filters Strip */}
        <div className="p-3 sm:p-4 border-b bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          {/* 1. Classroom Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-navy">انتخاب کلاس درس</Label>
            <Select
              value={selectedClassroomId}
              onValueChange={(val) => {
                setSelectedClassroomId(val);
              }}
              disabled={loadingClassrooms || submitting}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="انتخاب کلاس..." />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.gradeLevel} {c.name} ({c.studentCount.toLocaleString("fa-IR")} نفر)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Slot / Subject Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-navy">درس و زنگ</Label>
            <Select
              value={selectedSlotId}
              onValueChange={setSelectedSlotId}
              disabled={slots.length === 0 || loadingStudents || submitting}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="انتخاب زنگ / درس..." />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.bellTitle}: {s.subjectTitle} ({s.teacherName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Date Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-navy">تاریخ جلسه</Label>
            <PersianDatePicker
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              className="h-9 text-xs"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="جستجوی دانش‌آموز بر اساس نام یا کد ملی..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pr-8 text-xs bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllPresent}
              className="h-8 text-xs gap-1.5 text-emerald border-emerald/30 hover:bg-emerald/10 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>همه حاضر</span>
            </Button>
          </div>
        </div>

        {/* Students Table Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingStudents ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
              <span className="text-xs">در حال بارگذاری دانش‌آموزان...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold">هیچ دانش‌آموزی در این کلاس ثبت‌نام نشده است.</p>
              <p className="text-xs">لطفاً ابتدا دانش‌آموزان را به این کلاس تخصیص دهید.</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              دانش‌آموزی با عبارت «{searchQuery}» یافت نشد.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                    <th className="py-2.5 px-3 text-right">نام و نام خانوادگی</th>
                    <th className="py-2.5 px-3 text-center w-28 hidden sm:table-cell">کد ملی</th>
                    <th className="py-2.5 px-3 text-center w-32 hidden md:table-cell">شماره تماس ولی</th>
                    <th className="py-2.5 px-3 text-center w-40">وضعیت حضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStudents.map((st, idx) => {
                    const isAbsent = st.status === "ABSENT";
                    return (
                      <tr
                        key={st.id}
                        className={cn(
                          "transition-colors",
                          isAbsent ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-slate-50"
                        )}
                      >
                        <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                          {(idx + 1).toLocaleString("fa-IR")}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{st.fullName}</div>
                          <div className="sm:hidden text-[10px] text-muted-foreground font-mono mt-0.5">
                            کد ملی: {st.nationalCode}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground hidden sm:table-cell">
                          {st.nationalCode}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground hidden md:table-cell">
                          {st.guardianPhone1 || st.phoneNumber || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <AttendanceToggle
                            value={st.status}
                            onChange={(val) => handleToggle(st.id, val)}
                            size="sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t bg-slate-50 flex items-center justify-between sm:justify-between w-full">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>مجموع: <strong>{stats.total.toLocaleString("fa-IR")} نفر</strong></span>
            <span>•</span>
            <span className="text-emerald"><strong>{stats.present.toLocaleString("fa-IR")}</strong> حاضر</span>
            <span>•</span>
            <span className="text-destructive"><strong>{stats.absent.toLocaleString("fa-IR")}</strong> غایب</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || loadingStudents || students.length === 0}
              className="text-xs h-9 gap-1.5 bg-navy hover:bg-navy-dark text-white font-semibold cursor-pointer shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>در حال ثبت...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>ثبت نهایی حضور و غیاب</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
