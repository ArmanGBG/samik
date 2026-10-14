"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRealtimeEvent } from "@/lib/realtime/realtime-context";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Building2,
  Users,
  GraduationCap,
  DoorClosed,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  UserCog,
  Trash2,
  Pencil,
  PauseCircle,
  PlayCircle,
  MessageSquareText,
  Clock, CalendarClock,
  Sparkles,
  Search,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDate } from "@/lib/date-utils";
import { toEnglishDigits } from "@/lib/persian-digits";
import { PageHeader } from "@/components/shared/page-header";
import { TimetableBuilder } from "@/components/dashboard/timetable-builder";
import { SubjectsManager } from "@/components/dashboard/subjects-manager";
import { BellSchedulesManager } from "@/components/dashboard/bell-schedules-manager";
import { GRADES, MAJORS, gradeHasMajor, getMajorLabel } from "@/lib/constants/grades";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { TeacherScheduleSheet, TeacherSlotData } from "@/components/dashboard/teacher-schedule-sheet";

interface StaffItem {
  id: string;
  userId: string;
  role: "PRINCIPAL" | "DEPUTY" | "TEACHER";
  createdAt: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  nationalCode?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    nationalCode: string;
  };
}

interface ClassroomItem {
  id: string;
  gradeLevel: string;
  major: string | null;
  name: string;
  _count: { enrollments: number };
}

interface SubjectItem {
  id: string;
  title: string;
}

interface BellItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
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

interface SchoolDetails {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
  smsBalance: number;
  createdAt: string;
  termStartDate: string | null;
  staffEmployments: StaffItem[];
  classrooms: ClassroomItem[];
  subjects: SubjectItem[];
  bellSchedules: BellItem[];
  enrollments: EnrollmentItem[];
  _count: {
    staffEmployments: number;
    enrollments: number;
    classrooms: number;
    subjects: number;
    bellSchedules: number;
  };
}


