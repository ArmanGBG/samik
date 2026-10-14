"use client";

import { useEffect, useMemo, useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  School as SchoolIcon,
  Building2,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  MessageSquareText,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toPersianDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { toEnglishDigits } from "@/lib/persian-digits";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";

interface SchoolRow {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
  smsBalance: number;
  createdAt: string;
  principal?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  } | null;
  _count: { staffEmployments: number; enrollments: number; classrooms: number };
}

type SortKey = "name" | "createdAt" | "smsBalance" | "students" | "staff";
type SortDir = "asc" | "desc";
type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";

export function SchoolsManager() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-navy" />
        </div>
      }
    >
      <SchoolsManagerContent />
    </Suspense>
  );
}

function SchoolsManagerContent() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as StatusFilter) || "ALL";

  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    principalPhone: "",
    principalNationalCode: "",
    principalFirstName: "",
    principalLastName: "",
  });
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/super-admin/schools");
      const d = await r.json();
      if (d.ok) setSchools(d.schools);
      else toast.error(d.error ?? "خطا در دریافت لیست مدارس.");
    } catch (err) {
      console.error("[LOAD_SCHOOLS_ERROR]", err);
      toast.error("خطا در دریافت لیست مدارس.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Update filter when query param changes
  useEffect(() => {
    const s = searchParams.get("status") as StatusFilter;
    if (s && (s === "ACTIVE" || s === "SUSPENDED" || s === "ALL")) {
      setStatusFilter(s);
    }
    if (searchParams.get("new") === "1" || searchParams.get("action") === "new") {
      setAddSchoolOpen(true);
    }
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        subdomain: form.subdomain.trim().toLowerCase(),
        principalPhone: toEnglishDigits(form.principalPhone.trim()),
        principalNationalCode: toEnglishDigits(form.principalNationalCode.trim()),
        principalFirstName: form.principalFirstName.trim(),
        principalLastName: form.principalLastName.trim(),
      };

      const r = await fetch("/api/v1/super-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ثبت مدرسه ناموفق بود.");
        return;
      }
      toast.success(`مدرسه «${d.school.name}» با موفقیت ثبت شد.`);
      setForm({
        name: "",
        subdomain: "",
        principalPhone: "",
        principalNationalCode: "",
        principalFirstName: "",
        principalLastName: "",
      });
      setAddSchoolOpen(false);
      load();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(school: SchoolRow) {
    const isSuspending = school.status === "ACTIVE";
    const actionText = isSuspending ? "تعلیق" : "فعال‌سازی مجدد";
    if (
      !confirm(
        `آیا از ${actionText} مدرسهٔ «${school.name}» اطمینان دارید؟ اطلاعات و سوابق تحصیلی مدرسه محفوظ می‌ماند.`
      )
    )
      return;

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
      toast.success(`مدرسهٔ «${school.name}» با موفقیت ${isSuspending ? "تعلیق شد" : "فعال شد"}.`);
      load();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      // Status filter
      if (statusFilter !== "ALL" && s.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesSubdomain = s.subdomain.toLowerCase().includes(q);
        if (!matchesName && !matchesSubdomain) return false;
      }
      return true;
    });
  }, [schools, statusFilter, searchQuery]);

  const sortedSchools = useMemo(() => {
    const arr = [...filteredSchools];
    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "name":
          av = a.name;
          bv = b.name;
          break;
        case "smsBalance":
          av = a.smsBalance;
          bv = b.smsBalance;
          break;
        case "students":
          av = a._count.enrollments;
          bv = b._count.enrollments;
          break;
        case "staff":
          av = a._count.staffEmployments;
          bv = b._count.staffEmployments;
          break;
        case "createdAt":
        default:
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredSchools, sortKey, sortDir]);

  // KPI aggregates
  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.status === "ACTIVE").length;
  const suspendedSchools = schools.filter((s) => s.status === "SUSPENDED").length;
  const totalSmsBalance = schools.reduce((sum, s) => sum + s.smsBalance, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="مدارس پلتفرم"
        subtitle="نظارت بر کل مدارس، ثبت مدرسهٔ جدید، تخصیص لایسنس و دسترسی مدیریتی به کادر و دانش‌آموزان هر مدرسه."
        icon={Building2}
        actions={
          <Button
            onClick={() => setAddSchoolOpen(true)}
            className="bg-navy hover:bg-navy-dark gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>افزودن مدرسه جدید</span>
          </Button>
        }
      />

      <KpiCardGrid
        cards={[
          {
            label: "کل مدارس",
            value: totalSchools,
            icon: Building2,
            tint: "navy",
            onClick: () => setStatusFilter("ALL"),
            sublabel: statusFilter === "ALL" ? "فیلتر فعال" : "کلیک برای مشاهده همه",
          },
          {
            label: "مدارس فعال",
            value: activeSchools,
            icon: CheckCircle2,
            tint: "emerald",
            onClick: () => setStatusFilter("ACTIVE"),
            sublabel: statusFilter === "ACTIVE" ? "فیلتر فعال" : "کلیک برای فیلتر فعال‌ها",
          },
          {
            label: "مدارس معلق",
            value: suspendedSchools,
            icon: PauseCircle,
            tint: "destructive",
            onClick: () => setStatusFilter("SUSPENDED"),
            sublabel: statusFilter === "SUSPENDED" ? "فیلتر فعال" : "کلیک برای فیلتر معلق‌ها",
          },
          {
            label: "موجودی کل پیامک",
            value: totalSmsBalance.toLocaleString("fa-IR"),
            icon: MessageSquareText,
            tint: "info",
            sublabel: "شارژ تمام مدارس",
          },
        ]}
      />

      {/* ── Registered Schools Table (Displayed First) ── */}
      <Card>
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <span>مدارس ثبت‌شده</span>
              <Badge variant="outline" className="font-mono tabular-nums">
                {filteredSchools.length.toLocaleString("fa-IR")} از {totalSchools.toLocaleString("fa-IR")}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              مدارس فعال پلتفرم — برای ورود به بخش مدیریت کادر، دانش‌آموزان و ساختار هر مدرسه، روی «مدیریت مدرسه» یا نام آن کلیک کنید.
            </CardDescription>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t mt-3">
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  statusFilter === "ALL"
                    ? "bg-white text-navy shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                همه ({totalSchools})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  statusFilter === "ACTIVE"
                    ? "bg-emerald text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                فعال ({activeSchools})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("SUSPENDED")}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all cursor-pointer",
                  statusFilter === "SUSPENDED"
                    ? "bg-destructive text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                معلق ({suspendedSchools})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="جستجوی مدرسه یا زیردامنه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : filteredSchools.length === 0 ? (
            <EmptyState
              icon={SchoolIcon}
              title={
                searchQuery
                  ? "هیچ مدرسه‌ای مطابق با عبارت جستجو یافت نشد."
                  : statusFilter !== "ALL"
                  ? "هیچ مدرسه‌ای با این وضعیت یافت نشد."
                  : "هنوز مدرسه‌ای ثبت نشده است."
              }
              description={
                searchQuery
                  ? "عبارت دیگری را امتحان کنید یا فیلترها را ریست کنید."
                  : "با کلیک روی دکمه «افزودن مدرسه جدید»، اولین مدرسهٔ پلتفرم را ثبت کنید."
              }
              action={
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    if (schools.length === 0) setAddSchoolOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-3 cursor-pointer"
                >
                  {schools.length === 0 ? "ثبت اولین مدرسه" : "پاک کردن فیلترها"}
                </Button>
              }
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-[30rem]">
                <Table className="sticky-table-header">
                  <TableHeader>
                    <TableRow>
                      <SortableHead
                        label="نام مدرسه"
                        active={sortKey === "name"}
                        dir={sortDir}
                        onClick={() => toggleSort("name")}
                      />
                      <TableHead>زیردامنه</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <SortableHead
                        label="موجودی پیامک"
                        active={sortKey === "smsBalance"}
                        dir={sortDir}
                        onClick={() => toggleSort("smsBalance")}
                        className="text-left"
                      />
                      <SortableHead
                        label="پرسنل"
                        active={sortKey === "staff"}
                        dir={sortDir}
                        onClick={() => toggleSort("staff")}
                        className="text-left"
                      />
                      <SortableHead
                        label="دانش‌آموزان"
                        active={sortKey === "students"}
                        dir={sortDir}
                        onClick={() => toggleSort("students")}
                        className="text-left"
                      />
                      <TableHead>کلاس‌ها</TableHead>
                      <SortableHead
                        label="تاریخ ثبت"
                        active={sortKey === "createdAt"}
                        dir={sortDir}
                        onClick={() => toggleSort("createdAt")}
                      />
                      <TableHead className="text-left min-w-[140px]">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSchools.map((s, i) => (
                      <TableRow
                        key={s.id}
                        className="data-table-row stagger-item"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <TableCell className="font-semibold text-navy">
                          <Link
                            href={`/super-admin/schools/${s.id}`}
                            className="hover:underline hover:text-navy-dark flex items-center gap-1.5 transition-colors group/link"
                            title={`ورود به صفحه مدیریت مدرسه ${s.name}`}
                          >
                            <Building2 className="h-4 w-4 text-navy/70 group-hover/link:text-navy shrink-0" />
                            <span>{s.name}</span>
                          </Link>
                          {s.principal && (
                            <div className="text-[11px] text-muted-foreground font-normal flex items-center gap-1 mt-0.5">
                              <span className="text-muted-foreground/70">مدیر:</span>
                              <span className="text-navy font-medium">
                                {s.principal.firstName} {s.principal.lastName}
                              </span>
                              <span
                                className="font-mono text-[10px] text-muted-foreground/70"
                                dir="ltr"
                              >
                                ({s.principal.phoneNumber})
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          className="font-mono text-xs text-muted-foreground tabular-nums text-left"
                        >
                          <span className="font-semibold text-foreground">{s.subdomain}</span>
                          <span className="text-muted-foreground/60">.samik.app</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={s.status === "ACTIVE" ? "default" : "destructive"}
                            className={
                              s.status === "ACTIVE"
                                ? "bg-emerald hover:bg-emerald text-white text-[11px]"
                                : "text-[11px]"
                            }
                          >
                            {s.status === "ACTIVE" ? "فعال" : "معلق"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          className="font-mono tabular-nums text-left font-medium"
                        >
                          {s.smsBalance.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {s._count.staffEmployments.toLocaleString("fa-IR")} نفر
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {s._count.enrollments.toLocaleString("fa-IR")} نفر
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {s._count.classrooms.toLocaleString("fa-IR")} کلاس
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {toPersianDate(s.createdAt)}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs gap-1.5 text-navy hover:text-navy hover:border-navy cursor-pointer"
                            >
                              <Link href={`/super-admin/schools/${s.id}`}>
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                <span>مدیریت مدرسه</span>
                              </Link>
                            </Button>

                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "cursor-pointer h-8 w-8 p-0",
                                      s.status === "ACTIVE"
                                        ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        : "text-emerald hover:text-emerald hover:bg-emerald/10"
                                    )}
                                    onClick={() => handleToggleStatus(s)}
                                    aria-label={
                                      s.status === "ACTIVE"
                                        ? `تعلیق مدرسه ${s.name}`
                                        : `فعال‌سازی مدرسه ${s.name}`
                                    }
                                  >
                                    {s.status === "ACTIVE" ? (
                                      <PauseCircle className="h-4 w-4" />
                                    ) : (
                                      <PlayCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {s.status === "ACTIVE" ? "تعلیق مدرسه" : "فعال‌سازی مجدد مدرسه"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add School Dialog (Modal) ── */}
      <Dialog open={addSchoolOpen} onOpenChange={setAddSchoolOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald" />
              <span>ثبت و راه‌اندازی مدرسهٔ جدید</span>
            </DialogTitle>
            <DialogDescription>
              مشخصات مدرسه و مدیر ارشد اولیه آن را وارد کنید. با ثبت این فرم، مدرسه و حساب کاربری مدیر به‌صورت اتمیک ایجاد می‌شوند.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="school-name" className="text-xs font-medium">
                  نام مدرسه <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="school-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً دبیرستان دخترانه فرزانگان"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="subdomain" className="text-xs font-medium">
                  زیردامنه سامیک (Subdomain) <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-1 dir-ltr">
                  <Input
                    id="subdomain"
                    value={form.subdomain}
                    onChange={(e) =>
                      setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                    }
                    placeholder="farzanegan"
                    dir="ltr"
                    className="h-9 text-xs font-mono tabular-nums text-left flex-1"
                    required
                  />
                  <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-2 rounded-md border shrink-0">
                    .samik.app
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  فقط حروف کوچک انگلیسی، ارقام و خط‌تیره مجاز است.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fn" className="text-xs font-medium">
                  نام مدیر مدرسه <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fn"
                  value={form.principalFirstName}
                  onChange={(e) =>
                    setForm({ ...form, principalFirstName: e.target.value })
                  }
                  placeholder="مثلاً مریم"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ln" className="text-xs font-medium">
                  نام خانوادگی مدیر <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ln"
                  value={form.principalLastName}
                  onChange={(e) =>
                    setForm({ ...form, principalLastName: e.target.value })
                  }
                  placeholder="مثلاً حسینی"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  شماره موبایل مدیر (جهت ورود با OTP) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  value={form.principalPhone}
                  onChange={(e) =>
                    setForm({ ...form, principalPhone: e.target.value })
                  }
                  placeholder="09123456789"
                  dir="ltr"
                  inputMode="numeric"
                  className="h-9 text-xs font-mono tabular-nums text-left"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nc" className="text-xs font-medium">
                  کد ملی مدیر (۱۰ رقم) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nc"
                  value={form.principalNationalCode}
                  onChange={(e) =>
                    setForm({ ...form, principalNationalCode: e.target.value })
                  }
                  placeholder="0012345678"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={10}
                  className="h-9 text-xs font-mono tabular-nums text-left"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t sm:justify-start gap-2">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald hover:bg-emerald-dark cursor-pointer gap-2 font-medium h-9 text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>در حال راه‌اندازی مدرسه...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>ثبت نهایی و راه‌اندازی مدرسه</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddSchoolOpen(false)}
                className="cursor-pointer h-9 text-xs"
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

/* ── Sortable Table Header ── */
function SortableHead({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active
    ? ChevronsUpDown
    : dir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <TableHead className={cn("p-0", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 px-2 h-10 text-right font-medium cursor-pointer hover:text-navy transition-colors w-full",
          active && "text-navy"
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            !active && "text-muted-foreground/60"
          )}
        />
      </button>
    </TableHead>
  );
}
