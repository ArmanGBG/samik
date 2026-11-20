"use client";

import { useEffect, useMemo, useState, FormEvent, Suspense } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Building2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  Phone,
  Trash2,
  Edit,
} from "lucide-react";
import { toPersianDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { toEnglishDigits } from "@/lib/persian-digits";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";

interface AcademyItem {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "SUSPENDED";
  province: string | null;
  city: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  manager: {
    id: string;
    fullName: string;
    phoneNumber: string;
    nationalCode: string;
  } | null;
  classesCount: number;
  staffCount: number;
  studentsCount: number;
}

export function AcademiesManager() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <AcademiesManagerContent />
    </Suspense>
  );
}

function AcademiesManagerContent() {
  const [academies, setAcademies] = useState<AcademyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    managerFirstName: "",
    managerLastName: "",
    managerPhone: "",
    managerNationalCode: "",
    province: "",
    city: "",
    phone: "",
    address: "",
  });

  // Edit / Status Modal
  const [editTarget, setEditTarget] = useState<AcademyItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED",
    phone: "",
    city: "",
    address: "",
  });

  const loadAcademies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/super-admin/academies");
      const data = await res.json();
      if (data.ok) {
        setAcademies(data.academies || []);
      } else {
        toast.error(data.error || "خطا در دریافت لیست آموزشگاه‌ها.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademies();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("نام آموزشگاه الزامی است.");
    if (!form.code.trim()) return toast.error("کد آموزشگاه الزامی است.");
    if (!form.managerPhone.trim()) return toast.error("شماره موبایل مدیر الزامی است.");
    if (!form.managerNationalCode.trim()) return toast.error("کد ملی مدیر الزامی است.");

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/v1/super-admin/academies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "آموزشگاه جدید با موفقیت ایجاد شد.");
        setCreateOpen(false);
        setForm({
          name: "",
          code: "",
          managerFirstName: "",
          managerLastName: "",
          managerPhone: "",
          managerNationalCode: "",
          province: "",
          city: "",
          phone: "",
          address: "",
        });
        loadAcademies();
      } else {
        toast.error(data.error || "خطا در ثبت آموزشگاه.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه هنگام ارتباط با سرور.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: AcademyItem) => {
    const nextStatus = item.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/v1/super-admin/academies/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(
          nextStatus === "ACTIVE"
            ? "آموزشگاه فعال گردید."
            : "آموزشگاه به حالت معلق تغییر یافت."
        );
        loadAcademies();
      } else {
        toast.error(data.error || "خطا در تغییر وضعیت آموزشگاه.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    }
  };

  const handleEditOpen = (item: AcademyItem) => {
    setEditTarget(item);
    setEditForm({
      name: item.name,
      status: item.status,
      phone: item.phone || "",
      city: item.city || "",
      address: item.address || "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/v1/super-admin/academies/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("اطلاعات آموزشگاه با موفقیت به‌روزرسانی شد.");
        setEditOpen(false);
        setEditTarget(null);
        loadAcademies();
      } else {
        toast.error(data.error || "خطا در ویرایش آموزشگاه.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setEditSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return academies;
    return academies.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.manager?.fullName.toLowerCase().includes(q) ||
        a.manager?.phoneNumber.includes(q)
    );
  }, [academies, query]);

  // KPIs
  const totalCount = academies.length;
  const activeCount = academies.filter((a) => a.status === "ACTIVE").length;
  const totalClasses = academies.reduce((acc, a) => acc + a.classesCount, 0);
  const totalStudents = academies.reduce((acc, a) => acc + a.studentsCount, 0);

  const kpis = [
    {
      label: "کل آموزشگاه‌ها",
      value: totalCount,
      icon: Building2,
      sublabel: "مراکز کنکور ثبت‌شده",
    },
    {
      label: "آموزشگاه‌های فعال",
      value: activeCount,
      icon: CheckCircle2,
      trend: {
        direction: "up" as const,
        value: `${totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100}٪`,
      },
    },
    {
      label: "کل دوره‌ها و کلاس‌ها",
      value: totalClasses,
      icon: BookOpen,
      sublabel: "کلاس‌های کنکور فعال",
    },
    {
      label: "داوطلبان کنکور",
      value: totalStudents,
      icon: GraduationCap,
      sublabel: "عضویت‌های فعال در دوره‌ها",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت آموزشگاه‌های کنکور و مراکز آزاد"
        subtitle="ایجاد آموزشگاه جدید، تخصیص مدیر، نظارت بر دوره‌های کنکور و کلاس‌های استادمحور"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2 text-sm shadow-xs">
            <Plus className="w-4 h-4" />
            ایجاد آموزشگاه جدید
          </Button>
        }
      />

      <KpiCardGrid cards={kpis} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">لیست آموزشگاه‌ها</CardTitle>
              <CardDescription>
                مجموع {totalCount} آموزشگاه در کل سامانه ثبت شده است.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام، کد یا مدیر..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={query ? "نتیجه‌ای یافت نشد" : "هیچ آموزشگاهی ثبت نشده است"}
              description={
                query
                  ? "عبارت دیگری را جستجو کنید."
                  : "با زدن دکمه ایجاد آموزشگاه جدید، اولین مرکز کنکور را ثبت نمایید."
              }
              action={
                !query ? (
                  <Button onClick={() => setCreateOpen(true)} className="gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    ایجاد آموزشگاه جدید
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام آموزشگاه</TableHead>
                    <TableHead>کد شناسه</TableHead>
                    <TableHead>مدیر آموزشگاه</TableHead>
                    <TableHead>شهر / استان</TableHead>
                    <TableHead className="text-center">دوره‌ها</TableHead>
                    <TableHead className="text-center">اساتید</TableHead>
                    <TableHead className="text-center">داوطلبان</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>تاریخ ثبت</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-foreground">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-xs">
                          {item.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.manager ? (
                          <div>
                            <div className="font-medium text-sm">
                              {item.manager.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {item.manager.phoneNumber}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">نامشخص</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.city || item.province
                          ? `${item.city || ""} ${item.province || ""}`.trim()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.classesCount}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.staffCount}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        <Badge variant="secondary" className="font-mono">
                          {item.studentsCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === "ACTIVE" ? (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            فعال
                          </Badge>
                        ) : (
                          <Badge variant="destructive">معلق</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {toPersianDate(new Date(item.createdAt))}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(item)}
                            title={item.status === "ACTIVE" ? "تعلیق" : "فعال‌سازی"}
                          >
                            {item.status === "ACTIVE" ? (
                              <PauseCircle className="w-4 h-4 text-amber-600" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-emerald-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOpen(item)}
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Button>
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

      {/* Create Academy Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ایجاد آموزشگاه کنکور جدید</DialogTitle>
            <DialogDescription>
              مشخصات آموزشگاه و اطلاعات مدیر موسسه را وارد فرمایید.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>نام آموزشگاه *</Label>
                <Input
                  placeholder="مثال: آموزشگاه کنکور هدف البرز"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>کد / شناسه آموزشگاه (انگلیسی) *</Label>
                <Input
                  placeholder="hadaf-alborz"
                  dir="ltr"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>نام مدیر *</Label>
                <Input
                  placeholder="علی"
                  value={form.managerFirstName}
                  onChange={(e) => setForm({ ...form, managerFirstName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>نام خانوادگی مدیر *</Label>
                <Input
                  placeholder="کریمی"
                  value={form.managerLastName}
                  onChange={(e) => setForm({ ...form, managerLastName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>شماره موبایل مدیر *</Label>
                <Input
                  placeholder="09121234567"
                  dir="ltr"
                  maxLength={11}
                  value={form.managerPhone}
                  onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>کد ملی مدیر *</Label>
                <Input
                  placeholder="0012345678"
                  dir="ltr"
                  maxLength={10}
                  value={form.managerNationalCode}
                  onChange={(e) => setForm({ ...form, managerNationalCode: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>استان</Label>
                <Input
                  placeholder="تهران / البرز"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>شهر</Label>
                <Input
                  placeholder="کرج"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>تلفن ثابت آموزشگاه</Label>
                <Input
                  placeholder="02632220000"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  "ثبت آموزشگاه"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Academy Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش اطلاعات آموزشگاه</DialogTitle>
            <DialogDescription>
              تغییر مشخصات آموزشگاه «{editTarget?.name}»
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>نام آموزشگاه</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>شهر</Label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>تلفن ثابت</Label>
              <Input
                dir="ltr"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>آدرس</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    در حال ذخیره...
                  </>
                ) : (
                  "ذخیره تغییرات"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
