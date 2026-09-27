"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
} from "lucide-react";
import { QuickPointButtons } from "@/components/teacher/quick-point-buttons";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { cn } from "@/lib/utils";

interface Assessment {
  id: string;
  title: string;
  evaluationType: "NUMERIC" | "DESCRIPTIVE";
  date: string;
}

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
  behavioralPoints: { positive: number; negative: number };
}

interface GradebookData {
  classroom: { id: string; gradeLevel: string; name: string };
  assessments: Assessment[];
  students: MatrixStudent[];
}

const DESCRIPTIVE_LABELS: Record<string, { label: string; tint: string }> = {
  EXCELLENT: { label: "خیلی خوب", tint: "bg-emerald/10 text-emerald" },
  GOOD: { label: "خوب", tint: "bg-info/10 text-info" },
  ACCEPTABLE: { label: "قابل قبول", tint: "bg-warning/10 text-warning" },
  NEEDS_IMPROVEMENT: { label: "نیاز به تلاش", tint: "bg-destructive/10 text-destructive" },
};

function toPersian(num: number | null): string {
  if (num === null) return "—";
  return num.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}

/**
 * Color tint for a numeric score:
 *   emerald ≥ 15, amber ≥ 10, red < 10.
 * Per the task spec.
 */
function scoreTint(score: number | null): string {
  if (score === null) return "";
  if (score >= 15) return "bg-emerald/10 text-emerald hover:bg-emerald/20";
  if (score >= 10) return "bg-warning/10 text-warning hover:bg-warning/20";
  return "bg-destructive/10 text-destructive hover:bg-destructive/20";
}

function averageColor(avg: number | null): string {
  if (avg === null) return "text-muted-foreground";
  if (avg >= 15) return "text-emerald";
  if (avg >= 10) return "text-warning";
  return "text-destructive";
}

