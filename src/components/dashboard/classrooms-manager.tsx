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
  DoorClosed,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

interface ClassRoom {
  id: string;
  gradeLevel: string;
  name: string;
  createdAt: string;
  studentCount: number;
  slotCount: number;
  assessmentCount: number;
}

type SortKey = "gradeLevel" | "name" | "studentCount" | "slotCount" | "assessmentCount";
type SortDir = "asc" | "desc";

export function ClassRoomsManager() {
  const [rooms, setRooms] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ gradeLevel: "", name: "" });
  const [sortKey, setSortKey] = useState<SortKey>("gradeLevel");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/classrooms");
      const d = await r.json();
      if (d.ok) setRooms(d.classrooms);
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
      const r = await fetch("/api/v1/principal/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ثبت کلاس ناموفق بود.");
        return;
      }
      toast.success(`کلاس ${form.gradeLevel} ${form.name} ثبت شد.`);
      setForm({ gradeLevel: "", name: "" });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string, label: string) {
    if (
      !confirm(`حذف کلاس «${label}»؟ این عملیات نرم است و سوابق حفظ می‌شوند.`)
    )
      return;
    const r = await fetch(`/api/v1/principal/classrooms?id=${id}`, {
      method: "DELETE",
    });
    const d = await r.json();
    if (!d.ok) {
      toast.error(d.error ?? "حذف ناموفق بود.");
      return;
    }
    toast.success("کلاس حذف شد.");
    load();
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRooms = useMemo(() => {
    const arr = [...rooms];
    arr.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "name":
          av = a.name;
          bv = b.name;
          break;
        case "studentCount":
          av = a.studentCount;
          bv = b.studentCount;
          break;
        case "slotCount":
          av = a.slotCount;
          bv = b.slotCount;
          break;
        case "assessmentCount":
          av = a.assessmentCount;
          bv = b.assessmentCount;
          break;
        case "gradeLevel":
        default:
          av = a.gradeLevel;
          bv = b.gradeLevel;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rooms, sortKey, sortDir]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="کلاس‌ها"
        subtitle="تعریف پایه‌ها و کلاس‌های فیزیکی مدرسه."
        icon={DoorClosed}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            کلاس جدید
          </CardTitle>
          <CardDescription>
            پایه و نام کلاس را وارد کنید. نام کلاس حداکثر ۵ نویسه است.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade" className="text-xs font-medium">
                پایه
              </Label>
              <Input
                id="grade"
                value={form.gradeLevel}
                onChange={(e) =>
                  setForm({ ...form, gradeLevel: e.target.value })
                }
                placeholder="دهم"
                list="grades"
                required
              />
              <datalist id="grades">
                <option value="هفتم" />
                <option value="هشتم" />
                <option value="نهم" />
                <option value="دهم" />
                <option value="یازدهم" />
                <option value="دوازدهم" />
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium">
                نام کلاس
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الف"
                maxLength={5}
                required
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                {form.name.length.toLocaleString("fa-IR")} / ۵ نویسه
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={submitting || !form.gradeLevel || !form.name}
              className="bg-emerald hover:bg-emerald-dark cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت کلاس"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            کلاس‌های ثبت‌شده
            <span className="text-muted-foreground font-normal mr-2 tabular-nums">
              ({rooms.length.toLocaleString("fa-IR")})
            </span>
          </CardTitle>
          <CardDescription>
            حذف کلاس نرم است — سوابق نمرات و غیبت‌ها حفظ می‌شوند. برای مرتب‌سازی روی عنوان ستون‌ها کلیک کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={DoorClosed}
              title="هنوز کلاسی ثبت نشده است."
              description="با تکمیل فرم بالا، اولین کلاس مدرسه را تعریف کنید."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-[28rem]">
                <Table className="sticky-table-header">
                  <TableHeader>
                    <TableRow>
                      <SortableHead
                        label="پایه"
                        active={sortKey === "gradeLevel"}
                        dir={sortDir}
                        onClick={() => toggleSort("gradeLevel")}
                      />
                      <SortableHead
                        label="نام کلاس"
                        active={sortKey === "name"}
                        dir={sortDir}
                        onClick={() => toggleSort("name")}
                      />
                      <SortableHead
                        label="دانش‌آموزان"
                        active={sortKey === "studentCount"}
                        dir={sortDir}
                        onClick={() => toggleSort("studentCount")}
                        className="text-left"
                      />
                      <SortableHead
                        label="برنامه هفتگی"
                        active={sortKey === "slotCount"}
                        dir={sortDir}
                        onClick={() => toggleSort("slotCount")}
                        className="text-left"
                      />
                      <SortableHead
                        label="ارزیابی‌ها"
                        active={sortKey === "assessmentCount"}
                        dir={sortDir}
                        onClick={() => toggleSort("assessmentCount")}
                        className="text-left"
                      />
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRooms.map((r, i) => (
                      <TableRow
                        key={r.id}
                        className="data-table-row stagger-item"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="font-medium">
                          {r.gradeLevel}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono tabular-nums"
                          >
                            {r.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.studentCount.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.slotCount.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.assessmentCount.toLocaleString("fa-IR")}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    onDelete(r.id, `${r.gradeLevel} ${r.name}`)
                                  }
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                حذف کلاس
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
