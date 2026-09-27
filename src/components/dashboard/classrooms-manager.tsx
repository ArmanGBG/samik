"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DoorClosed,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeJsonResponse } from "@/lib/safe-fetch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  GRADES,
  MAJORS,
  gradeHasMajor,
  getMajorShort,
} from "@/lib/constants/grades";

interface ClassRoom {
  id: string;
  gradeLevel: string;
  major: string | null;
  name: string;
  createdAt: string;
  studentCount: number;
  slotCount: number;
  assessmentCount: number;
}

type SortKey = "gradeLevel" | "name" | "major" | "studentCount" | "slotCount" | "assessmentCount";
type SortDir = "asc" | "desc";

const MAJOR_TINT: Record<string, string> = {
  MATHEMATICS: "bg-navy/10 text-navy border-navy/30",
  EXPERIMENTAL: "bg-emerald/10 text-emerald border-emerald/30",
  HUMANITIES: "bg-info/10 text-info border-info/30",
  TECHNICAL: "bg-warning/10 text-warning border-warning/30",
  VOCATIONAL: "bg-purple-100 text-purple-700 border-purple-300",
};

export function ClassRoomsManager() {
  const [rooms, setRooms] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("gradeLevel");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [form, setForm] = useState<{ gradeLevel: string; major: string; name: string }>({
    gradeLevel: "",
    major: "",
    name: "",
  });
  // Edit dialog state
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [editForm, setEditForm] = useState<{ gradeLevel: string; major: string; name: string }>({
    gradeLevel: "",
    major: "",
    name: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/classrooms");
      const d = await safeJsonResponse(r, "خطا در دریافت لیست کلاس‌ها.");
      if (d.ok) setRooms(d.classrooms as ClassRoom[]);
      else toast.error(d.error!);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Reset major when grade changes to a non-high-school grade
  useEffect(() => {
    if (!gradeHasMajor(form.gradeLevel)) {
      setForm((f) => ({ ...f, major: "" }));
    }
  }, [form.gradeLevel]);

  const sortedRooms = useMemo(() => {
    const sorted = [...rooms];
    sorted.sort((a, b) => {
      let cmp = 0;
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "gradeLevel":
          av = GRADES.find((g) => g.value === a.gradeLevel)?.number ?? 99;
          bv = GRADES.find((g) => g.value === b.gradeLevel)?.number ?? 99;
          cmp = av - bv;
          break;
        case "name":
          cmp = a.name.localeCompare(b.name, "fa");
          break;
        case "major":
          cmp = (a.major ?? "").localeCompare(b.major ?? "");
          break;
        case "studentCount":
          cmp = a.studentCount - b.studentCount;
          break;
        case "slotCount":
          cmp = a.slotCount - b.slotCount;
          break;
        case "assessmentCount":
          cmp = a.assessmentCount - b.assessmentCount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rooms, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        gradeLevel: form.gradeLevel,
        name: form.name,
      };
      // Only send major if the grade supports it
      if (gradeHasMajor(form.gradeLevel) && form.major) {
        payload.major = form.major;
      } else {
        payload.major = null;
      }
      const r = await fetch("/api/v1/principal/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await safeJsonResponse(r, "ثبت کلاس ناموفق بود.");
      if (!d.ok) {
        toast.error(d.error!);
        return;
      }
      const majorLabel = form.major ? ` (${getMajorShort(form.major)})` : "";
      toast.success(`کلاس ${form.gradeLevel} ${form.name}${majorLabel} ثبت شد.`);
      setForm({ gradeLevel: "", major: "", name: "" });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(room: ClassRoom) {
    setEditing(room);
    setEditForm({
      gradeLevel: room.gradeLevel,
      major: room.major ?? "",
      name: room.name,
    });
  }

  // Reset edit major when edit grade changes
  useEffect(() => {
    if (editing && !gradeHasMajor(editForm.gradeLevel)) {
      setEditForm((f) => ({ ...f, major: "" }));
    }
  }, [editForm.gradeLevel, editing]);

  async function saveEdit() {
    if (!editing) return;
    setEditSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        gradeLevel: editForm.gradeLevel,
        name: editForm.name,
      };
      if (gradeHasMajor(editForm.gradeLevel) && editForm.major) {
        payload.major = editForm.major;
      } else {
        payload.major = null;
      }
      const r = await fetch(`/api/v1/principal/classrooms?id=${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await safeJsonResponse(r, "ویرایش ناموفق بود.");
      if (!d.ok) {
        toast.error(d.error!);
        return;
      }
      toast.success("کلاس ویرایش شد.");
      setEditing(null);
      load();
    } finally {
      setEditSubmitting(false);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`حذف کلاس «${label}»؟ این عملیات نرم است و سوابق حفظ می‌شوند.`))
      return;
    const r = await fetch(`/api/v1/principal/classrooms?id=${id}`, {
      method: "DELETE",
    });
    const d = await safeJsonResponse(r, "حذف ناموفق بود.");
    if (!d.ok) {
      toast.error(d.error!);
      return;
    }
    toast.success("کلاس حذف شد.");
    load();
  }

  const showMajorInForm = gradeHasMajor(form.gradeLevel);
  const showMajorInEdit = gradeHasMajor(editForm.gradeLevel);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="کلاس‌ها"
        subtitle="تعریف پایه‌ها و کلاس‌های فیزیکی مدرسه."
        icon={DoorClosed}
      />

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            کلاس جدید
          </CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="grade" className="text-xs font-medium">
                پایه
              </Label>
              <Select
                value={form.gradeLevel}
                onValueChange={(v) => setForm({ ...form, gradeLevel: v })}
              >
                <SelectTrigger id="grade" className="h-9">
                  <SelectValue placeholder="انتخاب پایه..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="major" className="text-xs font-medium">
                رشته {showMajorInForm ? "" : "(غیرقابل انتخاب)"}
              </Label>
              <Select
                value={form.major}
                onValueChange={(v) => setForm({ ...form, major: v })}
                disabled={!showMajorInForm}
              >
                <SelectTrigger id="major" className="h-9">
                  <SelectValue placeholder="—" />
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
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                نام کلاس
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الف"
                maxLength={5}
                className="h-9"
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={submitting || !form.gradeLevel || !form.name}
                className="w-full bg-emerald hover:bg-emerald-dark h-9 gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                ثبت کلاس
              </Button>
            </div>
          </CardContent>
          <CardFooter />
        </form>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy">
            کلاس‌های ثبت‌شده ({rooms.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={DoorClosed}
              title="هنوز کلاسی ثبت نشده است"
              description="با فرم بالا کلاس جدید ثبت کنید."
            />
          ) : (
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto sticky-table-header">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead
                      label="پایه"
                      sortKey="gradeLevel"
                      currentKey={sortKey}
                      dir={sortDir}
                      onClick={() => toggleSort("gradeLevel")}
                    />
                    <SortableHead
                      label="رشته"
                      sortKey="major"
                      currentKey={sortKey}
                      dir={sortDir}
                      onClick={() => toggleSort("major")}
                      className="text-center"
                    />
                    <SortableHead
                      label="نام کلاس"
                      sortKey="name"
                      currentKey={sortKey}
                      dir={sortDir}
                      onClick={() => toggleSort("name")}
                    />
                    <SortableHead
                      label="دانش‌آموزان"
                      sortKey="studentCount"
                      currentKey={sortKey}
                      dir={sortDir}
                      onClick={() => toggleSort("studentCount")}
                      className="text-center"
                    />
                    <SortableHead
                      label="برنامه هفتگی"
                      sortKey="slotCount"
                      currentKey={sortKey}
                      dir={sortDir}
                      onClick={() => toggleSort("slotCount")}
                      className="text-center"
                    />
                    <SortableHead
                      label="ارزیابی‌ها"
                      sortKey="assessmentCount"
                      currentKey={sortKey}
                      dir={sortDir}
                      onClick={() => toggleSort("assessmentCount")}
                      className="text-center"
                    />
                    <TableHead className="text-center w-20">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRooms.map((r, i) => (
                    <TableRow
                      key={r.id}
                      className="data-table-row stagger-item"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <TableCell className="font-medium">{r.gradeLevel}</TableCell>
                      <TableCell className="text-center">
                        {r.major ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              MAJOR_TINT[r.major] ?? "bg-muted"
                            )}
                          >
                            {getMajorShort(r.major)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {r.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.studentCount.toLocaleString("fa-IR")}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.slotCount.toLocaleString("fa-IR")}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.assessmentCount.toLocaleString("fa-IR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(r)}
                                  className="text-info hover:text-info hover:bg-info/10 h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>ویرایش</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    onDelete(r.id, `${r.gradeLevel} ${r.name}`)
                                  }
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>حذف</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش کلاس</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">پایه</Label>
              <Select
                value={editForm.gradeLevel}
                onValueChange={(v) => setEditForm({ ...editForm, gradeLevel: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                رشته {showMajorInEdit ? "" : "(غیرقابل انتخاب)"}
              </Label>
              <Select
                value={editForm.major}
                onValueChange={(v) => setEditForm({ ...editForm, major: v })}
                disabled={!showMajorInEdit}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="—" />
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">نام کلاس</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                maxLength={5}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              انصراف
            </Button>
            <Button
              onClick={saveEdit}
              disabled={editSubmitting || !editForm.gradeLevel || !editForm.name}
              className="bg-emerald hover:bg-emerald-dark gap-2"
            >
              {editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