export function GradebookGrid({ classId }: { classId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GradebookData | null>(null);
  const [editing, setEditing] = useState<{
    assessmentId: string;
    studentId: string;
    studentName: string;
    type: "NUMERIC" | "DESCRIPTIVE";
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: "",
    evaluationType: "NUMERIC" as "NUMERIC" | "DESCRIPTIVE",
    date: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/gradebook?classroomId=${classId}`);
      const d = await r.json();
      if (d.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo<ColumnDef<MatrixStudent>[]>(() => {
    if (!data) return [];
    const cols: ColumnDef<MatrixStudent>[] = [
      {
        id: "student",
        header: "دانش‌آموز",
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center gap-2 min-w-[180px]">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{s.fullName}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald tabular-nums">
                    <ThumbsUp className="h-2.5 w-2.5" />
                    {s.behavioralPoints.positive.toLocaleString("fa-IR")}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive tabular-nums">
                    <ThumbsDown className="h-2.5 w-2.5" />
                    {s.behavioralPoints.negative.toLocaleString("fa-IR")}
                  </span>
                </div>
              </div>
              <QuickPointButtons
                studentUserId={s.studentId}
                studentName={s.fullName}
                size="sm"
                onSubmitted={load}
              />
            </div>
          );
        },
      },
      // Dynamic columns — one per assessment (last 30 days)
      ...data.assessments.map((a) => ({
        id: a.id,
        header: () => (
          <div className="text-center min-w-[70px]">
            <div className="font-medium text-xs truncate" title={a.title}>{a.title}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
              {new Date(a.date).toLocaleDateString("fa-IR")}
            </div>
            {a.evaluationType === "NUMERIC" ? (
              <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">عددی</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">توصیفی</Badge>
            )}
          </div>
        ),
        cell: ({ row }: { row: { original: MatrixStudent } }) => {
          const grade = row.original.grades.find((g) => g.assessmentId === a.id);
          return (
            <GradeCellDisplay
              grade={grade}
              type={a.evaluationType}
              onClick={() => {
                setEditing({
                  assessmentId: a.id,
                  studentId: row.original.studentId,
                  studentName: row.original.fullName,
                  type: a.evaluationType,
                });
                setEditValue(
                  grade?.isAbsent
                    ? "absent"
                    : a.evaluationType === "NUMERIC"
                    ? grade?.numericScore?.toString() ?? ""
                    : grade?.descriptiveScore ?? ""
                );
              }}
            />
          );
        },
      })),
      // Monthly average column (per Section 7 — Moving Average)
      {
        id: "average",
        header: () => (
          <div className="text-center min-w-[70px]">
            <TrendingUp className="h-3 w-3 mx-auto mb-0.5" />
            <span className="text-xs">میانگین ۳۰ روز</span>
          </div>
        ),
        cell: ({ row }) => {
          const avg = row.original.monthlyAverage;
          return (
            <div className={cn(
              "text-center text-sm font-bold tabular-nums",
              averageColor(avg)
            )}>
              {toPersian(avg)}
            </div>
          );
        },
      },
    ];
    return cols;
  }, [data, load]);

  const table = useReactTable({
    data: data?.students ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  async function saveGrade() {
    if (!editing) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        assessmentId: editing.assessmentId,
        studentUserId: editing.studentId,
      };
      if (editValue === "absent") {
        body.isAbsent = true;
      } else if (editing.type === "NUMERIC") {
        body.numericScore = parseFloat(editValue);
        if (isNaN(body.numericScore as number)) {
          toast.error("نمره عددی معتبر نیست.");
          return;
        }
      } else {
        body.descriptiveScore = editValue;
      }
      const r = await fetch("/api/v1/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ذخیره ناموفق بود.");
        return;
      }
      toast.success("نمره ذخیره شد.");
      setEditing(null);
      setEditValue("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function createAssessment() {
    if (!newAssessment.title) return;
    setSaving(true);
    try {
      const r = await fetch("/api/v1/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: classId,
          title: newAssessment.title,
          evaluationType: newAssessment.evaluationType,
          date: newAssessment.date,
        }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ایجاد ارزیابی ناموفق بود.");
        return;
      }
      toast.success("ارزیابی جدید ایجاد شد.");
      setNewAssessment({
        title: "",
        evaluationType: "NUMERIC",
        date: new Date().toISOString().slice(0, 10),
      });
      setDialogOpen(false);
      load();
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

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <PageHeader
        title={`دفتر نمره — ${data.classroom.gradeLevel} ${data.classroom.name}`}
        subtitle={
          <span className="tabular-nums">
            {data.assessments.length.toLocaleString("fa-IR")} ارزیابی در ۳۰ روز گذشته • {data.students.length.toLocaleString("fa-IR")} دانش‌آموز
          </span>
        }
        icon={BookOpen}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald hover:bg-emerald-dark h-9 gap-2">
                <Plus className="h-4 w-4" />
                ارزیابی جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-navy">ایجاد ارزیابی جدید</DialogTitle>
                <DialogDescription>
                  نوع ارزیابی را انتخاب کنید. نمرات بعد از ایجاد قابل ثبت هستند.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">عنوان ارزیابی</Label>
                  <Input
                    value={newAssessment.title}
                    onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                    placeholder="مثلاً پرسش کلاسی فصل ۲"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">نوع نمره</Label>
                    <Select
                      value={newAssessment.evaluationType}
                      onValueChange={(v) => setNewAssessment({ ...newAssessment, evaluationType: v as any })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NUMERIC">عددی (۰-۲۰)</SelectItem>
                        <SelectItem value="DESCRIPTIVE">توصیفی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">تاریخ</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      className="font-mono text-left h-9 tabular-nums"
                      value={newAssessment.date}
                      onChange={(e) => setNewAssessment({ ...newAssessment, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createAssessment}
                  disabled={saving || !newAssessment.title}
                  className="bg-emerald hover:bg-emerald-dark"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Matrix grid */}
      <ScrollReveal>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto rounded-lg border max-h-[36rem]">
              <Table>
                <TableHeader className="sticky-table-header">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="bg-muted/60 hover:bg-muted/60">
                      {hg.headers.map((h) => {
                        const isStudent = h.column.id === "student";
                        return (
                          <TableHead
                            key={h.id}
                            className={cn(
                              "text-right border-l border-border last:border-l-0 bg-inherit p-2",
                              isStudent && "sticky right-0 z-[15] bg-muted/80 backdrop-blur-sm"
                            )}
                          >
                            {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "stagger-item data-table-row bg-card",
                        idx % 2 === 1 && "bg-muted/20"
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isStudent = cell.column.id === "student";
                        const isAverage = cell.column.id === "average";
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "border-l border-border last:border-l-0 p-1.5 align-middle",
                              isStudent && "sticky right-0 z-[5] bg-inherit",
                              isAverage && "font-bold"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    className="h-10"
                  >
                    غایب
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 15, 18, 20].map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      size="sm"
                      onClick={() => setEditValue(n.toString())}
                      className="tabular-nums"
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
                      "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                      editValue === key ? cn(tint, "border-current") : "border-border hover:border-muted-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>انصراف</Button>
            <Button
              onClick={saveGrade}
              disabled={saving || !editValue}
              className="bg-emerald hover:bg-emerald-dark"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
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
        className="w-full h-9 rounded-md border border-dashed border-border hover:border-navy hover:bg-navy/5 text-muted-foreground/40 hover:text-navy text-xs transition"
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
        className="w-full h-9 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition"
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
        className={cn(
          "w-full h-9 rounded-md text-sm font-bold tabular-nums transition",
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
        className={cn(
          "w-full h-9 rounded-md text-[10px] font-medium transition",
          info?.tint ?? "bg-muted"
        )}
      >
        {info?.label ?? grade.descriptiveScore}
      </button>
    );
  }
  return null;
}
