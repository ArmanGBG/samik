"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeJsonResponse } from "@/lib/safe-fetch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { toAsciiDigitsOnly } from "@/lib/persian-digits";

interface Student {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  nationalCode: string;
  classRoomId: string;
  classRoomName: string;
  gradeLevel: string;
  guardianPhone1: string;
  guardianPhone2: string | null;
  academicYear: string;
  status: "ACTIVE" | "PENDING_CONFIRMATION" | "ARCHIVED";
  createdAt: string;
}

interface Classroom {
  id: string;
  gradeLevel: string;
  name: string;
}

type SortKey = "fullName" | "classRoomName" | "status" | "createdAt";
type SortDir = "asc" | "desc";

const STATUS_META: Record<string, { label: string; tint: string; icon: any }> = {
  ACTIVE: {
    label: "فعال",
    tint: "bg-emerald/10 text-emerald border-emerald/30",
    icon: UserCheck,
  },
  PENDING_CONFIRMATION: {
    label: "در انتظار تأیید",
    tint: "bg-warning/10 text-warning border-warning/30",
    icon: Clock,
  },
  ARCHIVED: {
    label: "آرشیو شده",
    tint: "bg-muted text-muted-foreground border-border",
    icon: Clock,
  },
};

export function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterClassroom, setFilterClassroom] = useState<string>("all");

  // ── Add form state ──
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    phoneNumber: "",
    classRoomId: "",
    guardianPhone1: "",
    guardianPhone2: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [stuR, clsR] = await Promise.all([
        fetch("/api/v1/principal/students"),
        fetch("/api/v1/principal/classrooms"),
      ]);
      const stuD = await safeJsonResponse(stuR, "خطا در دریافت لیست دانش‌آموزان.");
      const clsD = await safeJsonResponse(clsR, "خطا در دریافت لیست کلاس‌ها.");
      if (stuD.ok) setStudents(stuD.students as Student[]);
      if (clsD.ok) setClassrooms(clsD.classrooms as Classroom[]);
      if (!stuD.ok) toast.error(stuD.error!);
      if (!clsD.ok) toast.error(clsD.error!);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (filterClassroom !== "all") {
      list = list.filter((s) => s.classRoomId === filterClassroom);
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "fullName":
          cmp = a.fullName.localeCompare(b.fullName, "fa");
          break;
        case "classRoomName":
          cmp = a.classRoomName.localeCompare(b.classRoomName, "fa");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [students, filterClassroom, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Submit (Add Student) ──
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/principal/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nationalCode: toAsciiDigitsOnly(form.nationalCode),
          phoneNumber: toAsciiDigitsOnly(form.phoneNumber),
          guardianPhone1: toAsciiDigitsOnly(form.guardianPhone1),
          guardianPhone2: form.guardianPhone2
            ? toAsciiDigitsOnly(form.guardianPhone2)
            : undefined,
        }),
      });
      const d = await safeJsonResponse(r, "ثبت‌نام ناموفق بود.");
      if (!d.ok) {
        toast.error(d.error!);
        return;
      }
      const s = d.student as Student;
      const statusMsg =
        s.status === "ACTIVE"
          ? " (فعال)"
          : " (در انتظار تأیید ولی)";
      toast.success(`دانش‌آموز ${s.fullName} ثبت‌نام شد${statusMsg}.`);
      setForm({
        firstName: "",
        lastName: "",
        nationalCode: "",
        phoneNumber: "",
        classRoomId: "",
        guardianPhone1: "",
        guardianPhone2: "",
      });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((s) => s.status === "ACTIVE").length,
      pending: students.filter((s) => s.status === "PENDING_CONFIRMATION").length,
    }),
    [students]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="دانش‌آموزان"
        subtitle="ثبت‌نام فردی دانش‌آموزان و مدیریت عضویت‌ها."
        icon={GraduationCap}
      />

      <KpiCardGrid
        cards={[
          { label: "کل دانش‌آموزان", value: stats.total, icon: GraduationCap, tint: "navy" },
          { label: "فعال", value: stats.active, icon: UserCheck, tint: "emerald" },
          { label: "در انتظار تأیید", value: stats.pending, icon: Clock, tint: "warning" },
          {
            label: "کلاس‌ها",
            value: classrooms.length,
            icon: GraduationCap,
            tint: "info",
          },
        ]}
      />

      {/* ── Add student form — balanced 2-row grid ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            افزودن دانش‌آموز
          </CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Row 1: First Name, Last Name, National Code */}
              <div className="space-y-1.5">
                <Label htmlFor="s-fn" className="text-xs font-medium">نام</Label>
                <Input
                  id="s-fn"
                  className="h-9"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-ln" className="text-xs font-medium">نام خانوادگی</Label>
                <Input
                  id="s-ln"
                  className="h-9"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-nc" className="text-xs font-medium">کد ملی</Label>
                <Input
                  id="s-nc"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-left font-mono h-9"
                  placeholder="1234567890"
                  value={form.nationalCode}
                  onChange={(e) => setForm({ ...form, nationalCode: e.target.value })}
                  required
                  pattern="\d{10}"
                  maxLength={10}
                />
              </div>
              {/* Row 2: Mobile, Guardian Phone, Classroom */}
              <div className="space-y-1.5">
                <Label htmlFor="s-phone" className="text-xs font-medium">شماره موبایل دانش‌آموز</Label>
                <Input
                  id="s-phone"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-left font-mono h-9"
                  placeholder="09123456789"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  required
                  pattern="09\d{9}"
                  maxLength={11}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-g1" className="text-xs font-medium">شماره ولی (۱)</Label>
                <Input
                  id="s-g1"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-left font-mono h-9"
                  placeholder="09123456789"
                  value={form.guardianPhone1}
                  onChange={(e) => setForm({ ...form, guardianPhone1: e.target.value })}
                  required
                  pattern="09\d{9}"
                  maxLength={11}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-class" className="text-xs font-medium">کلاس</Label>
                <Select
                  value={form.classRoomId}
                  onValueChange={(v) => setForm({ ...form, classRoomId: v })}
                >
                  <SelectTrigger id="s-class" className="h-9">
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
              {/* Row 3: Guardian Phone 2 (optional) + Submit */}
              <div className="space-y-1.5">
                <Label htmlFor="s-g2" className="text-xs font-medium">
                  شماره ولی (۲) <span className="text-muted-foreground">(اختیاری)</span>
                </Label>
                <Input
                  id="s-g2"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-left font-mono h-9"
                  placeholder="09123456789"
                  value={form.guardianPhone2}
                  onChange={(e) => setForm({ ...form, guardianPhone2: e.target.value })}
                  pattern="09\d{9}"
                  maxLength={11}
                />
              </div>
              <div className="md:col-span-2 flex items-end justify-end">
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !form.firstName ||
                    !form.lastName ||
                    !form.nationalCode ||
                    !form.phoneNumber ||
                    !form.guardianPhone1 ||
                    !form.classRoomId
                  }
                  className="bg-emerald hover:bg-emerald-dark h-9 gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  ثبت‌نام دانش‌آموز
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* ── Students table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base text-navy">
              دانش‌آموزان ({filteredStudents.length})
            </CardTitle>
            {/* Classroom filter */}
            <Select value={filterClassroom} onValueChange={setFilterClassroom}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="همه کلاس‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کلاس‌ها</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.gradeLevel} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="هنوز دانش‌آموزی ثبت نشده است"
              description="با فرم بالا دانش‌آموز جدید ثبت‌نام کنید."
            />
          ) : (
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto sticky-table-header">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead label="نام" sortKey="fullName" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("fullName")} />
                    <SortableHead label="کلاس" sortKey="classRoomName" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("classRoomName")} />
                    <TableHead className="text-center">کد ملی</TableHead>
                    <TableHead className="text-center">شماره ولی</TableHead>
                    <SortableHead label="وضعیت" sortKey="status" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("status")} className="text-center" />
                    <SortableHead label="تاریخ ثبت" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("createdAt")} className="text-center" />
                    <TableHead className="text-center">سال</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s, i) => {
                    const statusMeta = STATUS_META[s.status] ?? STATUS_META.ACTIVE;
                    const StatusIcon = statusMeta.icon;
                    return (
                      <TableRow
                        key={s.enrollmentId}
                        className="data-table-row stagger-item"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="font-medium truncate">{s.fullName}</TableCell>
                        <TableCell className="truncate">
                          <Badge variant="outline" className="text-[10px]">
                            {s.classRoomName}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono text-xs tabular-nums text-muted-foreground truncate">
                          {s.nationalCode}
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono text-xs tabular-nums truncate">
                          {s.guardianPhone1}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("gap-1 text-[10px]", statusMeta.tint)}>
                            <StatusIcon className="h-3 w-3" />
                            {statusMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                          {new Date(s.createdAt).toLocaleDateString("fa-IR")}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                          {s.academicYear}
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
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  currentKey,
  dir,
  onClick,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const isActive = sortKey === currentKey;
  return (
    <TableHead className={className}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-navy transition-colors",
          isActive && "text-navy"
        )}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
