"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
  MessageSquareText,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  _count: { staffEmployments: number; enrollments: number; classrooms: number };
}

type SortKey = "name" | "createdAt" | "smsBalance" | "students" | "staff";
type SortDir = "asc" | "desc";

export function SchoolsManager() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch("/api/v1/super-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      load();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSchool(id: string, name: string) {
    if (
      !confirm(
        `غیرفعال‌سازی (تعلیق) مدرسهٔ «${name}»؟ کلیه اطلاعات و سوابق تحصیلی مدرسه در دیتابیس محفوظ می‌ماند.`
      )
    )
      return;
    try {
      const r = await fetch(`/api/v1/super-admin/schools?id=${id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "خطا در غیرفعال‌سازی مدرسه.");
        return;
      }
      toast.success(`مدرسهٔ «${name}» با موفقیت تعلیق شد.`);
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

  const sortedSchools = useMemo(() => {
    const arr = [...schools];
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
  }, [schools, sortKey, sortDir]);

  // KPI aggregates
  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.status === "ACTIVE").length;
  const suspendedSchools = schools.filter(
    (s) => s.status === "SUSPENDED"
  ).length;
  const totalSmsBalance = schools.reduce((sum, s) => sum + s.smsBalance, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="مدارس"
        subtitle="آنبوردینگ مدرسهٔ جدید، تخصیص زیردامنه و مشاهدهٔ وضعیت لایسنس."
        icon={Building2}
      />

      <KpiCardGrid
        cards={[
          {
            label: "کل مدارس",
            value: totalSchools,
            icon: Building2,
            tint: "navy",
          },
          {
            label: "مدارس فعال",
            value: activeSchools,
            icon: CheckCircle2,
            tint: "emerald",
          },
          {
            label: "مدارس معلق",
            value: suspendedSchools,
            icon: PauseCircle,
            tint: "destructive",
          },
          {
            label: "موجودی کل پیامک",
            value: totalSmsBalance.toLocaleString("fa-IR"),
            icon: MessageSquareText,
            tint: "info",
          },
        ]}
      />

      {/* Onboarding form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            ثبت مدرسهٔ جدید
          </CardTitle>
          <CardDescription>
            فرم زیر یک مدرسهٔ جدید و مدیر اولیهٔ آن را به‌صورت اتمیک ثبت می‌کند. مدیر می‌تواند با شماره موبایل وارد شود.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-xs font-medium">
                نام مدرسه
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً دبیرستان شهید بهشتی"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-xs font-medium">
                زیردامنه
              </Label>
              <Input
                id="subdomain"
                value={form.subdomain}
                onChange={(e) =>
                  setForm({ ...form, subdomain: e.target.value.toLowerCase() })
                }
                placeholder="alborz"
                dir="ltr"
                className="text-left font-mono tabular-nums"
                required
              />
              <p className="text-xs text-muted-foreground tabular-nums" dir="ltr">
                {form.subdomain || "alborz"}.samik.app
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-medium">
                شماره موبایل مدیر
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
                className="text-left font-mono tabular-nums"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc" className="text-xs font-medium">
                کد ملی مدیر
              </Label>
              <Input
                id="nc"
                value={form.principalNationalCode}
                onChange={(e) =>
                  setForm({ ...form, principalNationalCode: e.target.value })
                }
                placeholder="1234567890"
                dir="ltr"
                inputMode="numeric"
                className="text-left font-mono tabular-nums"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fn" className="text-xs font-medium">
                نام مدیر
              </Label>
              <Input
                id="fn"
                value={form.principalFirstName}
                onChange={(e) =>
                  setForm({ ...form, principalFirstName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ln" className="text-xs font-medium">
                نام خانوادگی مدیر
              </Label>
              <Input
                id="ln"
                value={form.principalLastName}
                onChange={(e) =>
                  setForm({ ...form, principalLastName: e.target.value })
                }
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald hover:bg-emerald-dark cursor-pointer gap-2 font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ثبت و راه‌اندازی مدرسه...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  ثبت و راه‌اندازی مدرسه جدید
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Schools list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            مدارس ثبت‌شده
            <span className="text-muted-foreground font-normal mr-2 tabular-nums">
              ({schools.length.toLocaleString("fa-IR")})
            </span>
          </CardTitle>
          <CardDescription>
            برای مرتب‌سازی روی عنوان ستون‌ها کلیک کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : schools.length === 0 ? (
            <EmptyState
              icon={SchoolIcon}
              title="هنوز مدرسه‌ای ثبت نشده است."
              description="با تکمیل فرم بالا، اولین مدرسهٔ پلتفرم را ثبت کنید."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-[28rem]">
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
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSchools.map((s, i) => (
                      <TableRow
                        key={s.id}
                        className="data-table-row stagger-item"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell
                          dir="ltr"
                          className="font-mono text-xs text-muted-foreground tabular-nums text-left"
                        >
                          {s.subdomain}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              s.status === "ACTIVE" ? "default" : "destructive"
                            }
                            className={
                              s.status === "ACTIVE"
                                ? "bg-emerald hover:bg-emerald"
                                : ""
                            }
                          >
                            {s.status === "ACTIVE" ? "فعال" : "معلق"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          className="font-mono tabular-nums text-left"
                        >
                          {s.smsBalance.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {s._count.staffEmployments.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {s._count.enrollments.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {s._count.classrooms.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {format(new Date(s.createdAt), "yyyy/MM/dd", {
                            locale: faIR,
                          })}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8 w-8 p-0"
                                  onClick={() => handleDeleteSchool(s.id, s.name)}
                                  aria-label={`تعلیق و غیرفعال‌سازی مدرسه ${s.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                تعلیق و غیرفعال‌سازی مدرسه
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