export function SchoolDetailsManager({
  schoolId,
  isPrincipal = false,
  defaultTab,
  defaultSubTab,
}: {
  schoolId?: string;
  isPrincipal?: boolean;
  defaultTab?: "staff" | "students" | "classrooms" | "timetable";
  defaultSubTab?: "builder" | "subjects" | "bells";
}) {
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab ?? "staff");
  const [subTab, setSubTab] = useState(defaultSubTab ?? "builder");

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (defaultSubTab) setSubTab(defaultSubTab);
  }, [defaultSubTab]);

  const activeSchoolId = school?.id ?? schoolId ?? "";

  // Dialogs
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addClassroomOpen, setAddClassroomOpen] = useState(false);
  const [chargeSmsOpen, setChargeSmsOpen] = useState(false);
  const [editSchoolOpen, setEditSchoolOpen] = useState(false);
  const [editSchoolForm, setEditSchoolForm] = useState({
    name: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED"
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingClassroom, setEditingClassroom] = useState<ClassroomItem | null>(null);
  const [editClassroomForm, setEditClassroomForm] = useState({
    name: "",
    gradeLevel: "دهم",
    major: "MATHEMATICS",
  });
  const [editClassroomSubmitting, setEditClassroomSubmitting] = useState(false);

  // Forms
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    nationalCode: "",
    role: "TEACHER" as "DEPUTY" | "TEACHER",
  });

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    phoneNumber: "",
    classRoomId: "",
    guardianPhone1: "",
    guardianPhone2: "",
  });

  const [classroomForm, setClassroomForm] = useState({
    gradeLevel: "دهم",
    name: "",
    major: "MATHEMATICS",
  });

  const [smsChargeAmount, setSmsChargeAmount] = useState("500");

  // Selected classroom to show students list modal & class filter
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomItem | null>(null);
  const [classStudentSearch, setClassStudentSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");

  // Teacher Schedule Sheet state & Timetable slots & Staff filter
  const [timetableSlots, setTimetableSlots] = useState<TeacherSlotData[]>([]);
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<StaffItem | null>(null);
  const [teacherScheduleOpen, setTeacherScheduleOpen] = useState(false);
  const [staffRoleFilter, setStaffRoleFilter] = useState<"ALL" | "TEACHER" | "DEPUTY" | "PRINCIPAL">("ALL");

  function openTeacherSchedule(item: StaffItem) {
    setSelectedTeacherForSchedule(item);
    setTeacherScheduleOpen(true);
  }

  const classroomStudents = useMemo(() => {
    if (!selectedClassroom || !school) return [];
    return school.enrollments.filter((e) => e.classRoom?.id === selectedClassroom.id);
  }, [selectedClassroom, school]);

  const filteredClassroomStudents = useMemo(() => {
    const q = classStudentSearch.trim().toLowerCase();
    if (!q) return classroomStudents;
    return classroomStudents.filter((e) => {
      const name = `${e.student?.firstName || ""} ${e.student?.lastName || ""}`.toLowerCase();
      const nc = (e.student?.nationalCode || "").toLowerCase();
      const phone = (e.student?.phoneNumber || "").toLowerCase();
      return name.includes(q) || nc.includes(q) || phone.includes(q);
    });
  }, [classroomStudents, classStudentSearch]);

  const filteredEnrollments = useMemo(() => {
    if (!school) return [];
    if (selectedClassFilter === "ALL") return school.enrollments;
    return school.enrollments.filter((e) => e.classRoom?.id === selectedClassFilter);
  }, [school, selectedClassFilter]);

  const filteredStaff = useMemo(() => {
    if (!school) return [];
    if (staffRoleFilter === "ALL") return school.staffEmployments;
    return school.staffEmployments.filter((s) => s.role === staffRoleFilter);
  }, [school, staffRoleFilter]);

  const loadSchool = useCallback(async () => {
    setLoading(true);
    try {
      const targetId = schoolId || school?.id;
      const url = isPrincipal
        ? "/api/v1/principal/school-details"
        : `/api/v1/super-admin/schools?id=${targetId}`;
      const qs = isPrincipal ? "" : (targetId ? `?schoolId=${targetId}` : "");

      const [schoolRes, slotsRes] = await Promise.all([
        fetch(url).then((r) => r.json()),
        fetch(`/api/v1/deputy/timetable${qs}`)
          .then((r) => r.json())
          .catch(() => ({ ok: false, slots: [] })),
      ]);

      if (schoolRes.ok) {
        setSchool(schoolRes.school);
      } else {
        toast.error(schoolRes.error ?? "خطا در دریافت اطلاعات مدرسه.");
      }

      if (slotsRes.ok && slotsRes.slots) {
        setTimetableSlots(slotsRes.slots);
      }
    } catch (err) {
      console.error("[LOAD_SCHOOL_DETAILS_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, isPrincipal]);

  useEffect(() => {
    loadSchool();
  }, [loadSchool]);

  // Real-time synchronization
  useRealtimeEvent("*", () => {
    void loadSchool();
  });

  // Toggle status
  async function handleToggleStatus() {
    if (!school) return;
    const isSuspending = school.status === "ACTIVE";
    const actionText = isSuspending ? "تعلیق" : "فعال‌سازی";
    if (!confirm(`آیا از ${actionText} مدرسهٔ «${school.name}» اطمینان دارید؟`)) return;

    try {
      const r = await fetch(`/api/v1/super-admin/schools?id=${school.id}`, {
        method: isSuspending ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: isSuspending ? undefined : JSON.stringify({ status: "ACTIVE" }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? `خطا در ${actionText} مدرسه.`);
        return;
      }
      toast.success(`مدرسه با موفقیت ${isSuspending ? "تعلیق شد" : "فعال شد"}.`);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  // Charge SMS
  async function handleChargeSms(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    const amount = parseInt(toEnglishDigits(smsChargeAmount), 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("مبلغ شارژ باید یک عدد مثبت باشد.");
      return;
    }
    setSubmitting(true);
    try {
      const newBalance = school.smsBalance + amount;
      const r = await fetch(`/api/v1/super-admin/schools?id=${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsBalance: newBalance }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در شارژ پیامک.");
        return;
      }
      toast.success(`${amount.toLocaleString("fa-IR")} پیامک به موجودی مدرسه اضافه شد.`);
      setChargeSmsOpen(false);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  // Add Staff (Super Admin adds staff directly to this school)
  async function handleSaveEditSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!editSchoolForm.name.trim()) return;
    setSubmitting(true);
    try {
      const url = isPrincipal
        ? "/api/v1/principal/school-details"
        : `/api/v1/super-admin/schools?id=${activeSchoolId}`;
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSchoolForm.name.trim(),
          ...(isPrincipal ? {} : { status: editSchoolForm.status }),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error || "خطا در ویرایش اطلاعات مدرسه");
      } else {
        toast.success("اطلاعات مدرسه با موفقیت ویرایش شد.");
        setEditSchoolOpen(false);
        loadSchool();
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        firstName: staffForm.firstName.trim(),
        lastName: staffForm.lastName.trim(),
        phone: toEnglishDigits(staffForm.phone.trim()),
        nationalCode: toEnglishDigits(staffForm.nationalCode.trim()) || undefined,
        role: staffForm.role,
      };

      const r = await fetch(`/api/v1/principal/staff?schoolId=${activeSchoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "افزودن پرسنل ناموفق بود.");
        return;
      }
      toast.success(`${staffForm.role === "DEPUTY" ? "ناظم / معاون" : "معلم"} «${payload.firstName} ${payload.lastName}» با موفقیت افزوده شد.`);
      setStaffForm({
        firstName: "",
        lastName: "",
        phone: "",
        nationalCode: "",
        role: "TEACHER",
      });
      setAddStaffOpen(false);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  // Add Student (Super Admin adds student directly to this school)
  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        nationalCode: toEnglishDigits(studentForm.nationalCode.trim()) || undefined,
        phoneNumber: toEnglishDigits(studentForm.phoneNumber.trim()),
        classRoomId: studentForm.classRoomId || undefined,
        guardianPhone1: toEnglishDigits(studentForm.guardianPhone1.trim()),
        guardianPhone2: studentForm.guardianPhone2.trim()
          ? toEnglishDigits(studentForm.guardianPhone2.trim())
          : undefined,
      };

      const r = await fetch(`/api/v1/principal/students?schoolId=${activeSchoolId}`, {
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
      setStudentForm({
        firstName: "",
        lastName: "",
        nationalCode: "",
        phoneNumber: "",
        classRoomId: "",
        guardianPhone1: "",
        guardianPhone2: "",
      });
      setAddStudentOpen(false);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClassroom(classroomId: string, classroomName: string) {
    if (!confirm(`آیا از حذف کلاس «${classroomName}» اطمینان دارید؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/classrooms?id=${classroomId}&schoolId=${activeSchoolId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error || "حذف کلاس ناموفق بود.");
      } else {
        toast.success(`کلاس «${classroomName}» با موفقیت حذف شد.`);
        loadSchool();
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور");
    }
  }

  async function handleSaveEditClassroom(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClassroom || !editClassroomForm.name.trim()) return;
    setEditClassroomSubmitting(true);
    try {
      const payload = {
        name: editClassroomForm.name.trim(),
        gradeLevel: editClassroomForm.gradeLevel,
        major: gradeHasMajor(editClassroomForm.gradeLevel) ? editClassroomForm.major : null,
      };
      const r = await fetch(`/api/v1/principal/classrooms?id=${editingClassroom.id}&schoolId=${activeSchoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error || "خطا در ویرایش کلاس");
      } else {
        toast.success("کلاس با موفقیت ویرایش شد.");
        setEditingClassroom(null);
        loadSchool();
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setEditClassroomSubmitting(false);
    }
  }

  // Add Classroom (Super Admin adds classroom directly to this school)
  async function handleAddClassroom(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        gradeLevel: classroomForm.gradeLevel,
        name: classroomForm.name.trim(),
        major: gradeHasMajor(classroomForm.gradeLevel) ? classroomForm.major : null,
      };

      const r = await fetch(`/api/v1/principal/classrooms?schoolId=${activeSchoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "افزودن کلاس ناموفق بود.");
        return;
      }
      toast.success(`کلاس «${payload.name}» با موفقیت ایجاد شد.`);
      setClassroomForm({
        gradeLevel: "دهم",
        name: "",
        major: "MATHEMATICS",
      });
      setAddClassroomOpen(false);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete staff
  async function handleDeleteStaff(employmentId: string, name: string) {
    if (!confirm(`آیا از لغو دسترسی «${name}» اطمینان دارید؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/staff?id=${employmentId}&schoolId=${activeSchoolId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در حذف عضو کادر.");
        return;
      }
      toast.success(`دسترسی «${name}» با موفقیت لغو شد.`);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  // Edit Staff state and handlers
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nationalCode: "",
    role: "TEACHER" as "DEPUTY" | "TEACHER",
  });
  const [editStaffSubmitting, setEditStaffSubmitting] = useState(false);

  function openEditStaff(s: StaffItem) {
    const firstName = s.firstName || s.user?.firstName || "";
    const lastName = s.lastName || s.user?.lastName || "";
    const phone = s.phoneNumber || s.user?.phoneNumber || "";
    const rawNc = s.nationalCode || s.user?.nationalCode || "";
    const nc = rawNc.startsWith("TEMP-") || rawNc.startsWith("PENDING-") ? "" : rawNc;
    setEditingStaff(s);
    setEditStaffForm({
      firstName,
      lastName,
      phoneNumber: phone,
      nationalCode: nc,
      role: s.role === "PRINCIPAL" ? "TEACHER" : s.role,
    });
  }

  async function handleSaveEditStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setEditStaffSubmitting(true);
    try {
      const payload: Record<string, string | undefined> = {
        firstName: editStaffForm.firstName.trim(),
        lastName: editStaffForm.lastName.trim(),
        phoneNumber: toEnglishDigits(editStaffForm.phoneNumber.trim()),
        nationalCode: toEnglishDigits(editStaffForm.nationalCode.trim()) || undefined,
      };
      if (editingStaff.role !== "PRINCIPAL") {
        payload.role = editStaffForm.role;
      }

      const r = await fetch(`/api/v1/principal/staff?id=${editingStaff.id}&schoolId=${activeSchoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ویرایش پرسنل ناموفق بود.");
        return;
      }
      toast.success("مشخصات عضو کادر با موفقیت ویرایش شد.");
      setEditingStaff(null);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEditStaffSubmitting(false);
    }
  }

  // Edit Student state and handlers
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

  function openEditStudent(e: EnrollmentItem) {
    const rawNc = e.student?.nationalCode || "";
    const cleanNc = rawNc.startsWith("TEMP-") || rawNc.startsWith("PENDING-") ? "" : rawNc;
    setEditingStudent(e);
    setEditStudentForm({
      firstName: e.student?.firstName || "",
      lastName: e.student?.lastName || "",
      nationalCode: cleanNc,
      phoneNumber: e.student?.phoneNumber || "",
      classRoomId: e.classRoom?.id || "",
      guardianPhone1: e.guardianPhone1 || "",
      guardianPhone2: e.guardianPhone2 || "",
      status: e.status || "ACTIVE",
    });
  }

  async function handleSaveEditStudent(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editingStudent) return;
    setEditStudentSubmitting(true);
    try {
      const payload = {
        firstName: editStudentForm.firstName.trim(),
        lastName: editStudentForm.lastName.trim(),
        nationalCode: toEnglishDigits(editStudentForm.nationalCode.trim()) || undefined,
        phoneNumber: toEnglishDigits(editStudentForm.phoneNumber.trim()),
        classRoomId: editStudentForm.classRoomId || undefined,
        guardianPhone1: toEnglishDigits(editStudentForm.guardianPhone1.trim()),
        guardianPhone2: editStudentForm.guardianPhone2.trim()
          ? toEnglishDigits(editStudentForm.guardianPhone2.trim())
          : undefined,
        status: editStudentForm.status,
      };

      const r = await fetch(`/api/v1/principal/students?id=${editingStudent.id}&schoolId=${activeSchoolId}`, {
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
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEditStudentSubmitting(false);
    }
  }

  async function handleDeleteStudent(enrollmentId: string, name: string) {
    if (!confirm(`آیا از لغو ثبت‌نام و حذف «${name}» از این مدرسه اطمینان دارید؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/students?id=${enrollmentId}&schoolId=${activeSchoolId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در حذف عضویت دانش‌آموز.");
        return;
      }
      toast.success(`عضویت «${name}» با موفقیت لغو شد.`);
      loadSchool();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
        <p className="text-sm text-muted-foreground">در حال بارگذاری اطلاعات مدرسه...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          icon={Building2}
          title={isPrincipal ? "اطلاعات مدرسه دریافت نشد" : "مدرسه مورد نظر یافت نشد"}
          description={isPrincipal ? "لطفاً اتصال اینترنت خود را بررسی نموده و صفحه را مجدداً بارگذاری کنید." : "شناسه مدرسه نامعتبر است یا این مدرسه حذف شده است."}
          action={
            !isPrincipal ? (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/super-admin/schools">بازگشت به لیست مدارس</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title={isPrincipal ? `داشبورد مدیریت مدرسه ${school.name}` : school.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono text-xs" inputMode="numeric" dir="ltr">
              {school.subdomain}.samik.app
            </Badge>
            <Badge
              variant={school.status === "ACTIVE" ? "default" : "destructive"}
              className={school.status === "ACTIVE" ? "bg-emerald text-white text-[11px]" : "text-[11px]"}
            >
              {school.status === "ACTIVE" ? "فعال" : "معلق"}
            </Badge>
            <span className="text-muted-foreground text-xs">
              • موجودی پیامک: <span className="font-bold text-foreground tabular-nums">{school.smsBalance.toLocaleString("fa-IR")}</span>
            </span>
          </div>
        }
        icon={Building2}
        actions={
          <div className="flex items-center gap-2">
            {!isPrincipal && (
              <Button
                onClick={() => setChargeSmsOpen(true)}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-navy hover:text-navy cursor-pointer"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                <span>شارژ پیامک</span>
              </Button>
            )}

            <Button
              onClick={() => {
                setEditSchoolForm({ name: school.name, status: school.status });
                setEditSchoolOpen(true);
              }}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-navy hover:text-navy cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>ویرایش مشخصات</span>
            </Button>

            {!isPrincipal && (
              <Button
                onClick={handleToggleStatus}
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5 text-xs cursor-pointer",
                  school.status === "ACTIVE"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-emerald hover:bg-emerald/10"
                )}
              >
                {school.status === "ACTIVE" ? (
                  <>
                    <PauseCircle className="h-3.5 w-3.5" />
                    <span>تعلیق مدرسه</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>فعال‌سازی مدرسه</span>
                  </>
                )}
              </Button>
            )}

            {!isPrincipal && (
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs cursor-pointer">
                <Link href="/super-admin/schools">
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>لیست مدارس</span>
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* ── Executive Metric Tabs Navigation ── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "classrooms" | "students" | "timetable" | "staff")} dir="rtl" className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-transparent p-0 h-auto w-full border-0 select-none">
          <TabsTrigger
            value="staff"
            className={cn(
              "kpi-card rounded-xl border p-4 flex items-center gap-3 transition-all text-right justify-start h-auto cursor-pointer",
              activeTab === "staff"
                ? "bg-white border-navy ring-2 ring-navy/20 shadow-md text-navy"
                : "bg-white/70 hover:bg-white border-border/80 text-muted-foreground hover:border-navy/30 hover:shadow-sm"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform",
                activeTab === "staff" ? "bg-navy text-white shadow-sm" : "bg-navy/10 text-navy"
              )}
            >
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium truncate", activeTab === "staff" ? "text-navy font-semibold" : "text-muted-foreground")}>
                کادر و پرسنل
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums leading-none text-navy">
                  {school._count.staffEmployments.toLocaleString("fa-IR")}
                </span>
                <span className="text-[11px] text-muted-foreground">نفر</span>
              </div>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="students"
            className={cn(
              "kpi-card rounded-xl border p-4 flex items-center gap-3 transition-all text-right justify-start h-auto cursor-pointer",
              activeTab === "students"
                ? "bg-white border-emerald ring-2 ring-emerald/20 shadow-md text-emerald-dark"
                : "bg-white/70 hover:bg-white border-border/80 text-muted-foreground hover:border-emerald/30 hover:shadow-sm"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform",
                activeTab === "students" ? "bg-emerald text-white shadow-sm" : "bg-emerald/10 text-emerald"
              )}
            >
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium truncate", activeTab === "students" ? "text-emerald-dark font-semibold" : "text-muted-foreground")}>
                دانش‌آموزان ثبت‌نامی
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums leading-none text-emerald">
                  {school._count.enrollments.toLocaleString("fa-IR")}
                </span>
                <span className="text-[11px] text-muted-foreground">نفر</span>
              </div>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="classrooms"
            className={cn(
              "kpi-card rounded-xl border p-4 flex items-center gap-3 transition-all text-right justify-start h-auto cursor-pointer",
              activeTab === "classrooms"
                ? "bg-white border-info ring-2 ring-info/20 shadow-md text-info"
                : "bg-white/70 hover:bg-white border-border/80 text-muted-foreground hover:border-info/30 hover:shadow-sm"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform",
                activeTab === "classrooms" ? "bg-info text-white shadow-sm" : "bg-info/10 text-info"
              )}
            >
              <DoorClosed className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium truncate", activeTab === "classrooms" ? "text-info font-semibold" : "text-muted-foreground")}>
                کلاس‌های درس
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums leading-none text-info">
                  {school.classrooms.length.toLocaleString("fa-IR")}
                </span>
                <span className="text-[11px] text-muted-foreground">کلاس</span>
              </div>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="timetable"
            className={cn(
              "kpi-card rounded-xl border p-4 flex items-center gap-3 transition-all text-right justify-start h-auto cursor-pointer",
              activeTab === "timetable"
                ? "bg-white border-warning ring-2 ring-warning/20 shadow-md text-warning"
                : "bg-white/70 hover:bg-white border-border/80 text-muted-foreground hover:border-warning/30 hover:shadow-sm"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform",
                activeTab === "timetable" ? "bg-warning text-white shadow-sm" : "bg-warning/10 text-warning"
              )}
            >
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium truncate", activeTab === "timetable" ? "text-warning font-semibold" : "text-muted-foreground")}>
                برنامه هفتگی و زنگ‌ها
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold tabular-nums leading-none text-warning">
                  {school._count.subjects.toLocaleString("fa-IR")}
                </span>
                <span className="text-[11px] text-muted-foreground">درس تعریف‌شده</span>
              </div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Staff Management ── */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
              <div>
                <CardTitle className="text-base text-navy">کادر آموزشی و اداری مدرسه</CardTitle>
                <CardDescription>مدیریت مدیران، معاونین و معلمان این مدرسه</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setStaffRoleFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                      staffRoleFilter === "ALL"
                        ? "bg-white text-navy shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-navy"
                    )}
                  >
                    همه ({school.staffEmployments.length.toLocaleString("fa-IR")})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffRoleFilter("TEACHER")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                      staffRoleFilter === "TEACHER"
                        ? "bg-white text-navy shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-navy"
                    )}
                  >
                    معلمان ({school.staffEmployments.filter((s) => s.role === "TEACHER").length.toLocaleString("fa-IR")})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffRoleFilter("DEPUTY")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                      staffRoleFilter === "DEPUTY"
                        ? "bg-white text-navy shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-navy"
                    )}
                  >
                    معاونین ({school.staffEmployments.filter((s) => s.role === "DEPUTY").length.toLocaleString("fa-IR")})
                  </button>
                </div>
                <Button
                  onClick={() => setAddStaffOpen(true)}
                  size="sm"
                  className="bg-navy hover:bg-navy-dark text-xs gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>افزودن عضو جدید کادر</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStaff.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="هیچ عضوی با این نقش یافت نشد."
                  description="می‌توانید فیلتر نقش را تغییر داده یا با استفاده از دکمه بالا، عضو جدید اضافه کنید."
                />
              ) : (
                <div className="rounded-lg border overflow-hidden" dir="rtl">
                  <Table className="sticky-table-header w-full" dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right min-w-[180px]">نام و نام خانوادگی</TableHead>
                        <TableHead className="text-right min-w-[130px]">نقش سازمانی</TableHead>
                        <TableHead className="text-right min-w-[200px]">تخصیص تدریس و برنامه</TableHead>
                        <TableHead className="text-right min-w-[130px]">شماره همراه</TableHead>
                        <TableHead className="text-right min-w-[120px]">کد ملی</TableHead>
                        <TableHead className="text-right min-w-[110px]">تاریخ عضویت</TableHead>
                        <TableHead className="text-left w-[110px] min-w-[110px] pl-4">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((item) => {
                        const firstName = item.firstName || item.user?.firstName || "";
                        const lastName = item.lastName || item.user?.lastName || "";
                        const fullName = item.fullName || `${firstName} ${lastName}`.trim() || "—";
                        const phone = item.phoneNumber || item.user?.phoneNumber || "—";
                        const nc = item.nationalCode || item.user?.nationalCode || "—";
                        const teacherUserId = item.user?.id || item.userId;
                        const teacherSlots = timetableSlots.filter((s) => s.teacher?.id === teacherUserId);
                        const slotCount = teacherSlots.length;
                        const classCount = new Set(teacherSlots.map((s) => s.classRoom?.id).filter(Boolean)).size;

                        return (
                          <TableRow key={item.id} className="data-table-row">
                            <TableCell className="text-right font-semibold text-navy">
                              {fullName}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[11px] gap-1",
                                  item.role === "PRINCIPAL"
                                    ? "bg-navy/10 text-navy border-navy/30"
                                    : item.role === "DEPUTY"
                                    ? "bg-emerald/10 text-emerald border-emerald/30"
                                    : "bg-info/10 text-info border-info/30"
                                )}
                              >
                                {item.role === "PRINCIPAL" ? (
                                  <>
                                    <ShieldCheck className="h-3 w-3" />
                                    <span>مدیر مدرسه</span>
                                  </>
                                ) : item.role === "DEPUTY" ? (
                                  <>
                                    <UserCog className="h-3 w-3" />
                                    <span>ناظم / معاون</span>
                                  </>
                                ) : (
                                  <>
                                    <GraduationCap className="h-3 w-3" />
                                    <span>معلم</span>
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.role === "TEACHER" ? (
                                slotCount > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-[11px] bg-slate-50 border-slate-200 text-slate-700 font-normal tabular-nums"
                                    >
                                      {slotCount.toLocaleString("fa-IR")} زنگ • {classCount.toLocaleString("fa-IR")} کلاس
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openTeacherSchedule(item)}
                                      className="h-7 px-2 text-[11px] gap-1 border-navy/20 text-navy hover:bg-navy/10 cursor-pointer shadow-2xs"
                                      title="مشاهده برنامه تدریس"
                                    >
                                      <CalendarDays className="h-3 w-3 text-navy" />
                                      <span>برنامه تدریس</span>
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-muted-foreground">بدون زنگ</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openTeacherSchedule(item)}
                                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-navy cursor-pointer"
                                      title="مشاهده جزئیات برنامه"
                                    >
                                      <CalendarDays className="h-3 w-3 ml-1" />
                                      <span>مشاهده</span>
                                    </Button>
                                  </div>
                                )
                              ) : (
                                <span className="text-[11px] text-muted-foreground">کادر اداری مدرسه</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums">
                              {phone}
                            </TableCell>
                            <TableCell className="text-right">
                              {nc.startsWith("TEMP-") || nc.startsWith("PENDING-") ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] gap-1 font-normal">
                                  کد موقت
                                </Badge>
                              ) : (
                                <span className="font-mono text-xs tabular-nums">{nc}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                              {toPersianDate(item.createdAt)}
                            </TableCell>
                            <TableCell className="text-left w-[110px] min-w-[110px] pl-4">
                              <div className="flex items-center justify-start gap-1" dir="ltr">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditStaff(item)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-navy hover:bg-navy/10 cursor-pointer"
                                  title="ویرایش مشخصات"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {item.role !== "PRINCIPAL" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStaff(item.id, fullName)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                    title="حذف از مدرسه"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
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
        </TabsContent>

        {/* ── Tab 2: Students Management ── */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-navy">دانش‌آموزان ثبت‌نامی مدرسه</CardTitle>
                <CardDescription>ثبت‌نام مستقیم دانش‌آموز جدید و تخصیص به کلاس‌های مدرسه</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {school.classrooms.length > 0 && (
                  <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="همه کلاس‌ها" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="ALL">همه کلاس‌ها ({school.enrollments.length})</SelectItem>
                      {school.classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c._count.enrollments})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  onClick={() => setAddStudentOpen(true)}
                  size="sm"
                  className="bg-emerald hover:bg-emerald-dark text-xs gap-1.5 cursor-pointer shadow-sm text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>ثبت‌نام دانش‌آموز جدید</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEnrollments.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title={
                    selectedClassFilter !== "ALL"
                      ? "دانش‌آموزی در این کلاس یافت نشد."
                      : "هنوز دانش‌آموزی در این مدرسه ثبت‌نام نکرده است."
                  }
                  description={
                    selectedClassFilter !== "ALL"
                      ? "می‌توانید با دکمه بالا، دانش‌آموز جدیدی در این کلاس ثبت‌نام کنید یا فیلتر را پاک نمایید."
                      : "با دکمه بالا می‌توانید اولین دانش‌آموز را به همراه کلاس و شماره اولیا ثبت کنید."
                  }
                  action={
                    selectedClassFilter !== "ALL" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClassFilter("ALL")}
                        className="text-xs mt-2"
                      >
                        نمایش همه کلاس‌ها
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="rounded-lg border overflow-hidden" dir="rtl">
                  <Table className="sticky-table-header w-full" dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right min-w-[180px]">نام و نام خانوادگی</TableHead>
                        <TableHead className="text-right min-w-[120px]">کد ملی</TableHead>
                        <TableHead className="text-right min-w-[140px]">کلاس</TableHead>
                        <TableHead className="text-right min-w-[130px]">شماره موبایل</TableHead>
                        <TableHead className="text-right min-w-[120px]">وضعیت پرونده</TableHead>
                        <TableHead className="text-right min-w-[120px]">تاریخ ثبت‌نام</TableHead>
                        <TableHead className="text-left w-[110px] min-w-[110px] pl-4">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnrollments.map((e) => {
                        const stFirst = e.student?.firstName || "";
                        const stLast = e.student?.lastName || "";
                        const stName = `${stFirst} ${stLast}`.trim() || "—";
                        const stNc = e.student?.nationalCode || "—";
                        const stPhone = e.student?.phoneNumber || "—";
                        return (
                          <TableRow key={e.id} className="data-table-row">
                            <TableCell className="text-right font-semibold text-navy">
                              {stName}
                            </TableCell>
                            <TableCell className="text-right">
                              {stNc.startsWith("TEMP-") || stNc.startsWith("PENDING-") ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] gap-1 font-normal">
                                  کد موقت
                                </Badge>
                              ) : (
                                <span className="font-mono text-xs tabular-nums">{stNc}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {e.classRoom ? (
                                <Badge variant="outline" className="text-xs">
                                  {e.classRoom.name} ({e.classRoom.gradeLevel})
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">— بدون کلاس</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums">
                              {stPhone}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Classrooms Management ── */}
        <TabsContent value="classrooms" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-navy">کلاس‌های درس مدرسه</CardTitle>
                <CardDescription>تعریف کلاس‌ها بر اساس پایه و رشته تحصیلی</CardDescription>
              </div>
              <Button
                onClick={() => setAddClassroomOpen(true)}
                size="sm"
                className="bg-navy hover:bg-navy-dark text-xs gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>افزودن کلاس جدید</span>
              </Button>
            </CardHeader>
            <CardContent>
              {school.classrooms.length === 0 ? (
                <EmptyState
                  icon={DoorClosed}
                  title="هنوز کلاسی برای این مدرسه تعریف نشده است."
                  description="با دکمه بالا، اولین کلاس درس را ایجاد کنید."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {school.classrooms.map((c) => (
                    <Card
                      key={c.id}
                      className="p-4 border hover:border-navy/40 hover:shadow-sm transition-all select-none h-full flex flex-col justify-between bg-white"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-navy text-sm flex items-center gap-1.5">
                              <DoorClosed className="h-4 w-4 text-navy/70" />
                              <span>{c.name}</span>
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">پایه {c.gradeLevel}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[11px]">
                              {c.major ? getMajorLabel(c.major) : "عمومی"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="ویرایش کلاس"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-navy hover:bg-navy/10 cursor-pointer"
                              onClick={() => {
                                setEditClassroomForm({
                                  name: c.name,
                                  gradeLevel: c.gradeLevel,
                                  major: c.major ?? "MATHEMATICS",
                                });
                                setEditingClassroom(c);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="حذف کلاس"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => handleDeleteClassroom(c.id, c.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          دانش‌آموزان:{" "}
                          <strong className="text-foreground tabular-nums font-bold">
                            {c._count.enrollments.toLocaleString("fa-IR")} نفر
                          </strong>
                        </span>
                        {isPrincipal ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveTab("students");
                              setSelectedClassFilter(c.id);
                            }}
                            className="text-xs text-navy hover:text-navy-dark hover:bg-navy/10 h-7 px-2 cursor-pointer font-medium"
                          >
                            مشاهده دانش‌آموزان ←
                          </Button>
                        ) : (
                          <Link
                            href={`/super-admin/schools/${school.id}/classrooms/${c.id}`}
                            className="text-xs text-navy hover:text-navy-dark hover:underline font-medium"
                          >
                            صفحه کلاس ←
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Timetable & Structure ── */}
        <TabsContent value="timetable" className="space-y-4">
          <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} dir="rtl" className="space-y-4">
            <div className="flex justify-start w-full">
              <TabsList className="bg-muted/60 h-10 p-1">
                <TabsTrigger value="builder" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>ساخت برنامه هفتگی</span>
                </TabsTrigger>
                <TabsTrigger value="subjects" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>مدیریت دروس</span>
                </TabsTrigger>
                <TabsTrigger value="bells" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>مدیریت زنگ‌ها</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="builder">
              <TimetableBuilder schoolId={school.id} hideHeader={true} />
            </TabsContent>

            <TabsContent value="subjects">
              <SubjectsManager schoolId={school.id} hideHeader={true} />
            </TabsContent>

            <TabsContent value="bells">
              <BellSchedulesManager schoolId={school.id} hideHeader={true} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Add Staff ── */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Users className="h-4 w-4 text-navy" />
              <span>افزودن عضو جدید کادر آموزشی / اداری</span>
            </DialogTitle>
            <DialogDescription>
              مشخصات پرسنل را برای ثبت در این مدرسه وارد کنید.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="st-ln" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="st-ln"
                  value={staffForm.lastName}
                  onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                  placeholder="حسینی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-fn" className="text-xs">نام</Label>
                <Input
                  id="st-fn"
                  value={staffForm.firstName}
                  onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                  placeholder="مریم"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="st-phone" className="text-xs">شماره موبایل</Label>
              <Input
                id="st-phone"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                placeholder="09123456789"
                inputMode="numeric" dir="ltr"
                className="h-9 text-xs font-mono text-left"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="st-nc" className="text-xs">کد ملی</Label>
                <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
              </div>
              <Input
                id="st-nc"
                value={staffForm.nationalCode}
                onChange={(e) => setStaffForm({ ...staffForm, nationalCode: e.target.value })}
                placeholder="۱۰ رقم (اختیاری — کد موقت تخصیص می‌یابد)"
                inputMode="numeric" dir="ltr"
                maxLength={10}
                className="h-9 text-xs font-mono text-left"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="st-role" className="text-xs">نقش سازمانی</Label>
              <Select
                value={staffForm.role}
                onValueChange={(val: any) => setStaffForm({ ...staffForm, role: val })}
              >
                <SelectTrigger id="st-role" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHER">معلم (دبیر)</SelectItem>
                  <SelectItem value="DEPUTY">ناظم / معاون</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button type="submit" disabled={submitting} className="bg-navy hover:bg-navy-dark text-xs h-9">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "افزودن عضو کادر"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAddStaffOpen(false)} className="text-xs h-9">
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Student ── */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald" />
              <span>ثبت‌نام دانش‌آموز جدید در مدرسه</span>
            </DialogTitle>
            <DialogDescription>
              مشخصات هویتی و کلاس دانش‌آموز را مشخص کنید.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStudent} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-ln" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="stu-ln"
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  placeholder="محمدی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-fn" className="text-xs">نام</Label>
                <Input
                  id="stu-fn"
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  placeholder="رضا"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stu-nc" className="text-xs">کد ملی</Label>
                  <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
                </div>
                <Input
                  id="stu-nc"
                  value={studentForm.nationalCode}
                  onChange={(e) => setStudentForm({ ...studentForm, nationalCode: e.target.value })}
                  placeholder="۱۰ رقم (اختیاری)"
                  inputMode="numeric" dir="ltr"
                  maxLength={10}
                  className="h-9 text-xs font-mono text-left"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-phone" className="text-xs">شماره همراه دانش‌آموز</Label>
                <Input
                  id="stu-phone"
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
              <Label htmlFor="stu-class" className="text-xs">کلاس درس (اختیاری)</Label>
              <Select
                value={studentForm.classRoomId}
                onValueChange={(val) => setStudentForm({ ...studentForm, classRoomId: val })}
              >
                <SelectTrigger id="stu-class" className="h-9 text-xs">
                  <SelectValue placeholder="انتخاب کلاس درس..." />
                </SelectTrigger>
                <SelectContent>
                  {school.classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (پایه {c.gradeLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-g1" className="text-xs">شماره ولی ۱ (ارسال پیامک)</Label>
                <Input
                  id="stu-g1"
                  value={studentForm.guardianPhone1}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone1: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-g2" className="text-xs">شماره ولی ۲ (اختیاری)</Label>
                <Input
                  id="stu-g2"
                  value={studentForm.guardianPhone2}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianPhone2: e.target.value })}
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

      {/* ── Dialog: Edit Classroom ── */}
      <Dialog open={!!editingClassroom} onOpenChange={(open) => !open && setEditingClassroom(null)}>
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
              <Button type="button" variant="ghost" onClick={() => setEditingClassroom(null)} className="text-xs h-9">
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Classroom ── */}
      <Dialog open={addClassroomOpen} onOpenChange={setAddClassroomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <DoorClosed className="h-4 w-4 text-navy" />
              <span>ایجاد کلاس درس جدید</span>
            </DialogTitle>
            <DialogDescription>
              نام و مشخصات پایه تحصیلی کلاس را مشخص کنید.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddClassroom} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="cls-name" className="text-xs">نام کلاس</Label>
              <Input
                id="cls-name"
                value={classroomForm.name}
                onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                placeholder="مثلاً ۱۰۱، الف، بهار"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cls-grade" className="text-xs">پایه تحصیلی</Label>
                <Select
                  value={classroomForm.gradeLevel}
                  onValueChange={(val) => setClassroomForm({ ...classroomForm, gradeLevel: val })}
                >
                  <SelectTrigger id="cls-grade" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {gradeHasMajor(classroomForm.gradeLevel) && (
                <div className="space-y-1">
                  <Label htmlFor="cls-major" className="text-xs">رشته تحصیلی</Label>
                  <Select
                    value={classroomForm.major}
                    onValueChange={(val) => setClassroomForm({ ...classroomForm, major: val })}
                  >
                    <SelectTrigger id="cls-major" className="h-9 text-xs">
                      <SelectValue placeholder="انتخاب رشته..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MAJORS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button type="submit" disabled={submitting} className="bg-navy hover:bg-navy-dark text-xs h-9">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد کلاس"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAddClassroomOpen(false)} className="text-xs h-9">
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Charge SMS ── */}
      <Dialog open={chargeSmsOpen} onOpenChange={setChargeSmsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-info" />
              <span>افزایش موجودی پیامک مدرسه</span>
            </DialogTitle>
            <DialogDescription>
              تعداد پیامک مورد نظر برای اضافه شدن به موجودی مدرسه «{school.name}» را وارد کنید.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChargeSms} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="sms-amount" className="text-xs">تعداد پیامک شارژ</Label>
              <Input
                id="sms-amount"
                value={smsChargeAmount}
                onChange={(e) => setSmsChargeAmount(e.target.value)}
                placeholder="500"
                inputMode="numeric" dir="ltr"
                className="h-9 text-xs font-mono text-left"
                required
              />
            </div>

            <div className="flex gap-2">
              {[200, 500, 1000, 2000].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSmsChargeAmount(String(num))}
                  className="flex-1 text-xs h-8 tabular-nums"
                >
                  +{num.toLocaleString("fa-IR")}
                </Button>
              ))}
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button type="submit" disabled={submitting} className="bg-info hover:bg-info/90 text-white text-xs h-9">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "شارژ اعتبار"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setChargeSmsOpen(false)} className="text-xs h-9">
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit School ── */}
      <Dialog open={editSchoolOpen} onOpenChange={setEditSchoolOpen}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-navy">ویرایش اطلاعات مدرسه</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEditSchool} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sch-name" className="text-xs font-medium">نام مدرسه</Label>
              <Input
                id="edit-sch-name"
                value={editSchoolForm.name}
                onChange={(e) => setEditSchoolForm({ ...editSchoolForm, name: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">وضعیت</Label>
              <Select
                value={editSchoolForm.status}
                onValueChange={(val: "ACTIVE" | "SUSPENDED") => setEditSchoolForm({ ...editSchoolForm, status: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="ACTIVE" className="text-xs text-emerald font-medium">فعال</SelectItem>
                  <SelectItem value="SUSPENDED" className="text-xs text-destructive font-medium">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditSchoolOpen(false)} className="text-xs h-8">انصراف</Button>
              <Button type="submit" size="sm" className="bg-emerald hover:bg-emerald/90 text-xs h-8" disabled={submitting}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "ذخیره تغییرات"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Staff ── */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Pencil className="h-4 w-4 text-navy" />
              <span>ویرایش مشخصات عضو کادر</span>
            </DialogTitle>
            <DialogDescription>
              ویرایش اطلاعات هویتی و نقش سازمانی در مدرسه «{school.name}»
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditStaff} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="st-edit-ln-sch" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="st-edit-ln-sch"
                  value={editStaffForm.lastName}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, lastName: e.target.value })}
                  placeholder="حسینی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-edit-fn-sch" className="text-xs">نام</Label>
                <Input
                  id="st-edit-fn-sch"
                  value={editStaffForm.firstName}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, firstName: e.target.value })}
                  placeholder="مریم"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="st-edit-ph-sch" className="text-xs">شماره تلفن همراه</Label>
              <Input
                id="st-edit-ph-sch"
                value={editStaffForm.phoneNumber}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, phoneNumber: e.target.value })}
                className="h-9 text-xs font-mono"
                inputMode="numeric" dir="ltr"
                placeholder="0912..."
                maxLength={11}
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="st-edit-nc-sch" className="text-xs">کد ملی</Label>
                <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
              </div>
              <Input
                id="st-edit-nc-sch"
                value={editStaffForm.nationalCode}
                onChange={(e) => setEditStaffForm({ ...editStaffForm, nationalCode: e.target.value })}
                className="h-9 text-xs font-mono"
                inputMode="numeric" dir="ltr"
                placeholder="۱۰ رقم (اختیاری)"
                maxLength={10}
              />
            </div>

            {editingStaff?.role !== "PRINCIPAL" ? (
              <div className="space-y-1">
                <Label className="text-xs">نقش سازمانی</Label>
                <Select
                  value={editStaffForm.role}
                  onValueChange={(val: "DEPUTY" | "TEACHER") => setEditStaffForm({ ...editStaffForm, role: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">معلم (دبیر)</SelectItem>
                    <SelectItem value="DEPUTY">ناظم / معاون آموزشی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-2.5 rounded-md bg-muted/50 border text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-navy shrink-0" />
                <span>نقش مدیر مدرسه قفل است و تغییر آن مجاز نیست.</span>
              </div>
            )}

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button
                type="submit"
                disabled={editStaffSubmitting}
                className="bg-navy hover:bg-navy-dark text-xs h-9 gap-1.5"
              >
                {editStaffSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                <span>ذخیره تغییرات</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingStaff(null)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Pencil className="h-4 w-4 text-navy" />
              <span>ویرایش پرونده دانش‌آموز</span>
            </DialogTitle>
            <DialogDescription>
              ویرایش اطلاعات هویتی، کلاس درس و شماره تماس اولیا در مدرسه «{school.name}»
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditStudent} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stu-edit-ln-sch" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="stu-edit-ln-sch"
                  value={editStudentForm.lastName}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, lastName: e.target.value })}
                  placeholder="محمدی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-fn-sch" className="text-xs">نام</Label>
                <Input
                  id="stu-edit-fn-sch"
                  value={editStudentForm.firstName}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, firstName: e.target.value })}
                  placeholder="رضا"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stu-edit-nc-sch" className="text-xs">کد ملی</Label>
                  <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
                </div>
                <Input
                  id="stu-edit-nc-sch"
                  value={editStudentForm.nationalCode}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, nationalCode: e.target.value })}
                  className="h-9 text-xs font-mono"
                  inputMode="numeric" dir="ltr"
                  placeholder="۱۰ رقم (اختیاری)"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-ph-sch" className="text-xs">شماره همراه دانش‌آموز</Label>
                <Input
                  id="stu-edit-ph-sch"
                  value={editStudentForm.phoneNumber}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, phoneNumber: e.target.value })}
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
                <Label htmlFor="stu-edit-cr-sch" className="text-xs">کلاس درس</Label>
                <Select
                  value={editStudentForm.classRoomId}
                  onValueChange={(val) => setEditStudentForm({ ...editStudentForm, classRoomId: val })}
                >
                  <SelectTrigger id="stu-edit-cr-sch" className="h-9 text-xs">
                    <SelectValue placeholder="انتخاب کلاس..." />
                  </SelectTrigger>
                  <SelectContent>
                    {school.classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.gradeLevel} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="stu-edit-status-sch" className="text-xs">وضعیت پرونده</Label>
                <Select
                  value={editStudentForm.status}
                  onValueChange={(val: any) => setEditStudentForm({ ...editStudentForm, status: val })}
                >
                  <SelectTrigger id="stu-edit-status-sch" className="h-9 text-xs">
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
                <Label htmlFor="stu-edit-g1-sch" className="text-xs">شماره ولی ۱ (ارسال پیامک)</Label>
                <Input
                  id="stu-edit-g1-sch"
                  value={editStudentForm.guardianPhone1}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, guardianPhone1: e.target.value })}
                  placeholder="09123456789"
                  inputMode="numeric" dir="ltr"
                  className="h-9 text-xs font-mono text-left"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stu-edit-g2-sch" className="text-xs">شماره ولی ۲ (اختیاری)</Label>
                <Input
                  id="stu-edit-g2-sch"
                  value={editStudentForm.guardianPhone2}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, guardianPhone2: e.target.value })}
                  placeholder="09123456789"
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

      {/* ── Teacher Schedule Sheet ── */}
      <TeacherScheduleSheet
        open={teacherScheduleOpen}
        onOpenChange={setTeacherScheduleOpen}
        teacher={
          selectedTeacherForSchedule
            ? {
                id: selectedTeacherForSchedule.id,
                userId: selectedTeacherForSchedule.userId || selectedTeacherForSchedule.user?.id,
                firstName: selectedTeacherForSchedule.firstName || selectedTeacherForSchedule.user?.firstName,
                lastName: selectedTeacherForSchedule.lastName || selectedTeacherForSchedule.user?.lastName,
                fullName: selectedTeacherForSchedule.fullName,
                phoneNumber: selectedTeacherForSchedule.phoneNumber || selectedTeacherForSchedule.user?.phoneNumber,
                nationalCode: selectedTeacherForSchedule.nationalCode || selectedTeacherForSchedule.user?.nationalCode,
              }
            : null
        }
        slots={timetableSlots}
        bells={school?.bellSchedules}
      />
    </div>
  );
}

// 1790849938

// 1790850321

// 1790850722

// 1790851051

// 1790851165

// 1790851256

// 1790851938

// 1790852161

// 1790852921
