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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Users,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserCog,
  GraduationCap,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeJsonResponse } from "@/lib/safe-fetch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCardGrid } from "@/components/shared/kpi-card";

interface StaffMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  nationalCode: string;
  role: "PRINCIPAL" | "DEPUTY" | "TEACHER";
  slotCount: number;
  createdAt: string;
}

type SortKey = "fullName" | "role" | "phoneNumber" | "slotCount" | "createdAt";
type SortDir = "asc" | "desc";

const ROLE_META: Record<string, { label: string; icon: any; tint: string }> = {
  PRINCIPAL: { label: "مدیر مدرسه", icon: ShieldCheck, tint: "bg-navy/10 text-navy border-navy/30" },
  DEPUTY: { label: "ناظم / معاون", icon: UserCog, tint: "bg-emerald/10 text-emerald border-emerald/30" },
  TEACHER: { label: "معلم", icon: GraduationCap, tint: "bg-info/10 text-info border-info/30" },
};

export function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("role");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── Add form state ──
  const [form, setForm] = useState({
    phone: "",
    nationalCode: "",
    firstName: "",
    lastName: "",
    role: "TEACHER" as "DEPUTY" | "TEACHER",
  });

  // ── Edit dialog state ──
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nationalCode: "",
    role: "TEACHER" as "DEPUTY" | "TEACHER",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/staff");
      const d = await safeJsonResponse(r, "خطا در دریافت لیست پرسنل.");
      if (d.ok) setStaff(d.staff as StaffMember[]);
      else toast.error(d.error!);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sortedStaff = useMemo(() => {
    const sorted = [...staff];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "fullName":
          cmp = a.fullName.localeCompare(b.fullName, "fa");
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "phoneNumber":
          cmp = a.phoneNumber.localeCompare(b.phoneNumber);
          break;
        case "slotCount":
          cmp = a.slotCount - b.slotCount;
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [staff, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Submit (Add) ──
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/principal/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await safeJsonResponse(r, "ثبت پرسنل ناموفق بود.");
      if (!d.ok) {
        toast.error(d.error!);
        return;
      }
      toast.success(
        `${(d.staff as StaffMember).fullName} با نقش ${ROLE_META[(d.staff as StaffMember).role].label} اضافه شد.`
      );
      setForm({ phone: "", nationalCode: "", firstName: "", lastName: "", role: "TEACHER" });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit handlers ──
  function openEdit(s: StaffMember) {
    setEditing(s);
    setEditForm({
      firstName: s.firstName,
      lastName: s.lastName,
      phoneNumber: s.phoneNumber,
      nationalCode: s.nationalCode,
      role: s.role === "PRINCIPAL" ? "TEACHER" : (s.role as "DEPUTY" | "TEACHER"),
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setEditSubmitting(true);
    try {
      const r = await fetch(`/api/v1/principal/staff?id=${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const d = await safeJsonResponse(r, "ویرایش ناموفق بود.");
      if (!d.ok) {
        toast.error(d.error!);
        return;
      }
      toast.success("اطلاعات پرسنل ویرایش شد.");
      setEditing(null);
      load();
    } finally {
      setEditSubmitting(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`حذف ${name} از پرسنل این مدرسه؟`)) return;
    const r = await fetch(`/api/v1/principal/staff?id=${id}`, { method: "DELETE" });
    const d = await safeJsonResponse(r, "حذف ناموفق بود.");
    if (!d.ok) {
      toast.error(d.error!);
      return;
    }
    toast.success("پرسنل حذف شد.");
    load();
  }

  const stats = useMemo(
    () => ({
      total: staff.length,
      teachers: staff.filter((s) => s.role === "TEACHER").length,
      deputies: staff.filter((s) => s.role === "DEPUTY").length,
      principals: staff.filter((s) => s.role === "PRINCIPAL").length,
    }),
    [staff]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="پرسنل"
        subtitle="مدیریت معلمان و ناظمان مدرسه — دعوت، ویرایش، تخصیص نقش و حذف."
        icon={Users}
      />

      <KpiCardGrid
        cards={[
          { label: "کل پرسنل", value: stats.total, icon: Users, tint: "navy" },
          { label: "معلمان", value: stats.teachers, icon: GraduationCap, tint: "info" },
          { label: "ناظمان", value: stats.deputies, icon: UserCog, tint: "emerald" },
          { label: "مدیران", value: stats.principals, icon: ShieldCheck, tint: "navy" },
        ]}
      />

      {/* ── Add staff form — balanced 2-row grid ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            افزودن پرسنل جدید
          </CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Row 1: First Name, Last Name, Mobile */}
              <div className="space-y-1.5">
                <Label htmlFor="fn" className="text-xs font-medium">نام</Label>
                <Input
                  id="fn"
                  className="h-9"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln" className="text-xs font-medium">نام خانوادگی</Label>
                <Input
                  id="ln"
                  className="h-9"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">شماره موبایل</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-left font-mono h-9"
                  placeholder="09123456789"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  pattern="09\d{9}"
                  maxLength={11}
                />
              </div>
              {/* Row 2: National ID, Role, Submit Button */}
              <div className="space-y-1.5">
                <Label htmlFor="nc" className="text-xs font-medium">کد ملی</Label>
                <Input
                  id="nc"
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
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">نقش</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as "DEPUTY" | "TEACHER" })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">معلم</SelectItem>
                    <SelectItem value="DEPUTY">ناظم / معاون</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={submitting || !form.phone || !form.firstName || !form.lastName}
                  className="w-full bg-emerald hover:bg-emerald-dark h-9 gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  افزودن پرسنل
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* ── Staff table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-navy">
            پرسنل مدرسه ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="هنوز پرسنلی ثبت نشده است"
              description="با فرم بالا معلم یا ناظم جدید اضافه کنید."
            />
          ) : (
            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto sticky-table-header">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead label="نام" sortKey="fullName" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("fullName")} />
                    <SortableHead label="نقش" sortKey="role" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("role")} />
                    <SortableHead label="شماره موبایل" sortKey="phoneNumber" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("phoneNumber")} />
                    <TableHead className="text-center">کد ملی</TableHead>
                    <SortableHead label="برنامه هفتگی" sortKey="slotCount" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("slotCount")} className="text-center" />
                    <SortableHead label="تاریخ عضویت" sortKey="createdAt" currentKey={sortKey} dir={sortDir} onClick={() => toggleSort("createdAt")} className="text-center" />
                    <TableHead className="text-center">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStaff.map((s, i) => {
                    const roleMeta = ROLE_META[s.role];
                    const RoleIcon = roleMeta.icon;
                    const canEdit = s.role !== "PRINCIPAL";
                    const canDelete = s.role !== "PRINCIPAL";
                    return (
                      <TableRow
                        key={s.id}
                        className="data-table-row stagger-item"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="font-medium truncate">{s.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", roleMeta.tint)}>
                            <RoleIcon className="h-3 w-3" />
                            {roleMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono text-xs tabular-nums truncate">
                          {s.phoneNumber}
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono text-xs tabular-nums text-muted-foreground truncate">
                          {s.nationalCode}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.role === "TEACHER" ? (
                            s.slotCount > 0 ? (
                              <Badge variant="outline" className="bg-info/5 text-info border-info/20 text-[10px] tabular-nums">
                                <CalendarClock className="h-3 w-3 ml-1" />
                                {s.slotCount.toLocaleString("fa-IR")}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs tabular-nums">۰</span>
                            )
                          ) : (
                            <Badge variant="outline" className="bg-muted/50 text-muted-foreground/60 border-border text-[10px]">
                              —
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                          {new Date(s.createdAt).toLocaleDateString("fa-IR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEdit(s)}
                                      className="text-info hover:text-info hover:bg-info/10 h-8 w-8 p-0"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>ویرایش</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {canDelete ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onDelete(s.id, s.fullName)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>حذف از پرسنل</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
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

      {/* ── Edit dialog ── */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-navy">ویرایش پرسنل</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">نام</Label>
              <Input
                className="h-9"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">نام خانوادگی</Label>
              <Input
                className="h-9"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">شماره موبایل</Label>
              <Input
                type="tel"
                inputMode="numeric"
                dir="ltr"
                className="text-left font-mono h-9"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">کد ملی</Label>
              <Input
                type="text"
                inputMode="numeric"
                dir="ltr"
                className="text-left font-mono h-9"
                value={editForm.nationalCode}
                onChange={(e) => setEditForm({ ...editForm, nationalCode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">نقش</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as "DEPUTY" | "TEACHER" })}
                disabled={editing?.role === "PRINCIPAL"}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHER">معلم</SelectItem>
                  <SelectItem value="DEPUTY">ناظم / معاون</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>انصراف</Button>
            <Button
              onClick={saveEdit}
              disabled={editSubmitting || !editForm.firstName || !editForm.lastName}
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
