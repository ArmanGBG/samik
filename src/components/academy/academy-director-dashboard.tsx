"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  BookOpen,
  Users,
  GraduationCap,
  QrCode,
  CreditCard,
  CheckCircle2,
  Calendar,
  Building2,
  Search,
  Eye,
  FileCheck,
} from "lucide-react";
import { QrModal } from "@/components/academy/qr-modal";
import { SessionAttendanceDialog } from "@/components/academy/session-attendance-dialog";
import { KpiCardGrid } from "@/components/shared/kpi-card";

interface AcademyData {
  academy: {
    id: string;
    name: string;
    code: string;
    managerName: string;
  };
  stats: {
    totalClasses: number;
    totalTeachers: number;
    totalStudents: number;
    attendanceRate: number;
    assignmentRate: number;
  };
  classes: Array<{
    id: string;
    name: string;
    teacherName: string;
    schedule: string;
    studentsCount: number;
    sessionsCount: number;
    qrToken: string;
  }>;
  teachers: Array<{
    id: string;
    staffId: string;
    fullName: string;
    phoneNumber: string;
    teachingSubject: string;
    bankCardNo?: string;
    shebaNo?: string;
  }>;
}

export function AcademyDirectorDashboard() {
  const [data, setData] = useState<AcademyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classes");

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedClassForQr, setSelectedClassForQr] = useState<{
    id: string;
    name: string;
    qrToken: string;
  } | null>(null);

  // Create Class Modal
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createClassSubmitting, setCreateClassSubmitting] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    teacherUserId: "",
    schedule: "",
  });

  // Add Teacher Modal
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [addTeacherSubmitting, setAddTeacherSubmitting] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nationalCode: "",
    teachingSubject: "",
    bankCardNo: "",
    shebaNo: "",
  });

  // Search
  const [query, setQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/academy/overview");
      const json = await res.json();
      if (json.ok) {
        setData(json);
      } else {
        toast.error(json.error || "خطا در دریافت اطلاعات آموزشگاه.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) return toast.error("نام کلاس الزامی است.");

    setCreateClassSubmitting(true);
    try {
      const res = await fetch("/api/v1/academy/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message || "کلاس با موفقیت ایجاد شد.");
        setCreateClassOpen(false);
        setClassForm({ name: "", teacherUserId: "", schedule: "" });
        loadData();
      } else {
        toast.error(json.error || "خطا در ایجاد کلاس.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setCreateClassSubmitting(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.phoneNumber.trim() || !teacherForm.nationalCode.trim()) {
      return toast.error("شماره موبایل و کد ملی الزامی است.");
    }

    setAddTeacherSubmitting(true);
    try {
      const res = await fetch("/api/v1/academy/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message || "استاد با موفقیت اضافه شد.");
        setAddTeacherOpen(false);
        setTeacherForm({
          firstName: "",
          lastName: "",
          phoneNumber: "",
          nationalCode: "",
          teachingSubject: "",
          bankCardNo: "",
          shebaNo: "",
        });
        loadData();
      } else {
        toast.error(json.error || "خطا در افزودن استاد.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setAddTeacherSubmitting(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!data?.classes) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.classes;
    return data.classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q)
    );
  }, [data?.classes, query]);

  if (loading && !data) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    {
      label: "دوره‌ها و کلاس‌ها",
      value: data?.stats?.totalClasses ?? 0,
      icon: BookOpen,
      sublabel: "کلاس‌های کنکور فعال",
    },
    {
      label: "اساتید کنکور",
      value: data?.stats?.totalTeachers ?? 0,
      icon: Users,
      sublabel: "دبیران ثبت‌شده در آموزشگاه",
    },
    {
      label: "داوطلبان کنکور",
      value: data?.stats?.totalStudents ?? 0,
      icon: GraduationCap,
      sublabel: "عضویت‌های فعال در دوره‌ها",
    },
    {
      label: "نرخ انجام تکالیف",
      value: `${data?.stats?.assignmentRate ?? 0}٪`,
      icon: FileCheck,
      sublabel: "تعهد به تکالیف کلاسی",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {data?.academy?.name}
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {data?.academy?.code}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            داشبورد مدیریت دوره‌های کنکور و کلاس‌های تقویتی • مدیر:{" "}
            {data?.academy?.managerName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateClassOpen(true)}
            className="gap-2 text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            تعریف دوره جدید
          </Button>
          <Button
            variant="outline"
            onClick={() => setAddTeacherOpen(true)}
            className="gap-2 text-sm"
          >
            <Users className="w-4 h-4" />
            افزودن استاد
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <KpiCardGrid cards={kpis} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="classes" className="gap-2 text-xs">
            <BookOpen className="w-4 h-4" />
            کلاس‌ها و بارکدها ({data?.classes?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2 text-xs">
            <Users className="w-4 h-4" />
            اساتید و تسویه‌حساب ({data?.teachers?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Classes Tab */}
        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">لیست دوره‌های کنکور</CardTitle>
                  <CardDescription className="text-xs">
                    جهت دریافت بارکد و پوستر چاپ کلاس، دکمه بارکد را بزنید.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="جستجوی نام یا کد کلاس..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pr-9 h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredClasses.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  کلاسی یافت نشد. با زدن «تعریف دوره جدید» شروع کنید.
                </div>
              ) : (
                <div className="border rounded-xl overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>عنوان دوره / درس</TableHead>
                        <TableHead>کد اتصال</TableHead>
                        <TableHead>استاد دوره</TableHead>
                        <TableHead>زمان‌بندی</TableHead>
                        <TableHead className="text-center">دانش‌آموزان</TableHead>
                        <TableHead className="text-center">جلسات برگزار شده</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClasses.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-semibold">{cls.name}</TableCell>
                          <TableCell>
                            <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-xs font-bold text-primary">
                              {cls.id}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{cls.teacherName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cls.schedule}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            <Badge variant="secondary">{cls.studentsCount}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {cls.sessionsCount} جلسه
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClassForQr({
                                    id: cls.id,
                                    name: cls.name,
                                    qrToken: cls.qrToken,
                                  });
                                  setQrModalOpen(true);
                                }}
                                className="gap-1.5 text-xs h-8"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                بارکد QR
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
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">اساتید و اطلاعات مالی تسویه‌حساب</CardTitle>
              <CardDescription className="text-xs">
                شماره شبا و شماره کارت ثبت‌شده اساتید جهت پرداخت‌های مالی
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.teachers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  هیچ استادی ثبت نشده است.
                </div>
              ) : (
                <div className="border rounded-xl overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام استاد</TableHead>
                        <TableHead>شماره تماس</TableHead>
                        <TableHead>درس تدریسی</TableHead>
                        <TableHead>شماره کارت بانکی</TableHead>
                        <TableHead>شماره شبا</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.teachers.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-semibold">{t.fullName}</TableCell>
                          <TableCell className="font-mono text-xs" dir="ltr">
                            {t.phoneNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.teachingSubject}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {t.bankCardNo ? (
                              <span className="bg-muted/50 px-2 py-0.5 rounded">
                                {t.bankCardNo}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">ثبت نشده</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs" dir="ltr">
                            {t.shebaNo ? (
                              `IR${t.shebaNo}`
                            ) : (
                              <span className="text-muted-foreground text-xs">ثبت نشده</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Modal */}
      {selectedClassForQr && (
        <QrModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          classId={selectedClassForQr.id}
          className={selectedClassForQr.name}
          qrToken={selectedClassForQr.qrToken}
        />
      )}

      {/* Create Class Dialog */}
      <Dialog open={createClassOpen} onOpenChange={setCreateClassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعریف کلاس یا دوره کنکور جدید</DialogTitle>
            <DialogDescription>
              مشخصات دوره و زمان‌بندی برگزاری را مشخص فرمایید.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="space-y-1.5">
              <Label>عنوان دوره یا درس *</Label>
              <Input
                placeholder="مثال: فیزیک جامع دوازدهم — استاد رضایی"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>استاد مدرس دوره</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={classForm.teacherUserId}
                onChange={(e) =>
                  setClassForm({ ...classForm, teacherUserId: e.target.value })
                }
              >
                <option value="">-- انتخاب استاد مدرس --</option>
                {data?.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.teachingSubject})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>زمان‌بندی برگزاری</Label>
              <Input
                placeholder="مثال: دوشنبه‌ها ساعت ۱۷:۰۰ الی ۲۰:۰۰"
                value={classForm.schedule}
                onChange={(e) =>
                  setClassForm({ ...classForm, schedule: e.target.value })
                }
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateClassOpen(false)}
                disabled={createClassSubmitting}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={createClassSubmitting}>
                {createClassSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    در حال ایجاد...
                  </>
                ) : (
                  "ایجاد کلاس"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Teacher Dialog */}
      <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>افزودن استاد کنکور جدید</DialogTitle>
            <DialogDescription>
              مشخصات فردی، درس تدریسی و شماره کارت جهت تسویه‌حساب
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input
                  placeholder="محمد"
                  value={teacherForm.firstName}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>نام خانوادگی *</Label>
                <Input
                  placeholder="رضایی"
                  value={teacherForm.lastName}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>شماره موبایل *</Label>
                <Input
                  placeholder="09121234567"
                  dir="ltr"
                  maxLength={11}
                  value={teacherForm.phoneNumber}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>کد ملی *</Label>
                <Input
                  placeholder="0012345678"
                  dir="ltr"
                  maxLength={10}
                  value={teacherForm.nationalCode}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, nationalCode: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>مبحث یا درس تدریسی</Label>
              <Input
                placeholder="مثال: فیزیک کنکور / زیست‌شناسی"
                value={teacherForm.teachingSubject}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, teachingSubject: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>شماره کارت بانکی (جهت تسویه‌حساب)</Label>
              <Input
                placeholder="۶۰۳۷۹۹..."
                dir="ltr"
                maxLength={16}
                value={teacherForm.bankCardNo}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, bankCardNo: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>شماره شبا (بدون IR)</Label>
              <Input
                placeholder="000000000000000000000000"
                dir="ltr"
                maxLength={24}
                value={teacherForm.shebaNo}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, shebaNo: e.target.value })
                }
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddTeacherOpen(false)}
                disabled={addTeacherSubmitting}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={addTeacherSubmitting}>
                {addTeacherSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  "افزودن استاد"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
