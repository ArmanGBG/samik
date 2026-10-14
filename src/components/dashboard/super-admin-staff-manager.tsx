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
  Users,
  Building2,
  ShieldCheck,
  UserCog,
  GraduationCap,
  Trash2,
  Pencil,
  ArrowRight,
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

interface StaffMember {
  id: string;
  userId: string;
  role: "PRINCIPAL" | "DEPUTY" | "TEACHER";
  createdAt: string;
  slotCount?: number;
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

export function SuperAdminStaffManager() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-navy" />
        </div>
      }
    >
      <SuperAdminStaffContent />
    </Suspense>
  );
}

function SuperAdminStaffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    searchParams.get("schoolId") || ""
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    nationalCode: "",
    role: "TEACHER" as "DEPUTY" | "TEACHER",
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

  // Load staff for selected school
  const loadStaff = useCallback(async () => {
    if (!selectedSchoolId) return;
    setLoadingStaff(true);
    try {
      const r = await fetch(`/api/v1/principal/staff?schoolId=${selectedSchoolId}`);
      const d = await r.json();
      if (d.ok) {
        setStaff(d.staff || []);
      } else {
        toast.error(d.error ?? "خطا در دریافت لیست پرسنل.");
      }
    } catch (err) {
      console.error("[LOAD_STAFF_ERROR]", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoadingStaff(false);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  function handleSelectSchool(schoolId: string) {
    setSelectedSchoolId(schoolId);
    router.push(`/super-admin/staff?schoolId=${schoolId}`);
  }

  async function handleAddStaff(e: React.FormEvent) {
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
        phone: toEnglishDigits(form.phone.trim()),
        nationalCode: toEnglishDigits(form.nationalCode.trim()) || undefined,
        role: form.role,
      };

      const r = await fetch(`/api/v1/principal/staff?schoolId=${selectedSchoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "افزودن پرسنل ناموفق بود.");
        return;
      }
      toast.success(`${form.role === "DEPUTY" ? "ناظم / معاون" : "معلم"} با موفقیت افزوده شد.`);
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        nationalCode: "",
        role: "TEACHER",
      });
      setAddStaffOpen(false);
      loadStaff();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStaff(id: string, name: string) {
    if (!confirm(`آیا از لغو دسترسی «${name}» اطمینان دارید؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/staff?id=${id}&schoolId=${selectedSchoolId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در لغو دسترسی.");
        return;
      }
      toast.success(`دسترسی «${name}» با موفقیت لغو شد.`);
      loadStaff();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nationalCode: "",
    role: "TEACHER" as "DEPUTY" | "TEACHER",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  function openEditStaff(m: StaffMember) {
    const firstName = m.firstName || m.user?.firstName || "";
    const lastName = m.lastName || m.user?.lastName || "";
    const phone = m.phoneNumber || m.user?.phoneNumber || "";
    const rawNc = m.nationalCode || m.user?.nationalCode || "";
    const nc = rawNc.startsWith("TEMP-") || rawNc.startsWith("PENDING-") ? "" : rawNc;
    setEditingStaff(m);
    setEditForm({
      firstName,
      lastName,
      phoneNumber: phone,
      nationalCode: nc,
      role: m.role === "PRINCIPAL" ? "TEACHER" : m.role,
    });
  }

  async function handleSaveEditStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff || !selectedSchoolId) return;
    setEditSubmitting(true);
    try {
      const payload: Record<string, string | undefined> = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phoneNumber: toEnglishDigits(editForm.phoneNumber.trim()),
        nationalCode: toEnglishDigits(editForm.nationalCode.trim()) || undefined,
      };
      if (editingStaff.role !== "PRINCIPAL") {
        payload.role = editForm.role;
      }

      const r = await fetch(`/api/v1/principal/staff?id=${editingStaff.id}&schoolId=${selectedSchoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ویرایش پرسنل ناموفق بود.");
        return;
      }
      toast.success("مشخصات پرسنل با موفقیت ویرایش شد.");
      setEditingStaff(null);
      loadStaff();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setEditSubmitting(false);
    }
  }

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const totalStaff = staff.length;
  const teachersCount = staff.filter((s) => s.role === "TEACHER").length;
  const deputiesCount = staff.filter((s) => s.role === "DEPUTY").length;
  const principalsCount = staff.filter((s) => s.role === "PRINCIPAL").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="مدیریت کادر و پرسنل مدارس"
        subtitle="مشاهده و افزودن معلمان و معاونین هر مدرسه از دید سوپر ادمین"
        icon={Users}
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
              onClick={() => setAddStaffOpen(true)}
              disabled={!selectedSchoolId}
              className="bg-navy hover:bg-navy-dark text-xs gap-1.5 h-9 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>افزودن عضو کادر</span>
            </Button>
          </div>
        }
      />

      <KpiCardGrid
        cards={[
          {
            label: "کل کادر مدرسه",
            value: totalStaff,
            icon: Users,
            tint: "navy",
            sublabel: selectedSchool ? selectedSchool.name : undefined,
          },
          {
            label: "معلمان (دبیران)",
            value: teachersCount,
            icon: GraduationCap,
            tint: "info",
          },
          {
            label: "ناظمین و معاونین",
            value: deputiesCount,
            icon: UserCog,
            tint: "emerald",
          },
          {
            label: "مدیران",
            value: principalsCount,
            icon: ShieldCheck,
            tint: "warning",
          },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-navy">
              پرسنل آموزشی {selectedSchool ? `«${selectedSchool.name}»` : ""}
            </CardTitle>
            <CardDescription>
              مدیر سامانه می‌تواند برای هر مدرسه به صورت مستقیم معلم یا معاون تعریف کند.
            </CardDescription>
          </div>
          {selectedSchoolId && (
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Link href={`/super-admin/schools/${selectedSchoolId}`}>
                <Building2 className="h-3.5 w-3.5" />
                <span>صفحه کامل این مدرسه</span>
              </Link>
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {loadingStaff ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="هیچ پرسنلی در این مدرسه ثبت نشده است."
              description="با کلیک روی دکمه «افزودن عضو کادر»، معلم یا معاون جدید تعریف کنید."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden" dir="rtl">
              <Table className="sticky-table-header w-full" dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right min-w-[200px]">نام و نام خانوادگی</TableHead>
                    <TableHead className="text-right min-w-[140px]">نقش سازمانی</TableHead>
                    <TableHead className="text-right min-w-[140px]">شماره همراه</TableHead>
                    <TableHead className="text-right min-w-[130px]">کد ملی</TableHead>
                    <TableHead className="text-right min-w-[130px]">تاریخ ثبت</TableHead>
                    <TableHead className="text-left w-[110px] min-w-[110px] pl-4">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((m) => {
                    const firstName = m.firstName || m.user?.firstName || "";
                    const lastName = m.lastName || m.user?.lastName || "";
                    const fullName = m.fullName || `${firstName} ${lastName}`.trim() || "—";
                    const phone = m.phoneNumber || m.user?.phoneNumber || "—";
                    const nc = m.nationalCode || m.user?.nationalCode || "—";
                    return (
                      <TableRow key={m.id} className="data-table-row">
                        <TableCell className="text-right font-semibold text-navy">
                          {fullName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] gap-1",
                              m.role === "PRINCIPAL"
                                ? "bg-navy/10 text-navy border-navy/30"
                                : m.role === "DEPUTY"
                                ? "bg-emerald/10 text-emerald border-emerald/30"
                                : "bg-info/10 text-info border-info/30"
                            )}
                          >
                            {m.role === "PRINCIPAL" ? "مدیر مدرسه" : m.role === "DEPUTY" ? "ناظم / معاون" : "معلم"}
                          </Badge>
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
                          {toPersianDate(m.createdAt)}
                        </TableCell>
                        <TableCell className="text-left w-[110px] min-w-[110px] pl-4">
                          <div className="flex items-center justify-start gap-1" dir="ltr">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditStaff(m)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-navy hover:bg-navy/10 cursor-pointer"
                              title="ویرایش مشخصات"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {m.role !== "PRINCIPAL" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStaff(m.id, fullName)}
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

      {/* ── Dialog: Add Staff ── */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Users className="h-4 w-4 text-navy" />
              <span>افزودن عضو جدید کادر آموزشی / اداری</span>
            </DialogTitle>
            <DialogDescription>
              عضو جدید برای مدرسه {selectedSchool ? `«${selectedSchool.name}»` : ""} تعریف خواهد شد.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="st-ln-super" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="st-ln-super"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="حسینی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-fn-super" className="text-xs">نام</Label>
                <Input
                  id="st-fn-super"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="مریم"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="st-phone-super" className="text-xs">شماره همراه</Label>
              <Input
                id="st-phone-super"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09123456789"
                inputMode="numeric" dir="ltr"
                className="h-9 text-xs font-mono text-left"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="st-nc-super" className="text-xs">کد ملی</Label>
                <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
              </div>
              <Input
                id="st-nc-super"
                value={form.nationalCode}
                onChange={(e) => setForm({ ...form, nationalCode: e.target.value })}
                placeholder="۱۰ رقم (اختیاری — کد موقت)"
                inputMode="numeric" dir="ltr"
                maxLength={10}
                className="h-9 text-xs font-mono text-left"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="st-role-super" className="text-xs">نقش سازمانی</Label>
              <Select
                value={form.role}
                onValueChange={(val: any) => setForm({ ...form, role: val })}
              >
                <SelectTrigger id="st-role-super" className="h-9 text-xs">
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

      {/* ── Dialog: Edit Staff ── */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Pencil className="h-4 w-4 text-navy" />
              <span>ویرایش مشخصات عضو کادر</span>
            </DialogTitle>
            <DialogDescription>
              ویرایش اطلاعات هویتی و سمت سازمانی در مدرسه {selectedSchool ? `«${selectedSchool.name}»` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditStaff} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="st-edit-ln" className="text-xs">نام خانوادگی</Label>
                <Input
                  id="st-edit-ln"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="حسینی"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-edit-fn" className="text-xs">نام</Label>
                <Input
                  id="st-edit-fn"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="مریم"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="st-edit-ph" className="text-xs">شماره تلفن همراه</Label>
              <Input
                id="st-edit-ph"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                className="h-9 text-xs font-mono"
                inputMode="numeric" dir="ltr"
                placeholder="0912..."
                maxLength={11}
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="st-edit-nc" className="text-xs">کد ملی</Label>
                <span className="text-[10px] text-muted-foreground font-normal">(اختیاری)</span>
              </div>
              <Input
                id="st-edit-nc"
                value={editForm.nationalCode}
                onChange={(e) => setEditForm({ ...editForm, nationalCode: e.target.value })}
                className="h-9 text-xs font-mono"
                inputMode="numeric" dir="ltr"
                placeholder="ده رقم (اختیاری)"
                maxLength={10}
              />
            </div>

            {editingStaff?.role !== "PRINCIPAL" ? (
              <div className="space-y-1">
                <Label className="text-xs">نقش سازمانی</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val: "DEPUTY" | "TEACHER") => setEditForm({ ...editForm, role: val })}
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
                disabled={editSubmitting}
                className="bg-navy hover:bg-navy-dark text-xs h-9 gap-1.5"
              >
                {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
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
    </div>
  );
}

// 1790849142
