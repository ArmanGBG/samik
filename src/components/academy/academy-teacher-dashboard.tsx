"use client";

import { useEffect, useState } from "react";
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
  BookOpen,
  Calendar,
  Users,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  ChevronLeft,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { toPersianDate } from "@/lib/date-utils";
import { SessionAttendanceDialog } from "@/components/academy/session-attendance-dialog";
import { QrModal } from "@/components/academy/qr-modal";

interface TeacherClassItem {
  id: string;
  name: string;
  schedule: string;
  qrToken: string;
  studentsCount: number;
  sessionsCount: number;
  lastSession: {
    sessionNum: number;
    name: string;
    date: string;
  } | null;
}

export function AcademyTeacherDashboard() {
  const [classes, setClasses] = useState<TeacherClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Class Drilldown
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Session Modal
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [submittingSession, setSubmittingSession] = useState(false);

  // Attendance Sheet Dialog
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalClass, setQrModalClass] = useState<{
    id: string;
    name: string;
    qrToken: string;
  } | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/academy/classes");
      const data = await res.json();
      if (data.ok) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.error || "خطا در دریافت لیست کلاس‌ها.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setLoading(false);
    }
  };

  const loadClassDetail = async (classId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v1/academy/classes/${classId}`);
      const data = await res.json();
      if (data.ok) {
        setClassDetail(data.classItem);
      } else {
        toast.error(data.error || "خطا در دریافت جزییات کلاس.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleOpenClass = (classId: string) => {
    setActiveClassId(classId);
    loadClassDetail(classId);
  };

  const handleBackToClasses = () => {
    setActiveClassId(null);
    setClassDetail(null);
    loadClasses();
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassId) return;

    setSubmittingSession(true);
    try {
      const res = await fetch("/api/v1/academy/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: activeClassId,
          name: newSessionName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "جلسه با موفقیت ایجاد شد.");
        setNewSessionOpen(false);
        setNewSessionName("");
        loadClassDetail(activeClassId);

        // Directly open attendance sheet for this new session
        if (data.session?.id) {
          setActiveSessionId(data.session.id);
          setAttendanceDialogOpen(true);
        }
      } else {
        toast.error(data.error || "خطا در ایجاد جلسه.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setSubmittingSession(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail View of a Class */}
      {activeClassId && classDetail ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 bg-card p-5 rounded-2xl border">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackToClasses}
                title="بازگشت به کلاس‌ها"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{classDetail.name}</h1>
                  <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                    {classDetail.id}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {classDetail.schedule} • {classDetail.students.length} دانش‌آموز ثبت‌نامی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQrModalClass({
                    id: classDetail.id,
                    name: classDetail.name,
                    qrToken: classDetail.qrToken,
                  });
                  setQrModalOpen(true);
                }}
                className="gap-1.5 text-xs h-9"
              >
                <QrCode className="w-4 h-4" />
                بارکد کلاس
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const nextNum = (classDetail.sessions[0]?.sessionNum || 0) + 1;
                  setNewSessionName(`جلسه ${nextNum}`);
                  setNewSessionOpen(true);
                }}
                className="gap-1.5 text-xs h-9"
              >
                <Plus className="w-4 h-4" />
                ثبت جلسه جدید
              </Button>
            </div>
          </div>

          {/* Sessions List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                جلسات برگزار شده دوره
              </CardTitle>
              <CardDescription className="text-xs">
                برای ثبت یا ویرایش وضعیت حضور، غیاب و تکالیف، روی جلسه مربوطه کلیک
                فرمایید.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classDetail.sessions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  هنوز جلسه‌ای برای این کلاس ثبت نشده است. با زدن دکمه «ثبت جلسه
                  جدید» اولین جلسه را آغاز کنید.
                </div>
              ) : (
                <div className="border rounded-xl overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>عنوان جلسه</TableHead>
                        <TableHead>تاریخ برگزاری</TableHead>
                        <TableHead className="text-center">حاضرین</TableHead>
                        <TableHead className="text-center">تأخیر</TableHead>
                        <TableHead className="text-center">غایبین</TableHead>
                        <TableHead className="text-center">تکالیف انجام شده</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classDetail.sessions.map((sess: any) => (
                        <TableRow key={sess.id}>
                          <TableCell className="font-semibold flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {sess.sessionNum}
                            </span>
                            {sess.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {toPersianDate(new Date(sess.date))}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              {sess.presentCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {sess.lateCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                              {sess.absentCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                              {sess.assignmentDoneCount} / {sess.totalRecords}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveSessionId(sess.id);
                                setAttendanceDialogOpen(true);
                              }}
                              className="gap-1.5 text-xs h-8"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              حضور و غیاب / تکالیف
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
      ) : (
        /* Classes Grid View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-6 rounded-2xl border">
            <div>
              <h1 className="text-2xl font-bold">کلاس‌های کنکور من</h1>
              <p className="text-xs text-muted-foreground mt-1">
                برای ثبت حضور و غیاب، بررسی تکالیف یا صدور بارکد، کلاس خود را
                انتخاب فرمایید.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : classes.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground text-sm">
              شما در حال حاضر مدرس هیچ کلاسی نیستید. لطفاً با مدیر آموزشگاه هماهنگ
              فرمایید.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <Card
                  key={cls.id}
                  className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
                  onClick={() => handleOpenClass(cls.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {cls.name}
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                        {cls.id}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {cls.schedule}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg">
                      <span>دانش‌آموزان: {cls.studentsCount} نفر</span>
                      <span>جلسات: {cls.sessionsCount} جلسه</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs p-0 h-auto text-primary gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenClass(cls.id);
                        }}
                      >
                        مشاهده جلسات
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalClass({
                            id: cls.id,
                            name: cls.name,
                            qrToken: cls.qrToken,
                          });
                          setQrModalOpen(true);
                        }}
                      >
                        <QrCode className="w-3 h-3" />
                        بارکد
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Session Dialog */}
      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ثبت جلسه جدید</DialogTitle>
            <DialogDescription>
              نام جلسه را وارد فرمایید (مثال: جلسه ۴، یا جلسه فوق‌العاده).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="space-y-1.5">
              <Label>نام جلسه</Label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="جلسه ۴"
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewSessionOpen(false)}
                disabled={submittingSession}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={submittingSession}>
                {submittingSession ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "ایجاد جلسه و ورود به لیست"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <SessionAttendanceDialog
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        sessionId={activeSessionId}
        onSuccess={() => {
          if (activeClassId) loadClassDetail(activeClassId);
        }}
      />

      {/* QR Modal */}
      {qrModalClass && (
        <QrModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          classId={qrModalClass.id}
          className={qrModalClass.name}
          qrToken={qrModalClass.qrToken}
        />
      )}
    </div>
  );
}
