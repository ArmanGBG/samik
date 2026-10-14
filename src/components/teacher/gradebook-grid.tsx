"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRealtimeEvent } from "@/lib/realtime/realtime-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  BookOpen,
  ArrowRight,
  Plus,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { QuickPointButtons } from "@/components/teacher/quick-point-buttons";
import { PersianDatePicker } from "@/components/ui/persian-date-picker";
import { cn } from "@/lib/utils";
import { toPersianDate } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

interface GradeCell {
  assessmentId: string;
  numericScore: number | null;
  descriptiveScore: string | null;
  isAbsent: boolean;
}

interface MatrixStudent {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  monthlyAverage: number | null;
  grades: GradeCell[];
  attendance: Array<{
    sessionId: string;
    status: "PRESENT" | "ABSENT";
  }>;
  behavioralPoints: { positive: number; negative: number };
  totalAbsences: number;
}

interface GradebookData {
  ok: boolean;
  classroom: { id: string; gradeLevel: string; name: string; subjects: string[] };
  sessions: Array<{ id: string; date: string }>;
  assessments: Array<{ id: string; title: string; evaluationType: "NUMERIC" | "DESCRIPTIVE"; date: string }>;
  students: MatrixStudent[];
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

function averageColor(val: number | null) {
  if (val === null) return "text-muted-foreground opacity-50";
  if (val >= 18) return "text-emerald";
  if (val >= 15) return "text-blue-600";
  if (val >= 10) return "text-warning";
  return "text-destructive";
}

export function GradebookGrid({ classId, subjectId }: { classId: string; subjectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState("");
  const [newAssessmentDate, setNewAssessmentDate] = useState("");
  const [newAssessmentType, setNewAssessmentType] = useState<"NUMERIC" | "DESCRIPTIVE">("NUMERIC");
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  const handleCreateAssessment = async () => {
    if (!newAssessmentTitle.trim() || !newAssessmentDate) {
      toast.error("لطفاً عنوان و تاریخ ارزیابی را وارد کنید.");
      return;
    }
    setCreatingAssessment(true);
    try {
      const res = await fetch("/api/v1/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: classId,
          subjectId: subjectId,
          title: newAssessmentTitle,
          date: newAssessmentDate,
          evaluationType: newAssessmentType,
        }),
      });
      const dataRes = await res.json();
      if (!dataRes.ok) {
        toast.error(dataRes.error ?? "خطا در ایجاد ارزیابی.");
        return;
      }
      toast.success("ارزیابی با موفقیت ایجاد شد.");
      setIsCreateModalOpen(false);
      setNewAssessmentTitle("");
      setNewAssessmentDate("");
      void load(); // reload grid
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setCreatingAssessment(false);
    }
  };

  const [editing, setEditing] = useState<{
    assessmentId: string;
    studentId: string;
    studentName: string;
    assessmentTitle: string;
    type: "NUMERIC" | "DESCRIPTIVE";
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Reset the spinner during render when the requested class/subject changes.
  // Switching the term-history subject does not remount this component, so
  // without this the previous subject's rows stayed on screen while loading.
  const requestKey = `${classId}:${subjectId}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (loadedKey !== requestKey) {
    setLoadedKey(requestKey);
    setLoading(true);
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/gradebook?classroomId=${classId}&subjectId=${subjectId}`,
        { cache: "no-store" }
      );
      const d = await res.json().catch(() => null);
      if (d?.ok) {
        setData(d);
        setError(null);
      } else {
        // Surface the server's reason instead of the generic
        // "class not found" message, which hid every API failure.
        setError(d?.error ?? `خطای سرور (کد ${res.status})`);
      }
    } catch {
      setError("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
    // `subjectId` must be a dependency: without it, switching the term-history
    // subject kept the previous subject's data on screen.
  }, [classId, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeEvent(["grade:saved", "behavioral-point:created"], () => {
    void load();
  });

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.students;
    const q = searchQuery.toLowerCase().trim();
    return data.students.filter(s => s.fullName.toLowerCase().includes(q));
  }, [data, searchQuery]);

  async function saveGrade() {
    if (!editing) return;
    setSaving(true);
    let numericScore: number | null = null;
    let descriptiveScore: string | null = null;

    if (editValue !== "absent") {
      if (editing.type === "NUMERIC") {
        numericScore = parseFloat(editValue);
        if (isNaN(numericScore) || numericScore < 0 || numericScore > 20) {
          toast.error("نمره باید عددی بین ۰ و ۲۰ باشد.");
          setSaving(false);
          return;
        }
      } else {
        descriptiveScore = editValue;
      }
    }

    try {
      const res = await fetch("/api/v1/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: editing.assessmentId,
          studentUserId: editing.studentId,
          numericScore,
          descriptiveScore,
          isAbsent: editValue === "absent",
        }),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success("نمره با موفقیت ذخیره شد.");
        setEditing(null);
        load();
      } else {
        toast.error(result.error || "خطا در ذخیره نمره");
      }
    } catch {
      toast.error("خطای شبکه در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">دفتر نمره بارگذاری نشد.</p>
        <p className="text-sm">{error ?? "کلاس یافت نشد یا دسترسی ندارید."}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { setLoading(true); void load(); }}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20">
      <PageHeader
        title={`دفتر نمره — ${data.classroom.gradeLevel} ${data.classroom.name} ${data.classroom.subjects?.length ? `(${data.classroom.subjects.join("، ")})` : ""}`}
        subtitle={
          <span className="tabular-nums">
            {data.assessments.length.toLocaleString("fa-IR")} ارزیابی کل ترم • {data.students.length.toLocaleString("fa-IR")} دانش‌آموز
          </span>
        }
        icon={BookOpen}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald/30 hover:bg-emerald/5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">افزودن ارزیابی جدید</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/teacher/gradebook")}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-muted/50 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Button>
          </div>
        }
      />

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
                    <th className="p-3 whitespace-nowrap min-w-[120px] border-l border-border/50 text-center">ثبت انضباط</th>
                    
                    {data.sessions.map(s => (
                      <th key={s.id} className="p-3 whitespace-nowrap min-w-[70px] text-center border-l border-border/50 font-normal bg-muted/20">
                        <div className="font-medium text-navy">حضور و غیاب</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{toPersianDate(s.date)}</div>
                      </th>
                    ))}
                    
                    {data.assessments.map(a => (
                      <th key={a.id} className="p-3 whitespace-nowrap min-w-[100px] text-center border-l border-border/50 font-normal">
                        <div className="font-medium text-navy" title={a.title}>{a.title}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{toPersianDate(a.date)}</div>
                        {a.evaluationType === "NUMERIC" ? (
                          <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0 border-border/50">عددی</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0 border-border/50">توصیفی</Badge>
                        )}
                      </th>
                    ))}
                    
                    <th className="p-3 whitespace-nowrap text-center text-destructive border-l border-border/50 min-w-[70px]">غیبت‌ها</th>
                    <th className="p-3 whitespace-nowrap text-center min-w-[90px]">میانگین ترم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={data.assessments.length + 4} className="py-12 text-center text-muted-foreground">
                        دانش‌آموزی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const totalPoints = student.behavioralPoints.positive - student.behavioralPoints.negative;
                      
                      return (
                        <tr 
                          key={student.studentId}
                          className="transition-colors hover:bg-muted/20"
                        >
                          <td className="p-3 sticky right-0 z-10 bg-inherit shadow-[-4px_0_12px_rgba(0,0,0,0.03)] border-l border-border/50">
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <span className="text-xs text-muted-foreground w-4 text-center font-mono tabular-nums opacity-60">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm text-navy">{student.fullName}</span>
                              <Badge variant="secondary" className="mr-auto h-5 text-[10px] gap-1 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                                <Star className="h-3 w-3" />
                                {totalPoints.toLocaleString("fa-IR")}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3 text-center border-l border-border/50 align-middle">
                            <div className="flex justify-center">
                              <QuickPointButtons
                                studentUserId={student.studentId}
                                studentName={student.fullName}
                                subjectId={subjectId}
                                size="sm"
                                onSubmitted={(type) => {
                                  setData((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      students: prev.students.map((s) => {
                                        if (s.studentId === student.studentId) {
                                          return {
                                            ...s,
                                            behavioralPoints: {
                                              positive: s.behavioralPoints.positive + (type === "POSITIVE" ? 1 : 0),
                                              negative: s.behavioralPoints.negative + (type === "NEGATIVE" ? 1 : 0),
                                            }
                                          };
                                        }
                                        return s;
                                      })
                                    };
                                  });
                                }}
                              />
                            </div>
                          </td>
                          
                          {data.sessions.map(s => {
                            const att = student.attendance.find(x => x.sessionId === s.id);
                            const st = att?.status ?? "PRESENT";
                            return (
                              <td key={s.id} className="p-2 border-l border-border/50 text-center">
                                <Badge variant="outline" className={cn(
                                  "text-[10px]",
                                  st === "PRESENT" ? "bg-emerald/10 text-emerald" :
                                  st === "ABSENT" ? "bg-destructive/10 text-destructive" :
                                  ""
                                )}>
                                  {st === "PRESENT" ? "حاضر" : "غایب"}
                                </Badge>
                              </td>
                            );
                          })}
                          
                          {data.assessments.map(a => {
                            const grade = student.grades.find((g) => g.assessmentId === a.id);
                            return (
                              <td key={a.id} className="p-2 border-l border-border/50">
                                <GradeCellDisplay 
                                  grade={grade} 
                                  type={a.evaluationType} 
                                  onClick={() => {
                                    setEditValue(grade?.isAbsent ? "absent" : a.evaluationType === "NUMERIC" ? (grade?.numericScore?.toString() || "") : (grade?.descriptiveScore || ""));
                                    setEditing({
                                      assessmentId: a.id,
                                      studentId: student.studentId,
                                      studentName: student.fullName,
                                      assessmentTitle: a.title,
                                      type: a.evaluationType
                                    });
                                  }}
                                />
                              </td>
                            );
                          })}

                          <td className="p-3 text-center text-sm font-medium tabular-nums text-destructive border-l border-border/50 align-middle">
                            {student.totalAbsences > 0 ? student.totalAbsences.toLocaleString("fa-IR") : "۰"}
                          </td>
                          <td className="p-3 text-center font-bold tabular-nums align-middle">
                            {student.monthlyAverage !== null ? (
                              <span className={averageColor(student.monthlyAverage)}>
                                {student.monthlyAverage.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 font-normal">—</span>
                            )}
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

      {/* Edit grade dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">
              ثبت نمره — {editing?.studentName}
            </DialogTitle>
            <DialogDescription>
              {editing?.type === "NUMERIC"
                ? "نمره عددی بین ۰ تا ۲۰ وارد کنید."
                : "وضعیت توصیفی را انتخاب کنید."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">
            {editing?.type === "NUMERIC" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.25}
                    value={editValue === "absent" ? "" : editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="مثلاً ۱۸.۵"
                    dir="ltr"
                    className="font-mono text-center text-lg h-10 tabular-nums"
                  />
                  <Button
                    variant={editValue === "absent" ? "destructive" : "outline"}
                    onClick={() => setEditValue(editValue === "absent" ? "" : "absent")}
                    className="h-10 cursor-pointer text-xs font-medium"
                  >
                    {editValue === "absent" ? "ثبت‌شده به‌عنوان غایب" : "علامت‌گذاری غایب"}
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 15, 18, 20].map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      size="sm"
                      onClick={() => setEditValue(n.toString())}
                      className="tabular-nums cursor-pointer hover:border-navy/50 hover:bg-navy/5"
                    >
                      {n.toLocaleString("fa-IR")}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DESCRIPTIVE_LABELS).map(([key, { label, tint }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditValue(key)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-sm font-medium cursor-pointer",
                      editValue === key ? cn(tint, "border-current") : "border-border hover:border-muted-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="cursor-pointer">
              انصراف و بستن
            </Button>
            <Button
              onClick={saveGrade}
              disabled={saving || !editValue}
              className="bg-emerald hover:bg-emerald-dark gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                "ذخیره نمره دانش‌آموز"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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

function GradeCellDisplay({
  grade,
  type,
  onClick,
}: {
  grade: GradeCell | undefined;
  type: "NUMERIC" | "DESCRIPTIVE";
  onClick: () => void;
}) {
  if (!grade || (grade.numericScore === null && grade.descriptiveScore === null && !grade.isAbsent)) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="ثبت نمره برای این ارزیابی"
        title="کلیک برای ثبت نمره"
        className="w-full h-9 rounded-md border border-dashed border-border hover:border-navy hover:bg-navy/5 text-muted-foreground/40 hover:text-navy text-xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
      >
        —
      </button>
    );
  }
  if (grade.isAbsent) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="وضعیت غایب - کلیک جهت ویرایش نمره"
        title="غایب در ارزیابی (کلیک جهت ویرایش)"
        className="w-full h-9 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
      >
        غایب
      </button>
    );
  }
  if (type === "NUMERIC" && grade.numericScore !== null) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`نمره عددی: ${grade.numericScore.toLocaleString("fa-IR")} - کلیک جهت ویرایش`}
        title="کلیک برای ویرایش نمره"
        className={cn(
          "w-full h-9 rounded-md text-sm font-bold tabular-nums transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30",
          scoreTint(grade.numericScore)
        )}
      >
        {grade.numericScore.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
      </button>
    );
  }
  if (type === "DESCRIPTIVE" && grade.descriptiveScore) {
    const info = DESCRIPTIVE_LABELS[grade.descriptiveScore];
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`نمره توصیفی: ${info?.label ?? grade.descriptiveScore} - کلیک جهت ویرایش`}
        title="کلیک برای ویرایش نمره"
        className={cn(
          "w-full h-9 rounded-md text-[10px] font-medium transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30",
          info?.tint ?? "bg-muted"
        )}
      >
        {info?.label ?? grade.descriptiveScore}
      </button>
    );
  }
  return null;
}
