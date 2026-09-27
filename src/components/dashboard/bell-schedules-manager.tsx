"use client";

import { useEffect, useState, FormEvent } from "react";
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
import { toast } from "sonner";
import { Loader2, Plus, Clock, Trash2, AlertCircle } from "lucide-react";
import { hhmmToPersian } from "@/lib/timetable/time-utils";

interface Bell {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  slotCount: number;
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

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/bell-schedules");
      const d = await r.json();
      if (d.ok) setBells(d.bellSchedules);
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
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`حذف زنگ «${title}»؟`)) return;
    const r = await fetch(`/api/v1/principal/bell-schedules?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!d.ok) {
      toast.error(d.error ?? "حذف ناموفق بود.");
      return;
    }
    toast.success("زنگ حذف شد.");
    load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <Clock className="h-6 w-6" />
          زنگ‌های مدرسه
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تعریف ساعات شروع و پایان هر زنگ. زمان‌ها در قالب ۲۴ ساعته (HH:mm) ذخیره می‌شوند.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            زنگ جدید
          </CardTitle>
          <CardDescription>
            مثال: زنگ اول — 07:30 تا 09:00
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان زنگ</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="زنگ اول"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">شروع (HH:mm)</Label>
              <Input
                id="startTime"
                type="time"
                dir="ltr"
                className="font-mono text-left"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
                pattern="[0-2][0-9]:[0-5][0-9]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">پایان (HH:mm)</Label>
              <Input
                id="endTime"
                type="time"
                dir="ltr"
                className="font-mono text-left"
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
              className="bg-emerald hover:bg-emerald-dark"
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت زنگ"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            زنگ‌های ثبت‌شده ({bells.length})
          </CardTitle>
          <CardDescription className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-info shrink-0" />
            زمان‌ها در قالب ۲۴ ساعته ذخیره می‌شوند تا مقایسهٔ رشته‌ای معادل مقایسهٔ زمانی باشد.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : bells.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              هنوز زنگی ثبت نشده است.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان</TableHead>
                    <TableHead>شروع</TableHead>
                    <TableHead>پایان</TableHead>
                    <TableHead>مدت</TableHead>
                    <TableHead>استفاده در برنامه</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bells.map((b) => {
                    const [sh, sm] = b.startTime.split(":").map(Number);
                    const [eh, em] = b.endTime.split(":").map(Number);
                    const durMin = eh * 60 + em - (sh * 60 + sm);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.title}</TableCell>
                        <TableCell dir="ltr" className="font-mono">
                          {hhmmToPersian(b.startTime)}
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono">
                          {hhmmToPersian(b.endTime)}
                        </TableCell>
                        <TableCell dir="ltr" className="text-xs text-muted-foreground">
                          {durMin.toLocaleString("fa-IR")} دقیقه
                        </TableCell>
                        <TableCell>{b.slotCount.toLocaleString("fa-IR")}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(b.id, b.title)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={b.slotCount > 0}
                            title={b.slotCount > 0 ? "این زنگ در برنامه هفتگی استفاده شده است." : "حذف"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
