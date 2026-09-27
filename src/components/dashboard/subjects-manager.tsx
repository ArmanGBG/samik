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
import { Loader2, Plus, BookOpen, Trash2 } from "lucide-react";

interface Subject {
  id: string;
  title: string;
  createdAt: string;
  slotCount: number;
}

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/principal/subjects");
      const d = await r.json();
      if (d.ok) setSubjects(d.subjects);
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
      const r = await fetch("/api/v1/principal/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "ثبت درس ناموفق بود.");
        return;
      }
      toast.success(`درس «${title}» ثبت شد.`);
      setTitle("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`حذف درس «${title}»؟`)) return;
    const r = await fetch(`/api/v1/principal/subjects?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!d.ok) {
      toast.error(d.error ?? "حذف ناموفق بود.");
      return;
    }
    toast.success("درس حذف شد.");
    load();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          دروس
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تعریف دروس قابل ارائه در مدرسه.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            درس جدید
          </CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-2">
            <Label htmlFor="title">عنوان درس</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً ریاضیات گسسته"
              required
            />
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={submitting || !title}
              className="bg-emerald hover:bg-emerald-dark"
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت درس"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            دروس ثبت‌شده ({subjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
              هنوز درسی ثبت نشده است.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان درس</TableHead>
                    <TableHead>تعداد استفاده در برنامه</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>{s.slotCount.toLocaleString("fa-IR")}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(s.id, s.title)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={s.slotCount > 0}
                          title={s.slotCount > 0 ? "این درس در برنامه هفتگی استفاده شده است." : "حذف"}
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
