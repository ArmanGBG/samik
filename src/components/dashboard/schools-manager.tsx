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
import { Loader2, Plus, School as SchoolIcon, Building2 } from "lucide-react";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";

interface SchoolRow {
  id: string;
  name: string;
  subdomain: string;
  status: "ACTIVE" | "SUSPENDED";
  smsBalance: number;
  createdAt: string;
  _count: { staffEmployments: number; enrollments: number; classrooms: number };
}

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

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/super-admin/schools");
      const d = await r.json();
      if (d.ok) setSchools(d.schools);
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          مدیریت مدارس
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          آنبوردینگ مدرسه جدید، تخصیص زیردامنه و مشاهده وضعیت لایسنس.
        </p>
      </div>

      {/* Onboarding form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy flex items-center gap-2">
            <Plus className="h-4 w-4" />
            ثبت مدرسه جدید
          </CardTitle>
          <CardDescription>
            فرم زیر یک مدرسه جدید و مدیر اولیه آن را به‌صورت اتمیک ثبت می‌کند.
            مدیر می‌تواند با شماره موبایل وارد شود.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">نام مدرسه</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً دبیرستان شهید بهشتی"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">زیردامنه</Label>
              <Input
                id="subdomain"
                value={form.subdomain}
                onChange={(e) =>
                  setForm({ ...form, subdomain: e.target.value.toLowerCase() })
                }
                placeholder="alborz"
                dir="ltr"
                className="text-left font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">
                نتیجه: {form.subdomain || "alborz"}.samik.app
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">شماره موبایل مدیر</Label>
              <Input
                id="phone"
                value={form.principalPhone}
                onChange={(e) => setForm({ ...form, principalPhone: e.target.value })}
                placeholder="09123456789"
                dir="ltr"
                className="text-left font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc">کد ملی مدیر</Label>
              <Input
                id="nc"
                value={form.principalNationalCode}
                onChange={(e) =>
                  setForm({ ...form, principalNationalCode: e.target.value })
                }
                placeholder="1234567890"
                dir="ltr"
                className="text-left font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fn">نام مدیر</Label>
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
              <Label htmlFor="ln">نام خانوادگی مدیر</Label>
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
              className="bg-emerald hover:bg-emerald-dark"
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت مدرسه"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Schools list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            مدارس ثبت‌شده ({schools.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <SchoolIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              هنوز مدرسه‌ای ثبت نشده است.
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام مدرسه</TableHead>
                    <TableHead>زیردامنه</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>موجودی پیامک</TableHead>
                    <TableHead>پرسنل</TableHead>
                    <TableHead>دانش‌آموزان</TableHead>
                    <TableHead>کلاس‌ها</TableHead>
                    <TableHead>تاریخ ثبت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell dir="ltr" className="font-mono text-xs">
                        {s.subdomain}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === "ACTIVE" ? "default" : "destructive"}
                          className={
                            s.status === "ACTIVE"
                              ? "bg-emerald hover:bg-emerald"
                              : ""
                          }
                        >
                          {s.status === "ACTIVE" ? "فعال" : "معلق"}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="font-mono">
                        {s.smsBalance.toLocaleString("fa-IR")}
                      </TableCell>
                      <TableCell>{s._count.staffEmployments}</TableCell>
                      <TableCell>{s._count.enrollments}</TableCell>
                      <TableCell>{s._count.classrooms}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(s.createdAt), "yyyy/MM/dd", {
                          locale: faIR,
                        })}
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
