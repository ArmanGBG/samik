"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  GraduationCap,
  Building2,
  DoorClosed,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDate } from "@/lib/date-utils";
import { toEnglishDigits } from "@/lib/persian-digits";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";

interface SchoolOption {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
}

interface ClassroomOption {
  id: string;
  name: string;
  gradeLevel: string;
}

interface StudentRow {
  id: string;
  enrollmentId?: string;
  studentId?: string;
  userId?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  nationalCode: string;
  phoneNumber: string;
  classRoomId: string | null;
  classRoomName: string | null;
  gradeLevel: string | null;
  status: "ACTIVE" | "ARCHIVED" | "PENDING_CONFIRMATION";
  guardianPhone1?: string | null;
  guardianPhone2?: string | null;
  createdAt: string;
}

export function SuperAdminStudentsManager() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-navy" />
        </div>
      }
    >
      <SuperAdminStudentsContent />
    </Suspense>
  );
}

function SuperAdminStudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    searchParams.get("schoolId") || ""
  );
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("ALL");
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    phoneNumber: "",
    classRoomId: "",
    guardianPhone1: "",
    guardianPhone2: "",
  });

  // Load all schools
  useEffect(() => {
    (async () => {
      setLoadingSchools(true);
      try {
        const r = await fetch("/api/v1/super-admin/schools");
        const d = await r.json();
        if (d.ok && Array.isArray(d.schools)) {
          setSchools(d.schools);
          if (!selectedSchoolId && d.schools.length > 0) {
            setSelectedSchoolId(d.schools[0].id);
          }
        }
      } catch (err) {
        console.error("[LOAD_SCHOOLS_ERROR]", err);
        toast.error("خطا در بارگذاری لیست مدارس.");
      } finally {
        setLoadingSchools(false);
      }
    })();
  }, [selectedSchoolId]);

  // Load classrooms and students for selected school
  const loadSchoolData = useCallback(async () => {
    if (!selectedSchoolId) return;
    setLoadingStudents(true);
    try {
      const [classRes, studRes] = await Promise.all([
        fetch(`/api/v1/principal/classrooms?schoolId=${selectedSchoolId}`),
        fetch(`/api/v1/principal/students?schoolId=${selectedSchoolId}${selectedClassroomId !== "ALL" ? `&classroomId=${selectedClassroomId}` : ""}`),
      ]);

      const [classData, studData] = await Promise.all([classRes.json(), studRes.json()]);

      if (classData.ok) {
        setClassrooms(classData.classrooms || []);
      }
      if (studData.ok) {
        setStudents(studData.students || []);
      } else {
        toast.error(studData.error ?? "خطا در دریافت لیست دانش‌آموزان.");
      }
    } catch (err) {
      console.error("[LOAD_STUDENTS_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSchoolId, selectedClassroomId]);

  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData]);

  function handleSelectSchool(schoolId: string) {
    setSelectedSchoolId(schoolId);
    setSelectedClassroomId("ALL");
    router.push(`/super-admin/students?schoolId=${schoolId}`);
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSchoolId) {
      toast.error("لطفاً ابتدا یک مدرسه را انتخاب کنید.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationalCode: toEnglishDigits(form.nationalCode.trim()) || undefined,
        phoneNumber: toEnglishDigits(form.phoneNumber.trim()),
        classRoomId: form.classRoomId === "none" ? "" : form.classRoomId || undefined,
        guardianPhone1: toEnglishDigits(form.guardianPhone1.trim()),
        guardianPhone2: form.guardianPhone2.trim()
          ? toEnglishDigits(form.guardianPhone2.trim())
          : undefined,
      };

      const r = await fetch(`/api/v1/principal/students?schoolId=${selectedSchoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ثبت‌نام دانش‌آموز ناموفق بود.");
        return;
      }
      toast.success(`دانش‌آموز «${payload.firstName} ${payload.lastName}» با موفقیت ثبت‌نام شد.`);
      setForm({
        firstName: "",
        lastName: "",
        nationalCode: "",
        phoneNumber: "",
        classRoomId: "",
        guardianPhone1: "",
        guardianPhone2: "",
      });
      setAddStudentOpen(false);
      loadSchoolData();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    phoneNumber: "",
    classRoomId: "",
    guardianPhone1: "",
    guardianPhone2: "",
    status: "ACTIVE" as "ACTIVE" | "PENDING_CONFIRMATION" | "ARCHIVED",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  function openEditStudent(st: StudentRow) {
    const parts = (st.fullName || "").split(" ");
    const rawNc = st.nationalCode || "";
    const cleanNc = rawNc.startsWith("TEMP-") || rawNc.startsWith("PENDING-") ? "" : rawNc;
    setEditingStudent(st);
    setEditForm({
      firstName: st.firstName || parts[0] || "",
      lastName: st.lastName || parts.slice(1).join(" ") || "",
      nationalCode: cleanNc,
      phoneNumber: st.phoneNumber || "",
      classRoomId: st.classRoomId || "",
      guardianPhone1: st.guardianPhone1 || "",
      guardianPhone2: st.guardianPhone2 || "",
      status: st.status || "ACTIVE",
    });
  }

  async function handleSaveEditStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent || !selectedSchoolId) return;
    const enrollId = editingStudent.enrollmentId || editingStudent.id;
    setEditSubmitting(true);
    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        nationalCode: toEnglishDigits(editForm.nationalCode.trim()) || undefined,
        phoneNumber: toEnglishDigits(editForm.phoneNumber.trim()),
        classRoomId: editForm.classRoomId || undefined,
        guardianPhone1: toEnglishDigits(editForm.guardianPhone1.trim()),
        guardianPhone2: editForm.guardianPhone2.trim()
          ? toEnglishDigits(editForm.guardianPhone2.trim())
          : undefined,
        status: editForm.status,
      };

      const r = await fetch(`/api/v1/principal/students?id=${enrollId}&schoolId=${selectedSchoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ویرایش اطلاعات دانش‌آموز ناموفق بود.");
        return;
      }
      toast.success("پرونده دانش‌آموز با موفقیت به‌روزرسانی شد.");
      setEditingStudent(null);
      loadSchoolData();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteStudent(enrollId: string, name: string) {
    if (!confirm(`آیا از لغو ثبت‌نام و حذف «${name}» از این مدرسه اطمینان دارید؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/students?id=${enrollId}&schoolId=${selectedSchoolId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در حذف عضویت دانش‌آموز.");
        return;
      }
      toast.success(`عضویت «${name}» با موفقیت لغو شد.`);
      loadSchoolData();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "ACTIVE").length;
  const pendingStudents = students.filter((s) => s.status === "PENDING_CONFIRMATION").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="مدیریت دانش‌آموزان مدارس"
        subtitle="مشاهده پرونده و ثبت‌نام دانش‌آموزان هر مدرسه از دید سوپر ادمین"
        icon={GraduationCap}
        actions={
          <div className="flex items-center gap-3">
            {schools.length > 0 && (
              <div className="w-56 sm:w-64">
                <Select value={selectedSchoolId} onValueChange={handleSelectSchool}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="انتخاب مدرسه..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.subdomain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={() => setAddStudentOpen(true)}
              disabled={!selectedSchoolId}
              className="bg-emerald hover:bg-emerald-dark text-xs gap-1.5 h-9 cursor-pointer shadow-sm text-white"
            >
              <Plus className="h-4 w-4" />
              <span>ثبت‌نام دانش‌آموز جدید</span>
            </Button>
          </div>
        }
      />

      <KpiCardGrid
        cards={[
          {
            label: "کل دانش‌آموزان",
            value: totalStudents,
            icon: GraduationCap,
            tint: "navy",
            sublabel: selectedSchool ? selectedSchool.name : undefined,
          },
          {
            label: "دانش‌آموزان فعال",
            value: activeStudents,
            icon: CheckCircle2,
            tint: "emerald",
          },
          {
            label: "در انتظار تایید",
            value: pendingStudents,
            icon: Clock,
            tint: "warning",
          },
          {
            label: "کلاس‌های تعریف‌شده",
            value: classrooms.length,
            icon: DoorClosed,
            tint: "info",
          },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base text-navy">
              دانش‌آموزان {selectedSchool ? `«${selectedSchool.name}»` : ""}
            </CardTitle>
            <CardDescription>
              مدیر سامانه می‌تواند مستقیماً دانش‌آموزان جدید را ثبت‌نام و به کلاس‌های این مدرسه تخصیص دهد.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {classrooms.length > 0 && (
              <div className="w-44">
                <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40">
                    <SelectValue placeholder="فیلتر کلاس..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">همه کلاس‌ها</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (پایه {c.gradeLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSchoolId && (
              <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 cursor-pointer h-8">
                <Link href={`/super-admin/schools/${selectedSchoolId}`}>
                  <Building2 className="h-3.5 w-3.5" />
                  <span>صفحه مدرسه</span>
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loadingStudents ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="هیچ دانش‌آموزی در این بخش یافت نشد."
              description="با کلیک روی دکمه «ثبت‌نام دانش‌آموز جدید»، اولین دانش‌آموز را ثبت کنید."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden" dir="rtl">
              <Table className="sticky-table-header w-full" dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right min-w-[180px]">نام و نام خانوادگی</TableHead>
                    <TableHead className="text-right min-w-[120px]">کد ملی</TableHead>
                    <TableHead className="text-right min-w-[140px]">کلاس درس</TableHead>
                    <TableHead className="text-right min-w-[130px]">شماره همراه</TableHead>
                    <TableHead className="text-right min-w-[120px]">وضعیت پرونده</TableHead>
                    <TableHead className="text-right min-w-[120px]">تاریخ ثبت‌نام</TableHead>
                    <TableHead className="text-left w-[110px] min-w-[110px] pl-4">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((st) => {
                    const studentId = st.enrollmentId || st.id;
                    const studentName = st.fullName || `${st.firstName || ""} ${st.lastName || ""}`.trim();
                    return (
                      <TableRow key={studentId} className="data-table-row">
                        <TableCell className="text-right font-semibold text-navy">
                          {studentName}
                        </TableCell>
                        <TableCell className="text-right">
                          {st.nationalCode?.startsWith("TEMP-") || st.nationalCode?.startsWith("PENDING-") ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] gap-1 font-normal">
                              کد موقت
                            </Badge>
                          ) : (
                            <span className="font-mono text-xs tabular-nums">{st.nationalCode}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {st.classRoomName ? (
                            <Badge variant="outline" className="text-xs">
                              {st.classRoomName} {st.gradeLevel ? `(پایه ${st.gradeLevel})` : ""}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">— بدون کلاس</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {st.phoneNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={st.status === "ACTIVE" ? "default" : "outline"}
                            className={st.status === "ACTIVE" ? "bg-emerald text-white text-[11px]" : "text-[11px]"}
                          >
                            {st.status === "ACTIVE" ? "فعال" : st.status === "PENDING_CONFIRMATION" ? "در انتظار تایید" : "آرشیو"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {toPersianDate(st.createdAt)}
                        </TableCell>
                        <TableCell className="text-left w-[110px] min-w-[110px] pl-4">
                          <div className="flex items-center justify-start gap-1" dir="ltr">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditStudent(st)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-navy hover:bg-navy/10 cursor-pointer"
                              title="ویرایش پرونده"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStudent(studentId, studentName)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="لغو ثبت‌نام و حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Add Student ── */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald" />
              <span>ثبت‌نام دانش‌آموز جدید</span>
            </DialogTitle>
            <DialogDescription>
              دانش‌آموز برای مدرسه {selectedSchool ? `«${selectedSchool.name}»` : ""} ثبت‌نام خواهد شد.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStudent} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-ln-super" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="stu-ln-super"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="محمدی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-fn-super" className="text-xs">نام</Label>
                <Input
                  id="stu-fn-super"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="رضا"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stu-nc-super" className="text-xs">کد ملی</Label>
                  <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
                </div>
                <Input
                  id="stu-nc-super"
                  value={form.nationalCode}
                  onChange={(e) => setForm({ ...form, nationalCode: e.target.value })}
                  placeholder="۱۰ رقم (اختیاری)"
                  inputMode="numeric" dir="ltr"
                  maxLength={10}
                  className="h-9 text-xs font-mono text-left"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-phone-super" className="text-xs">شماره همراه دانش‌آموز</Label>
                <Input
                  id="stu-phone-super"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="stu-class-super" className="text-xs">کلاس درس (اختیاری)</Label>
              <Select
                value={form.classRoomId}
                onValueChange={(val) => setForm({ ...form, classRoomId: val })}
              >
                <SelectTrigger id="stu-class-super" className="h-9 text-xs">
                  <SelectValue placeholder="انتخاب کلاس درس..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون کلاس (تخصیص در آینده)</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (پایه {c.gradeLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-g1-super" className="text-xs">شماره ولی ۱ (ارسال پیامک)</Label>
                <Input
                  id="stu-g1-super"
                  value={form.guardianPhone1}
                  onChange={(e) => setForm({ ...form, guardianPhone1: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-g2-super" className="text-xs">شماره ولی ۲ (اختیاری)</Label>
                <Input
                  id="stu-g2-super"
                  value={form.guardianPhone2}
                  onChange={(e) => setForm({ ...form, guardianPhone2: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button type="submit" disabled={submitting} className="bg-emerald hover:bg-emerald-dark text-xs h-9 text-white">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت‌نام دانش‌آموز"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAddStudentOpen(false)} className="text-xs h-9">
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Student ── */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Pencil className="h-4 w-4 text-navy" />
              <span>ویرایش پرونده دانش‌آموز</span>
            </DialogTitle>
            <DialogDescription>
              ویرایش اطلاعات هویتی، کلاس درس و شماره تماس اولیا در مدرسه {selectedSchool ? `«${selectedSchool.name}»` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditStudent} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-ln" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="stu-edit-ln"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="محمدی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-fn" className="text-xs">نام</Label>
                <Input
                  id="stu-edit-fn"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="رضا"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stu-edit-nc" className="text-xs">کد ملی</Label>
                  <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
                </div>
                <Input
                  id="stu-edit-nc"
                  value={editForm.nationalCode}
                  onChange={(e) => setEditForm({ ...editForm, nationalCode: e.target.value })}
                  className="h-9 text-xs font-mono"
                  inputMode="numeric" dir="ltr"
                  placeholder="۱۰ رقم (اختیاری)"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-ph" className="text-xs">شماره همراه دانش‌آموز</Label>
                <Input
                  id="stu-edit-ph"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="h-9 text-xs font-mono"
                  inputMode="numeric" dir="ltr"
                  placeholder="0912..."
                  maxLength={11}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-cr" className="text-xs">کلاس درس</Label>
                <Select
                  value={editForm.classRoomId}
                  onValueChange={(val) => setEditForm({ ...editForm, classRoomId: val })}
                >
                  <SelectTrigger id="stu-edit-cr" className="h-9 text-xs">
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

              <div className="space-y-1">
                <Label htmlFor="stu-edit-status" className="text-xs">وضعیت پرونده</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val: any) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger id="stu-edit-status" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">فعال</SelectItem>
                    <SelectItem value="PENDING_CONFIRMATION">در انتظار تایید ولی</SelectItem>
                    <SelectItem value="ARCHIVED">آرشیو شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-g1" className="text-xs">شماره ولی ۱ (ارسال پیامک)</Label>
                <Input
                  id="stu-edit-g1"
                  value={editForm.guardianPhone1}
                  onChange={(e) => setEditForm({ ...editForm, guardianPhone1: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-g2" className="text-xs">شماره ولی ۲ (اختیاری)</Label>
                <Input
                  id="stu-edit-g2"
                  value={editForm.guardianPhone2}
                  onChange={(e) => setEditForm({ ...editForm, guardianPhone2: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button
                type="submit"
                disabled={editSubmitting}
                className="bg-navy hover:bg-navy-dark text-xs h-9 text-white gap-1.5"
              >
                {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                <span>ذخیره تغییرات</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingStudent(null)}
                className="text-xs h-9"
              >
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 1790849142
