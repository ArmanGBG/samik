"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Users,
  Send,
  Search,
  Star,
  CalendarDays,
  History,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { AttendanceToggle, type AttendanceState } from "@/components/teacher/attendance-toggle";
import { QuickPointButtons } from "@/components/teacher/quick-point-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { cn } from "@/lib/utils";
import { toPersianDateLong, toPersianDate } from "@/lib/date-utils";

interface AssessmentInfo {
  id: string;
  title: string;
  date: string;
  evaluationType: "NUMERIC" | "DESCRIPTIVE";
}

interface HistoricalGrade {
  assessmentId: string;
  numericScore: number | null;
  descriptiveScore: string | null;
  isAbsent: boolean;
}

interface SlotInfo {
  id: string;
  subjectTitle: string;
  subjectId: string;
  classroomName: string;
  classRoomId: string;
  isMerged?: boolean;
  mergedClassroomIds?: string[];
  mergedSlotIds?: string[];
  bellTitle: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  weekType: string;
  date: string; // YYYY-MM-DD
}

interface Student {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classroomName?: string;
  classRoomId?: string;
  attendanceState: AttendanceState;
  totalPoints: number;
  historicalGrades: HistoricalGrade[];
  grade: {
    numericScore: number | null;
    descriptiveScore: string | null;
    isAbsent: boolean;
  };
}

const DESCRIPTIVE_LABELS: Record<string, { label: string; tint: string }> = {
  EXCELLENT: { label: "عالی", tint: "bg-emerald-100 text-emerald-800" },
  GOOD: { label: "خوب", tint: "bg-blue-100 text-blue-800" },
  ACCEPTABLE: { label: "قابل قبول", tint: "bg-yellow-100 text-yellow-800" },
  NEEDS_IMPROVEMENT: { label: "نیاز به تلاش", tint: "bg-red-100 text-red-800" },
};

function scoreTint(score: number | null) {
  if (score === null) return "";
  if (score >= 18) return "text-emerald";
  if (score >= 15) return "text-blue-600";
  if (score >= 10) return "text-warning";
  return "text-destructive";
}

