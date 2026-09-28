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
  Clock,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { hhmmToPersian } from "@/lib/timetable/time-utils";

interface Bell {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  slotCount: number;
}

type SortKey = "title" | "startTime" | "endTime" | "duration" | "slotCount";
type SortDir = "asc" | "desc";

function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function BellSchedulesManager() {
  const [bells, setBells] = useState<Bell[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    startTime: "07:30",
    endTime: "09:00",
  });
  const [sortKey, setSortKey] = useState<SortKey>("startTime");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/bell-schedules");
      const d = await r.json();
      if (d.ok) setBells(d.bellSchedules);
    } catch (err) {
      console.error("[LOAD_BELL_SCHEDULES_ERROR]", err);
      toast.error("خطا در بارگذاری لیست زنگ‌ها.");
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
      const r = await fetch("/api/v1/principal/bell-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ثبت زنگ ناموفق بود.");
        return;
      }
      toast.success(`زنگ «${form.title}» ثبت شد.`);
      setForm({ title: "", startTime: "07:30", endTime: "09:00" });
      load();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`حذف زنگ «${title}»؟`)) return;
    try {
      const r = await fetch(`/api/v1/principal/bell-schedules?id=${id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "حذف ناموفق بود.");
        return;
      }
      toast.success("زنگ حذف شد.");
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

  const sortedBells = useMemo(() => {
    const arr = [...bells];
    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "startTime":
          av = a.startTime;
          bv = b.startTime;
          break;
        case "endTime":
          av = a.endTime;
          bv = b.endTime;
          break;
        case "duration":
          av = durationMinutes(a.startTime, a.endTime);
          bv = durationMinutes(b.startTime, b.endTime);
          break;
        case "slotCount":
          av = a.slotCount;
          bv = b.slotCount;
          break;
        case "title":
        default:
          av = a.title;
          bv = b.title;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [bells, sortKey, sortDir]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="زنگ‌های مدرسه"
        subtitle="تعریف ساعات شروع و پایان هر زنگ. زمان‌ها در قالب ۲۴ ساعته (HH:mm) ذخیره می‌شوند."
        icon={Clock}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            زنگ جدید
          </CardTitle>
          <CardDescription>
            مثال: زنگ اول — 07:30 تا 09:00. زنگ‌ها نباید با هم تداخل زمانی داشته باشند.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-medium">
                عنوان زنگ
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="زنگ اول"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-xs font-medium">
                شروع (HH:mm)
              </Label>
              <Input
                id="startTime"
                type="time"
                dir="ltr"
                className="font-mono text-left tabular-nums"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
                required
                pattern="[0-2][0-9]:[0-5][0-9]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-xs font-medium">
                پایان (HH:mm)
              </Label>
              <Input
                id="endTime"
                type="time"
                dir="ltr"
                className="font-mono text-left tabular-nums"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
                pattern="[0-2][0-9]:[0-5][0-9]"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={submitting || !form.title}
              className="bg-emerald hover:bg-emerald-dark cursor-pointer gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ثبت زنگ جدید...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  ثبت و تعریف زنگ جدید
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            زنگ‌های ثبت‌شده
            <span className="text-muted-foreground font-normal mr-2 tabular-nums">
              ({bells.length.toLocaleString("fa-IR")})
            </span>
          </CardTitle>
          <CardDescription className="flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-info shrink-0" />
            زمان‌ها در قالب ۲۴ ساعته ذخیره می‌شوند تا مقایسهٔ رشته‌ای معادل مقایسهٔ زمانی باشد.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : bells.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="هنوز زنگی ثبت نشده است."
              description="با تکمیل فرم بالا، اولین زنگ مدرسه را تعریف کنید."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-[28rem]">
                <Table className="sticky-table-header">
                  <TableHeader>
                    <TableRow>
                      <SortableHead
                        label="عنوان"
                        active={sortKey === "title"}
                        dir={sortDir}
                        onClick={() => toggleSort("title")}
                      />
                      <SortableHead
                        label="شروع"
                        active={sortKey === "startTime"}
                        dir={sortDir}
                        onClick={() => toggleSort("startTime")}
                        className="text-left"
                      />
                      <SortableHead
                        label="پایان"
                        active={sortKey === "endTime"}
                        dir={sortDir}
                        onClick={() => toggleSort("endTime")}
                        className="text-left"
                      />
                      <SortableHead
                        label="مدت"
                        active={sortKey === "duration"}
                        dir={sortDir}
                        onClick={() => toggleSort("duration")}
                        className="text-left"
                      />
                      <SortableHead
                        label="استفاده در برنامه"
                        active={sortKey === "slotCount"}
                        dir={sortDir}
                        onClick={() => toggleSort("slotCount")}
                        className="text-left"
                      />
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBells.map((b, i) => {
                      const durMin = durationMinutes(b.startTime, b.endTime);
                      return (
                        <TableRow
                          key={b.id}
                          className="data-table-row stagger-item"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <TableCell className="font-medium">
                            {b.title}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="font-mono tabular-nums text-left"
                          >
                            {hhmmToPersian(b.startTime)}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="font-mono tabular-nums text-left"
                          >
                            {hhmmToPersian(b.endTime)}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="text-xs text-muted-foreground tabular-nums text-left"
                          >
                            {durMin.toLocaleString("fa-IR")} دقیقه
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {b.slotCount.toLocaleString("fa-IR")}
                          </TableCell>
                          <TableCell>
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(b.id, b.title)}
                                    disabled={b.slotCount > 0}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8 w-8 p-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label={`حذف زنگ ${b.title}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {b.slotCount > 0
                                    ? "این زنگ در برنامهٔ هفتگی استفاده شده و قابل حذف نیست."
                                    : `حذف زنگ «${b.title}»`}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
          "flex items-center gap-1.5 px-2 h-10 font-medium cursor-pointer hover:text-navy transition-colors w-full",
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
