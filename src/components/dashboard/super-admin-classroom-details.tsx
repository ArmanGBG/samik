"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
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
  DoorClosed,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Clock,
  BookOpen,
  Pencil,
  Trash2,
  Search,
  School,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDate } from "@/lib/date-utils";
import { toEnglishDigits } from "@/lib/persian-digits";
import { PageHeader } from "@/components/shared/page-header";
import { GRADES, MAJORS, gradeHasMajor, getMajorLabel } from "@/lib/constants/grades";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";

interface ClassroomItem {
  id: string;
  gradeLevel: string;
  major: string | null;
  name: string;
  _count: { enrollments: number };
}

interface EnrollmentItem {
  id: string;
  status: "ACTIVE" | "ARCHIVED" | "PENDING_CONFIRMATION";
  guardianPhone1?: string | null;
  guardianPhone2?: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    nationalCode: string;
  };
  classRoom: {
    id: string;
    name: string;
    gradeLevel: string;
  } | null;
}

interface SchoolData {
  id: string;
  name: string;
  subdomain: string;
  classrooms: ClassroomItem[];
  enrollments: EnrollmentItem[];
}


export function SuperAdminClassroomDetails({
  schoolId,
  classroomId,
}: {
  schoolId: string;
  classroomId: string;
}) {
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Add / Edit Dialogs
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    phoneNumber: "",
    guardianPhone1: "",
    guardianPhone2: "",
  });

  const [editingStudent, setEditingStudent] = useState<EnrollmentItem | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    phoneNumber: "",
    classRoomId: "",
    guardianPhone1: "",
    guardianPhone2: "",
    status: "ACTIVE" as "ACTIVE" | "PENDING_CONFIRMATION" | "ARCHIVED",
  });
  const [editStudentSubmitting, setEditStudentSubmitting] = useState(false);

  // Edit Classroom state
  const [editClassroomOpen, setEditClassroomOpen] = useState(false);
  const [editClassroomForm, setEditClassroomForm] = useState({
    name: "",
    gradeLevel: "",
    major: "" as string | null,
  });
  const [editClassroomSubmitting, setEditClassroomSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/super-admin/schools?id=${schoolId}`);
      const d = await r.json();
      if (d.ok) {
        setSchool(d.school);
      } else {
        toast.error(d.error ?? "خطا در دریافت اطلاعات کلاس.");
      }
    } catch (err) {
      console.error("[LOAD_CLASSROOM_DETAILS_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const classroom = useMemo(() => {
    if (!school) return null;
    return school.classrooms.find((c) => c.id === classroomId) || null;
  }, [school, classroomId]);

  const classroomStudents = useMemo(() => {
    if (!school) return [];
    return school.enrollments.filter((e) => e.classRoom?.id === classroomId);
  }, [school, classroomId]);

  const filteredStudents = useMemo(() => {
    return classroomStudents.filter((e) => {
      // Status filter
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;

      // Text search
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const fullName = `${e.student?.firstName || ""} ${e.student?.lastName || ""}`.toLowerCase();
      const nc = (e.student?.nationalCode || "").toLowerCase();
      const phone = (e.student?.phoneNumber || "").toLowerCase();
      const gPhone = (e.guardianPhone1 || "").toLowerCase();
      return fullName.includes(q) || nc.includes(q) || phone.includes(q) || gPhone.includes(q);
    });
  }, [classroomStudents, searchQuery, statusFilter]);

  // Add student handler
  async function handleSaveEditClassroom(e: React.FormEvent) {
    e.preventDefault();
    if (!editClassroomForm.name.trim()) return;
    setEditClassroomSubmitting(true);
    try {
      const payload = {
        name: editClassroomForm.name.trim(),
        gradeLevel: editClassroomForm.gradeLevel,
        major: gradeHasMajor(editClassroomForm.gradeLevel) ? editClassroomForm.major : null,
      };
      // For Super Admin, we must pass schoolId so the middleware accepts it
      const r = await fetch(`/api/v1/principal/classrooms?id=${classroomId}&schoolId=${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error || "خطا در ویرایش کلاس");
      } else {
        toast.success("کلاس با موفقیت ویرایش شد.");
        setEditClassroomOpen(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setEditClassroomSubmitting(false);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        nationalCode: toEnglishDigits(studentForm.nationalCode.trim()),
        phoneNumber: toEnglishDigits(studentForm.phoneNumber.trim()),
        classRoomId: classroomId,
        guardianPhone1: toEnglishDigits(studentForm.guardianPhone1.trim()),
        guardianPhone2: studentForm.guardianPhone2.trim()
          ? toEnglishDigits(studentForm.guardianPhone2.trim())
          : undefined,
      };

      const r = await fetch(`/api/v1/principal/students?schoolId=${schoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ثبت‌نام دانش‌آموز ناموفق بود.");
        return;
      }
      toast.success(`دانش‌آموز «${payload.firstName} ${payload.lastName}» در کلاس ثبت‌نام شد.`);
      setStudentForm({
        firstName: "",
        lastName: "",
        nationalCode: "",
        phoneNumber: "",
        guardianPhone1: "",
        guardianPhone2: "",
      });
      setAddStudentOpen(false);
      loadData();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  // Edit student modal open
  function openEditStudent(e: EnrollmentItem) {
    setEditingStudent(e);
    setEditStudentForm({
      firstName: e.student?.firstName || "",
      lastName: e.student?.lastName || "",
      nationalCode: e.student?.nationalCode || "",
      phoneNumber: e.student?.phoneNumber || "",
      classRoomId: e.classRoom?.id || classroomId,
      guardianPhone1: e.guardianPhone1 || "",
      guardianPhone2: e.guardianPhone2 || "",
      status: e.status || "ACTIVE",
    });
  }

  // Save edit student handler
  async function handleSaveEditStudent(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editingStudent) return;
    setEditStudentSubmitting(true);
    try {
      const payload = {
        firstName: editStudentForm.firstName.trim(),
        lastName: editStudentForm.lastName.trim(),
        nationalCode: toEnglishDigits(editStudentForm.nationalCode.trim()),
        phoneNumber: toEnglishDigits(editStudentForm.phoneNumber.trim()),
        classRoomId: editStudentForm.classRoomId || undefined,
        guardianPhone1: toEnglishDigits(editStudentForm.guardianPhone1.trim()),
        guardianPhone2: editStudentForm.guardianPhone2.trim()
          ? toEnglishDigits(editStudentForm.guardianPhone2.trim())
          : undefined,
        status: editStudentForm.status,
      };

      const r = await fetch(`/api/v1/principal/students?id=${editingStudent.id}&schoolId=${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ویرایش اطلاعات دانش‌آموز ناموفق بود.");
        return;
      }
      toast.success("پرونده دانش‌آموز با موفقیت ویرایش شد.");
      setEditingStudent(null);
      loadData();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEditStudentSubmitting(false);
    }
  }

  // Delete student enrollment
  async function handleDeleteStudent(enrollmentId: string, name: string) {
    if (!confirm(`آیا از لغو ثبت‌نام و حذف «${name}» اطمینان دارید؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/students?id=${enrollmentId}&schoolId=${schoolId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در حذف عضویت دانش‌آموز.");
        return;
      }
      toast.success(`عضویت «${name}» با موفقیت لغو شد.`);
      loadData();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
        <p className="text-sm text-muted-foreground">در حال بارگذاری اطلاعات کلاس...</p>
      </div>
    );
  }

  if (!school || !classroom) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          icon={DoorClosed}
          title="کلاس مورد نظر یافت نشد"
          description="شناسه کلاس یا مدرسه نامعتبر است یا این کلاس حذف شده است."
          action={
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/super-admin/schools/${schoolId}`}>بازگشت به مدرسه</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const activeCount = classroomStudents.filter((e) => e.status === "ACTIVE").length;
  const pendingCount = classroomStudents.filter((e) => e.status === "PENDING_CONFIRMATION").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* ── Breadcrumb & Back Link ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href="/super-admin/schools" className="hover:text-navy transition-colors">
            مدارس
          </Link>
          <span>/</span>
          <Link href={`/super-admin/schools/${schoolId}`} className="hover:text-navy transition-colors">
            {school.name}
          </Link>
          <span>/</span>
          <span>کلاس‌ها</span>
          <span>/</span>
          <span className="font-semibold text-foreground">{classroom.name}</span>
        </div>

        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs cursor-pointer">
          <Link href={`/super-admin/schools/${schoolId}`}>
            <ArrowRight className="h-3.5 w-3.5" />
            <span>بازگشت به مدرسه</span>
          </Link>
        </Button>
      </div>

      {/* ── Page Header ── */}
      <PageHeader
        title={`کلاس ${classroom.name}`}
        icon={DoorClosed}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span>مدرسه {school.name}</span>
            <span>•</span>
            <Badge variant="outline" className="text-xs">
              پایه {classroom.gradeLevel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {classroom.major ? getMajorLabel(classroom.major) : "عمومی"}
            </Badge>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditClassroomForm({
                  name: classroom.name,
                  gradeLevel: classroom.gradeLevel,
                  major: classroom.major,
                });
                setEditClassroomOpen(true);
              }}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              <Pencil className="h-4 w-4" />
              <span>ویرایش مشخصات کلاس</span>
            </Button>
            <Button
              onClick={() => setAddStudentOpen(true)}
              size="sm"
              className="bg-emerald hover:bg-emerald-dark text-white text-xs gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>ثبت‌نام دانش‌آموز جدید در این کلاس</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards Grid ── */}
      <KpiCardGrid
        cards={[
          {
            label: "کل دانش‌آموزان کلاس",
            value: classroomStudents.length,
            icon: GraduationCap,
            tint: "navy",
          },
          {
            label: "دانش‌آموزان فعال",
            value: activeCount,
            icon: ShieldCheck,
            tint: "emerald",
          },
          {
            label: "در انتظار تایید",
            value: pendingCount,
            icon: Clock,
            tint: "warning",
          },
          {
            label: "رشته تحصیلی",
            value: classroom.major ? getMajorLabel(classroom.major) : "عمومی",
            icon: BookOpen,
            tint: "info",
          },
        ]}
      />

      {/* ── Students List Section ── */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-3 gap-3">
          <div>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-navy" />
              <span>لیست کامل دانش‌آموزان کلاس {classroom.name}</span>
            </CardTitle>
            <CardDescription className="mt-0.5">
              مدیریت، جستجو و ویرایش اطلاعات پرونده تحصیلی دانش‌آموزان ثبت‌نام‌شده
            </CardDescription>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="جستجو نام، کد ملی یا شماره همراه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pr-9 pl-3 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
                <SelectItem value="ACTIVE">فقط فعال</SelectItem>
                <SelectItem value="PENDING_CONFIRMATION">در انتظار تایید</SelectItem>
                <SelectItem value="ARCHIVED">آرشیو شده</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {classroomStudents.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="هنوز دانش‌آموزی در این کلاس ثبت‌نام نکرده است."
              description="با دکمه زیر می‌توانید اولین دانش‌آموز این کلاس را ثبت‌نام کنید."
              action={
                <Button
                  onClick={() => setAddStudentOpen(true)}
                  size="sm"
                  className="bg-emerald hover:bg-emerald-dark text-white text-xs gap-1.5 cursor-pointer mt-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>ثبت‌نام اولین دانش‌آموز</span>
                </Button>
              }
            />
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              دانش‌آموزی با فیلترهای انتخاب‌شده یافت نشد.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden" dir="rtl">
              <Table className="sticky-table-header w-full" dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-[50px] min-w-[50px]">#</TableHead>
                    <TableHead className="text-right min-w-[180px]">نام و نام خانوادگی</TableHead>
                    <TableHead className="text-right min-w-[120px]">کد ملی</TableHead>
                    <TableHead className="text-right min-w-[130px]">شماره همراه دانش‌آموز</TableHead>
                    <TableHead className="text-right min-w-[130px]">شماره ولی (پیامک)</TableHead>
                    <TableHead className="text-right min-w-[110px]">وضعیت پرونده</TableHead>
                    <TableHead className="text-right min-w-[120px]">تاریخ ثبت‌نام</TableHead>
                    <TableHead className="text-left w-[110px] min-w-[110px] pl-4">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((e, index) => {
                    const stFirst = e.student?.firstName || "";
                    const stLast = e.student?.lastName || "";
                    const stName = `${stFirst} ${stLast}`.trim() || "—";
                    const stNc = e.student?.nationalCode || "—";
                    const stPhone = e.student?.phoneNumber || "—";
                    return (
                      <TableRow key={e.id} className="data-table-row">
                        <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                          {(index + 1).toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-navy">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-navy/10 text-navy flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <span>{stName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {stNc}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {stPhone}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {e.guardianPhone1 || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={e.status === "ACTIVE" ? "default" : "outline"}
                            className={e.status === "ACTIVE" ? "bg-emerald text-white text-[11px]" : "text-[11px]"}
                          >
                            {e.status === "ACTIVE" ? "فعال" : e.status === "PENDING_CONFIRMATION" ? "در انتظار تایید" : "آرشیو"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {toPersianDate(e.createdAt)}
                        </TableCell>
                        <TableCell className="text-left w-[110px] min-w-[110px] pl-4">
                          <div className="flex items-center justify-start gap-1" dir="ltr">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditStudent(e)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-navy hover:bg-navy/10 cursor-pointer"
                              title="ویرایش پرونده"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStudent(e.id, stName)}
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

          {classroomStudents.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                نمایش {filteredStudents.length.toLocaleString("fa-IR")} از {classroomStudents.length.toLocaleString("fa-IR")} دانش‌آموز
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Edit Classroom ── */}
      <Dialog open={editClassroomOpen} onOpenChange={setEditClassroomOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              <span>ویرایش کلاس</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEditClassroom} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="edit-cls-name" className="text-xs">نام کلاس</Label>
              <Input
                id="edit-cls-name"
                value={editClassroomForm.name}
                onChange={(e) => setEditClassroomForm({ ...editClassroomForm, name: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-cls-grade" className="text-xs">پایه تحصیلی</Label>
              <Select
                value={editClassroomForm.gradeLevel}
                onValueChange={(val) => setEditClassroomForm({ ...editClassroomForm, gradeLevel: val })}
              >
                <SelectTrigger id="edit-cls-grade" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {gradeHasMajor(editClassroomForm.gradeLevel) && (
              <div className="space-y-1">
                <Label htmlFor="edit-cls-major" className="text-xs">رشته تحصیلی</Label>
                <Select
                  value={editClassroomForm.major || ""}
                  onValueChange={(val) => setEditClassroomForm({ ...editClassroomForm, major: val })}
                >
                  <SelectTrigger id="edit-cls-major" className="h-9 text-xs">
                    <SelectValue placeholder="انتخاب رشته..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {MAJORS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button type="submit" disabled={editClassroomSubmitting} className="bg-emerald hover:bg-emerald-dark text-white text-xs h-9">
                {editClassroomSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره تغییرات"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditClassroomOpen(false)} className="text-xs h-9">
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Student to this Classroom ── */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-navy" />
              <span>ثبت‌نام دانش‌آموز جدید در کلاس {classroom.name}</span>
            </DialogTitle>
            <DialogDescription>
              مشخصات فردی و اطلاعات اولیا را برای ثبت پرونده در پایه {classroom.gradeLevel} وارد نمایید.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStudent} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-add-ln" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="stu-add-ln"
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  placeholder="محمدی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-add-fn" className="text-xs">نام</Label>
                <Input
                  id="stu-add-fn"
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  placeholder="سارا"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-add-nc" className="text-xs">کد ملی</Label>
                <Input
                  id="stu-add-nc"
                  value={studentForm.nationalCode}
                  onChange={(e) => setStudentForm({ ...studentForm, nationalCode: e.target.value })}
                  placeholder="0012345678"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-add-phone" className="text-xs">شماره همراه دانش‌آموز</Label>
                <Input
                  id="stu-add-phone"
                  value={studentForm.phoneNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">کلاس تخصیص‌یافته</Label>
              <div className="h-9 px-3 border rounded-md flex items-center bg-muted/40 text-xs font-medium text-navy">
                {classroom.name} (پایه {classroom.gradeLevel})
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-add-g1" className="text-xs">شماره ولی ۱ (ارسال پیامک)</Label>
                <Input
                  id="stu-add-g1"
                  value={studentForm.guardianPhone1}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone1: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-add-g2" className="text-xs">شماره ولی ۲ (اختیاری)</Label>
                <Input
                  id="stu-add-g2"
                  value={studentForm.guardianPhone2}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone2: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald hover:bg-emerald-dark text-xs h-9 text-white gap-1.5"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>ثبت‌نام در این کلاس</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddStudentOpen(false)}
                className="text-xs h-9"
              >
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Student ── */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Pencil className="h-4 w-4 text-navy" />
              <span>ویرایش مشخصات دانش‌آموز</span>
            </DialogTitle>
            <DialogDescription>
              ویرایش اطلاعات فردی، شماره‌های تماس و کلاس تحصیلی
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditStudent} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-ln-cls" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="stu-edit-ln-cls"
                  value={editStudentForm.lastName}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, lastName: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-fn-cls" className="text-xs">نام</Label>
                <Input
                  id="stu-edit-fn-cls"
                  value={editStudentForm.firstName}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, firstName: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-nc-cls" className="text-xs">کد ملی</Label>
                <Input
                  id="stu-edit-nc-cls"
                  value={editStudentForm.nationalCode}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, nationalCode: e.target.value })}
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-ph-cls" className="text-xs">شماره همراه دانش‌آموز</Label>
                <Input
                  id="stu-edit-ph-cls"
                  value={editStudentForm.phoneNumber}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, phoneNumber: e.target.value })}
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">کلاس تحصیلی</Label>
                <Select
                  value={editStudentForm.classRoomId}
                  onValueChange={(val) => setEditStudentForm({ ...editStudentForm, classRoomId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="انتخاب کلاس" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {school.classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name} (پایه {c.gradeLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">وضعیت پرونده</Label>
                <Select
                  value={editStudentForm.status}
                  onValueChange={(val: any) => setEditStudentForm({ ...editStudentForm, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="ACTIVE" className="text-xs">فعال</SelectItem>
                    <SelectItem value="PENDING_CONFIRMATION" className="text-xs">در انتظار تایید</SelectItem>
                    <SelectItem value="ARCHIVED" className="text-xs">آرشیو شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-g1-cls" className="text-xs">شماره ولی ۱ (پیامک)</Label>
                <Input
                  id="stu-edit-g1-cls"
                  value={editStudentForm.guardianPhone1}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, guardianPhone1: e.target.value })}
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-g2-cls" className="text-xs">شماره ولی ۲ (اختیاری)</Label>
                <Input
                  id="stu-edit-g2-cls"
                  value={editStudentForm.guardianPhone2}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, guardianPhone2: e.target.value })}
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button
                type="submit"
                disabled={editStudentSubmitting}
                className="bg-navy hover:bg-navy-dark text-xs h-9 text-white gap-1.5"
              >
                {editStudentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
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

// 1790849362

// 1790850722

// 1790851051
