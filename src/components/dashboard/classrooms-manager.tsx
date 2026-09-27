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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, DoorOpen, Trash2, DoorClosed } from "lucide-react";

interface ClassRoom {
  id: string;
  gradeLevel: string;
  name: string;
  createdAt: string;
  studentCount: number;
  slotCount: number;
  assessmentCount: number;
}

export function ClassRoomsManager() {
  const [rooms, setRooms] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ gradeLevel: "", name: "" });

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
    if (!confirm(`حذف کلاس «${label}»؟ این عملیات نرم است و سوابق حفظ می‌شوند.`)) return;
    const r = await fetch(`/api/v1/principal/classrooms?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!d.ok) {
      toast.error(d.error ?? "حذف ناموفق بود.");
      return;
    }
    toast.success("کلاس حذف شد.");
    load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <DoorClosed className="h-6 w-6" />
          کلاس‌ها
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تعریف پایه‌ها و کلاس‌های فیزیکی مدرسه.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            کلاس جدید
          </CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">پایه</Label>
              <Input
                id="grade"
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                placeholder="دهم"
                list="grades"
                required
              />
              <datalist id="grades">
                <option value="دهم" />
                <option value="یازدهم" />
                <option value="دوازدهم" />
                <option value="هفتم" />
                <option value="هشتم" />
                <option value="نهم" />
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">نام کلاس</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الف"
                maxLength={5}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={submitting || !form.gradeLevel || !form.name}
              className="bg-emerald hover:bg-emerald-dark"
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
            کلاس‌های ثبت‌شده ({rooms.length})
          </CardTitle>
          <CardDescription>حذف کلاس نرم است — سوابق نمرات و غیبت‌ها حفظ می‌شوند.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <DoorOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
              هنوز کلاسی ثبت نشده است.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>پایه</TableHead>
                    <TableHead>نام کلاس</TableHead>
                    <TableHead>دانش‌آموزان</TableHead>
                    <TableHead>برنامه هفتگی</TableHead>
                    <TableHead>ارزیابی‌ها</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.gradeLevel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {r.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.studentCount.toLocaleString("fa-IR")}</TableCell>
                      <TableCell>{r.slotCount.toLocaleString("fa-IR")}</TableCell>
                      <TableCell>{r.assessmentCount.toLocaleString("fa-IR")}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(r.id, `${r.gradeLevel} ${r.name}`)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