export default function UnifiedSessionPage() {
  const params = useParams<{ slotId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slot, setSlot] = useState<SlotInfo | null>(null);
  const [dailyAssessmentId, setDailyAssessmentId] = useState<string | null>(null);
  const [evaluationType, setEvaluationType] = useState<"NUMERIC" | "DESCRIPTIVE">("NUMERIC");
  const [recentAssessments, setRecentAssessments] = useState<AssessmentInfo[]>([]);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState("");
  const [newAssessmentDate, setNewAssessmentDate] = useState("");
  const [newAssessmentType, setNewAssessmentType] = useState<"NUMERIC" | "DESCRIPTIVE">("NUMERIC");
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  const handleCreateAssessment = async () => {
    if (!newAssessmentTitle.trim() || !newAssessmentDate || !slot) return;
    setCreatingAssessment(true);
    try {
      const res = await fetch("/api/v1/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: slot.classRoomId,
          subjectId: slot.subjectId,
          title: newAssessmentTitle,
          date: newAssessmentDate,
          evaluationType: newAssessmentType,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? "خطا در ایجاد ارزیابی.");
        return;
      }
      toast.success("ارزیابی با موفقیت ایجاد شد.");
      setIsCreateModalOpen(false);
      setNewAssessmentTitle("");
      setNewAssessmentDate("");
      // Redirect directly to the gradebook grid so they can enter grades!
      router.push(`/teacher/gradebook/${slot.classRoomId}?subjectId=${slot.subjectId}`);
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setCreatingAssessment(false);
    }
  };

  useEffect(() => {
    void loadSessionData();
  }, []);

  async function loadSessionData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/teacher/session/${params.slotId}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? "خطا در دریافت اطلاعات جلسه.");
        router.push("/teacher");
        return;
      }
      setSlot(data.slot);
      setDailyAssessmentId(data.dailyAssessmentId);
      setEvaluationType(data.evaluationType);
      setRecentAssessments(data.recentAssessments || []);
      setStudents(data.students);
    } catch (err) {
      console.error("[LOAD_SESSION_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    let present = 0, absent = 0;
    for (const s of students) {
      if (s.attendanceState === "PRESENT") present++;
      else if (s.attendanceState === "ABSENT") absent++;
      
    }
    return { present, absent, total: students.length };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(s => s.fullName.toLowerCase().includes(q));
  }, [students, searchQuery]);

  const updateStudentState = useCallback((studentId: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...updates } : s))
    );
  }, []);

  const handleGradeChange = async (studentId: string, value: string | number | null, isDescriptive = false) => {
    const numericScore = isDescriptive ? null : (value === "" || value === null ? null : parseFloat(value as string));
    const descriptiveScore = isDescriptive ? (value as string) : null;
    
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, grade: { ...s.grade, numericScore, descriptiveScore } };
      }
      return s;
    }));

    if (!isDescriptive && numericScore !== null && (isNaN(numericScore) || numericScore < 0 || numericScore > 20)) {
      toast.error("نمره باید بین ۰ تا ۲۰ باشد.");
      return;
    }

    try {
      let currentAssessmentId = dailyAssessmentId;
      
      if (!currentAssessmentId && slot) {
        const createRes = await fetch("/api/v1/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classRoomId: slot.classRoomId,
            subjectId: slot.subjectId,
            title: `فعالیت کلاسی ${toPersianDate(slot.date)}`,
            evaluationType: evaluationType,
            date: slot.date,
          }),
        });
        const createData = await createRes.json();
        if (createData.ok) {
          currentAssessmentId = createData.assessment.id;
          setDailyAssessmentId(currentAssessmentId);
        } else {
          toast.error("خطا در ایجاد ارزیابی کلاسی.");
          return;
        }
      }

      if (currentAssessmentId) {
        await fetch("/api/v1/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: currentAssessmentId,
            studentUserId: studentId,
            numericScore,
            descriptiveScore,
          }),
        });
      }
    } catch (err) {
      console.error("[SAVE_GRADE_ERROR]", err);
      toast.error("خطا در ذخیره نمره.");
    }
  };

  async function handleCommitAttendance() {
    if (!slot) return;
    setSubmitting(true);

    const absentees: string[] = [];
    
    for (const s of students) {
      if (s.attendanceState === "ABSENT") absentees.push(s.id);
      
    }

    const payload = {
      timetableSlotId: slot.id,
      date: slot.date,
      absentees,
      
    };

    try {
      const res = await fetch("/api/v1/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(
          `حضور و غیاب ثبت شد. (${stats.present.toLocaleString("fa-IR")} حاضر، ${stats.absent.toLocaleString("fa-IR")} غایب)`
        );
        router.push("/teacher");
      } else {
        toast.error(data.error ?? "خطا در ثبت حضور و غیاب.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (!slot) {
    if (!loading) router.replace("/teacher");
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-28">
      <PageHeader
        title={slot.subjectTitle}
        subtitle={
          <>
            {slot.classroomName} • {slot.bellTitle} •{" "}
            <span dir="ltr" className="font-mono tabular-nums inline-block mx-1">
              {slot.startTime}–{slot.endTime}
            </span>
          </>
        }
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald/30 hover:bg-emerald/5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">افزودن ارزیابی</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/teacher/gradebook/${slot.classRoomId}?subjectId=${slot.subjectId}`)}
              className="h-8 gap-1.5 text-xs text-navy border-navy hover:bg-navy/5 cursor-pointer hidden sm:flex"
            >
              <History className="h-4 w-4" />
              تاریخچه کل ترم
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/teacher")}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-muted/50 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-emerald" />
          <span className="font-medium">تاریخ جلسه:</span>
          <span>{toPersianDateLong(slot.date)}</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/teacher/gradebook/${slot.classRoomId}?subjectId=${slot.subjectId}`)}
            className="h-8 gap-1.5 text-xs text-navy border-navy hover:bg-navy/5 cursor-pointer sm:hidden"
          >
            <History className="h-4 w-4" />
            تاریخچه کل ترم
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium hidden sm:inline">نحوه ارزیابی امروز:</span>
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setEvaluationType("NUMERIC")}
                disabled={!!dailyAssessmentId && evaluationType !== "NUMERIC"}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors cursor-pointer",
                  evaluationType === "NUMERIC" ? "bg-white shadow-sm text-navy" : "text-muted-foreground",
                  !!dailyAssessmentId && evaluationType !== "NUMERIC" && "opacity-50 cursor-not-allowed"
                )}
              >
                کمی (۰-۲۰)
              </button>
              <button
                onClick={() => setEvaluationType("DESCRIPTIVE")}
                disabled={!!dailyAssessmentId && evaluationType !== "DESCRIPTIVE"}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors cursor-pointer",
                  evaluationType === "DESCRIPTIVE" ? "bg-white shadow-sm text-navy" : "text-muted-foreground",
                  !!dailyAssessmentId && evaluationType !== "DESCRIPTIVE" && "opacity-50 cursor-not-allowed"
                )}
              >
                کیفی (توصیفی)
              </button>
            </div>
          </div>
        </div>
      </div>

      {students.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">این کلاس در حال حاضر دانش‌آموز فعالی ندارد</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              ممکن است سال تحصیلی به پایان رسیده و پرونده‌های تحصیلی بایگانی شده باشند، یا هنوز دانش‌آموزی در این کلاس ثبت‌نام نشده باشد. تا زمان ثبت‌نام دانش‌آموزان امکان ثبت حضور و غیاب وجود ندارد.
            </p>
          </div>
        </div>
      )}

      <ScrollReveal delay={30}>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="جستجوی نام دانش‌آموز..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3 pr-9 h-11 bg-white/50 backdrop-blur-sm"
          />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <Card className="overflow-hidden border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto" dir="rtl">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3 sticky right-0 z-10 bg-muted/95 backdrop-blur shadow-[-4px_0_12px_rgba(0,0,0,0.03)] border-l border-border/50">نام دانش‌آموز</th>
                    <th className="p-3 whitespace-nowrap min-w-[200px] border-l border-border/50 text-center">حضور و غیاب امروز</th>
                    <th className="p-3 whitespace-nowrap min-w-[120px] border-l border-border/50 text-center">ثبت انضباط</th>
                    <th className="p-3 whitespace-nowrap min-w-[140px] border-l border-border/50 bg-emerald/5 text-center text-emerald-800">ارزیابی امروز</th>
                    
                    {/* Historical Columns */}
                    {recentAssessments.map(a => (
                      <th key={a.id} className="p-3 whitespace-nowrap min-w-[100px] text-center border-l border-border/50 font-normal">
                        <div className="font-medium text-navy truncate max-w-[120px]" title={a.title}>{a.title}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{toPersianDate(a.date)}</div>
                      </th>
                    ))}
                    
                    <th className="p-3 whitespace-nowrap text-center">میانگین ۳ هفته</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5 + recentAssessments.length} className="py-12 text-center text-muted-foreground">
                        {students.length === 0
                          ? "این کلاس در سال تحصیلی جاری دانش‌آموز فعالی ندارد یا سال تحصیلی به پایان رسیده و پرونده‌ها بایگانی شده‌اند."
                          : "دانش‌آموزی با این مشخصات یافت نشد."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      
                      // Calculate average for recent numeric grades
                      const nums = student.historicalGrades
                        .map(g => g.numericScore)
                        .filter(n => n !== null) as number[];
                      const avg = nums.length > 0 ? (nums.reduce((a,b)=>a+b, 0) / nums.length) : null;
                      
                      return (
                        <tr 
                          key={student.id}
                          className={cn(
                            "transition-colors hover:bg-muted/20",
                            student.attendanceState === "ABSENT" && "bg-destructive/5",
                            false
                          )}
                        >
                          <td className="p-3 sticky right-0 z-10 bg-inherit shadow-[-4px_0_12px_rgba(0,0,0,0.03)] border-l border-border/50">
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <span className="text-xs text-muted-foreground w-4 text-center font-mono tabular-nums opacity-60">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm text-navy">{student.fullName}</span>
                              {slot?.isMerged && student.classroomName && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-sky-50 text-sky-700 border-sky-200">
                                  {student.classroomName}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="mr-auto h-5 text-[10px] gap-1 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                                <Star className="h-3 w-3" />
                                {student.totalPoints.toLocaleString("fa-IR")}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3 text-center border-l border-border/50 align-middle">
                            <div className="flex justify-center">
                              <AttendanceToggle
                                value={student.attendanceState}
                                onChange={(next) => updateStudentState(student.id, { attendanceState: next })}
                                size="sm"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center border-l border-border/50 align-middle">
                            <div className="flex justify-center">
                              <QuickPointButtons
                                studentUserId={student.id}
                                studentName={student.fullName}
                                subjectId={slot?.subjectId ?? ""}
                                size="sm"
                                onSubmitted={(type) => {
                                  setStudents((prev) => prev.map((s) => {
                                    if (s.id === student.id) {
                                      return { ...s, totalPoints: s.totalPoints + (type === "POSITIVE" ? 1 : -1) };
                                    }
                                    return s;
                                  }));
                                }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center border-l border-border/50 bg-emerald/5 align-middle">
                            <div className="flex justify-center max-w-[120px] mx-auto">
                              {evaluationType === "NUMERIC" ? (
                                <Input
                                  type="number"
                                  placeholder="۲۰"
                                  className="h-8 text-center text-sm font-mono tabular-nums bg-white focus-visible:ring-emerald/40 border-emerald/20 shadow-sm"
                                  min={0}
                                  max={20}
                                  step={0.25}
                                  value={student.grade.numericScore === null ? "" : student.grade.numericScore}
                                  onChange={(e) => updateStudentState(student.id, { 
                                    grade: { ...student.grade, numericScore: e.target.value ? parseFloat(e.target.value) : null } 
                                  })}
                                  onBlur={(e) => handleGradeChange(student.id, e.target.value, false)}
                                />
                              ) : (
                                <select 
                                  className="h-8 w-full border border-emerald/20 rounded-md text-xs px-2 bg-white focus:ring-1 focus:ring-emerald outline-none shadow-sm cursor-pointer"
                                  value={student.grade.descriptiveScore ?? ""}
                                  onChange={(e) => handleGradeChange(student.id, e.target.value, true)}
                                >
                                  <option value="">انتخاب...</option>
                                  <option value="EXCELLENT">عالی</option>
                                  <option value="GOOD">خوب</option>
                                  <option value="ACCEPTABLE">قابل قبول</option>
                                  <option value="NEEDS_IMPROVEMENT">نیاز به تلاش</option>
                                </select>
                              )}
                            </div>
                          </td>
                          
                          {/* Historical Columns */}
                          {recentAssessments.map(a => {
                            const g = student.historicalGrades.find(hg => hg.assessmentId === a.id);
                            return (
                              <td key={a.id} className="p-3 text-center border-l border-border/50 align-middle">
                                {!g || (g.numericScore === null && g.descriptiveScore === null && !g.isAbsent) ? (
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                ) : g.isAbsent ? (
                                  <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/5 font-normal">غایب</Badge>
                                ) : a.evaluationType === "NUMERIC" && g.numericScore !== null ? (
                                  <span className={cn("text-sm font-bold tabular-nums", scoreTint(g.numericScore))}>
                                    {g.numericScore.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
                                  </span>
                                ) : g.descriptiveScore ? (
                                  <Badge variant="outline" className={cn("text-[10px] font-normal border-current", DESCRIPTIVE_LABELS[g.descriptiveScore]?.tint)}>
                                    {DESCRIPTIVE_LABELS[g.descriptiveScore]?.label}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-3 text-center font-bold tabular-nums align-middle">
                            {avg !== null ? avg.toLocaleString("fa-IR", { maximumFractionDigits: 2 }) : <span className="text-muted-foreground/30 font-normal">—</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Commit bar — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 justify-between">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald" />
            نمرات و امتیازات رفتار به‌صورت خودکار در پس‌زمینه ذخیره می‌شوند. نیازی به دکمه ثبت نمره نیست.
          </div>
          <Button
            onClick={handleCommitAttendance}
            disabled={submitting || students.length === 0}
            size="lg"
            className="w-full sm:w-auto bg-emerald hover:bg-emerald-dark h-11 px-8 text-sm font-bold gap-2 shadow-lg shadow-emerald/20 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            ثبت نهایی حضور و غیاب امروز
          </Button>
        </div>
      </div>


      {/* Create Assessment Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">افزودن ارزیابی جدید</DialogTitle>
            <DialogDescription>
              با ایجاد این ارزیابی، یک ستون جدید در دفتر نمره برای ثبت نمرات این آزمون ایجاد می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">عنوان ارزیابی (مثل: آزمون میان‌ترم)</label>
              <Input
                value={newAssessmentTitle}
                onChange={(e) => setNewAssessmentTitle(e.target.value)}
                placeholder="عنوان ارزیابی..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">تاریخ ارزیابی</label>
              <PersianDatePicker
                value={newAssessmentDate}
                onChange={setNewAssessmentDate}
                placeholder="انتخاب تاریخ..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع ارزیابی</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newAssessmentType === "NUMERIC" ? "default" : "outline"}
                  onClick={() => setNewAssessmentType("NUMERIC")}
                  className={cn("flex-1 cursor-pointer", newAssessmentType === "NUMERIC" && "bg-navy hover:bg-navy-light")}
                >
                  عددی (۰ تا ۲۰)
                </Button>
                <Button
                  type="button"
                  variant={newAssessmentType === "DESCRIPTIVE" ? "default" : "outline"}
                  onClick={() => setNewAssessmentType("DESCRIPTIVE")}
                  className={cn("flex-1 cursor-pointer", newAssessmentType === "DESCRIPTIVE" && "bg-navy hover:bg-navy-light")}
                >
                  توصیفی
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={handleCreateAssessment}
              disabled={creatingAssessment || !newAssessmentTitle.trim() || !newAssessmentDate}
              className="bg-emerald hover:bg-emerald-dark gap-2 cursor-pointer w-full sm:w-auto"
            >
              {creatingAssessment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ایجاد...
                </>
              ) : (
                "ایجاد ستون ارزیابی"
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="cursor-pointer w-full sm:w-auto">
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
