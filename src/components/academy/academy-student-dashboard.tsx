"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Sparkles,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck2,
  FileX2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BookOpen,
  PlusCircle,
  Building2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { JoinClassDialog } from "./join-class-dialog";

interface SessionInfo {
  id: string;
  sessionNum: number;
  name: string;
  date: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "NOT_RECORDED";
  assignmentDone: boolean;
}

interface StudentClass {
  enrollmentId: string;
  classId: string;
  name: string;
  schedule: string;
  academyName: string;
  teacherName: string;
  joinedAtSessionNum: number;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  missingAssignments: number;
  attendanceRate: number;
  sessions: SessionInfo[];
}

export function AcademyStudentDashboard() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const fetchClasses = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/v1/academy/student/classes");
      const data = await res.json();
      if (data.ok) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.error || "خطا در دریافت لیست کلاس‌ها.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه هنگام ارتباط با سرور.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const totalClasses = classes.length;
  const totalSessionsAttended = classes.reduce(
    (sum, c) => sum + (c.presentCount ?? 0) + (c.lateCount ?? 0),
    0
  );
  const totalMissingAssignments = classes.reduce(
    (sum, c) => sum + (c.missingAssignments ?? 0),
    0
  );
  const overallAttendanceRate =
    totalClasses > 0
      ? Math.round(
          classes.reduce(
            (sum, c) =>
              sum + (Number.isFinite(c.attendanceRate) ? c.attendanceRate : 0),
            0
          ) / totalClasses
        )
      : 100;

  const toggleExpand = (classId: string) => {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
  };

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat("fa-IR", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              کلاس‌های آموزشگاه کنکور
            </h1>
            <Badge
              variant="outline"
              className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-xs px-2.5 py-0.5"
            >
              دانش‌آموز کنکور
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            وضعیت حضور و غیاب، انجام تکالیف و جلسات کلاس‌های کنکوری شما
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClasses(true)}
            disabled={refreshing}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            بروزرسانی
          </Button>

          <Button
            size="sm"
            onClick={() => setJoinModalOpen(true)}
            className="text-xs gap-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            عضویت در کلاس جدید
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              کلاس‌های من
            </CardTitle>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{totalClasses}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              کلاس فعال کنکور
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              میانگین حضور
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono">
              %{overallAttendanceRate}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              در کل جلسات برگزار شده
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              جلسات حاضر
            </CardTitle>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{totalSessionsAttended}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              جلسه شرکت نموده
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              تکالیف ناقص
            </CardTitle>
            <div
              className={`p-2 rounded-lg ${
                totalMissingAssignments > 0
                  ? "bg-rose-500/10 text-rose-600"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {totalMissingAssignments > 0 ? (
                <FileX2 className="w-4 h-4" />
              ) : (
                <FileCheck2 className="w-4 h-4" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-2xl font-bold ${
                totalMissingAssignments > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {totalMissingAssignments}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalMissingAssignments > 0
                ? "تکلیف نیاز به پیگیری"
                : "تمام تکالیف تحویل داده شده"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-purple-600" />
          لیست کلاس‌های فعال شما
        </h2>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3 bg-muted/20 rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            در حال بارگذاری کلاس‌های کنکور...
          </div>
        ) : classes.length === 0 ? (
          <Card className="border-dashed bg-muted/10">
            <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-semibold">
                  هنوز در هیچ کلاس کنکوری عضو نشده‌اید
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  با استفاده از کد ۶ رقمی کلاس (مانند CLS-XXXXXX) یا اسکن بارکد که توسط
                  استاد یا آموزشگاه در اختیارتان قرار گرفته، در کلاس عضو شوید.
                </p>
              </div>
              <Button
                onClick={() => setJoinModalOpen(true)}
                className="gap-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <PlusCircle className="w-4 h-4" />
                عضویت با کد کلاس
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => {
              const isExpanded = expandedClassId === cls.classId;

              return (
                <Card
                  key={cls.classId}
                  className="overflow-hidden transition-all duration-200 hover:border-purple-200 dark:hover:border-purple-800"
                >
                  <CardHeader className="p-4 md:p-5 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base md:text-lg">
                            {cls.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[11px] gap-1 font-normal"
                          >
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {cls.academyName}
                          </Badge>
                          {cls.joinedAtSessionNum > 1 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                            >
                              ورود از جلسه {cls.joinedAtSessionNum}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <div>
                            استاد:{" "}
                            <span className="font-medium text-foreground">
                              {cls.teacherName}
                            </span>
                          </div>
                          <div>
                            زمان برگزاری:{" "}
                            <span className="font-medium text-foreground">
                              {cls.schedule}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">
                            درصد حضور
                          </div>
                          <div className="text-lg font-bold font-mono text-purple-600">
                            %{cls.attendanceRate}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(cls.classId)}
                          className="text-xs gap-1 h-9"
                        >
                          {isExpanded ? (
                            <>
                              بستن جلسات
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              ریز جلسات ({cls.sessions.length})
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar for Attendance */}
                    <div className="pt-3">
                      <Progress value={cls.attendanceRate} className="h-1.5" />
                    </div>
                  </CardHeader>

                  {/* Summary row */}
                  <div className="px-4 py-2.5 bg-muted/30 border-t flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        حاضر: {cls.presentCount}
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                        تأخیر: {cls.lateCount}
                      </span>
                      <span className="flex items-center gap-1 text-rose-600">
                        <XCircle className="w-3.5 h-3.5" />
                        غایب: {cls.absentCount}
                      </span>
                    </div>

                    <div>
                      {cls.missingAssignments > 0 ? (
                        <span className="text-rose-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {cls.missingAssignments} تکلیف انجام‌نشده
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تمام تکالیف تحویل داده شده
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Session Details */}
                  {isExpanded && (
                    <CardContent className="p-4 pt-3 border-t space-y-2 bg-background">
                      <div className="text-xs font-semibold text-muted-foreground pb-1">
                        تاریخچه جلسات و حضور و غیاب شما:
                      </div>

                      {cls.sessions.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-4 text-center bg-muted/20 rounded-lg">
                          هنوز جلسه‌ای برای این کلاس ثبت نشده است.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {cls.sessions.map((s) => (
                            <div
                              key={s.id}
                              className="p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[11px]"
                                >
                                  جلسه {s.sessionNum}
                                </Badge>
                                <span className="font-medium">{s.name}</span>
                                <span className="text-muted-foreground text-[11px]">
                                  ({formatDate(s.date)})
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Attendance Status */}
                                {s.status === "PRESENT" && (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 gap-1 text-[11px]">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    حاضر
                                  </Badge>
                                )}
                                {s.status === "LATE" && (
                                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1 text-[11px]">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    با تأخیر
                                  </Badge>
                                )}
                                {s.status === "ABSENT" && (
                                  <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 gap-1 text-[11px]">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    غایب
                                  </Badge>
                                )}
                                {s.status === "NOT_RECORDED" && (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground border-muted-foreground/30 gap-1 text-[11px]"
                                  >
                                    <Clock className="w-3 h-3" />
                                    ثبت نشده
                                  </Badge>
                                )}

                                {/* Assignment Status */}
                                {s.assignmentDone ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-200 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 gap-1 text-[11px]"
                                  >
                                    <FileCheck2 className="w-3 h-3" />
                                    تکلیف انجام شد
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-rose-200 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 gap-1 text-[11px]"
                                  >
                                    <FileX2 className="w-3 h-3" />
                                    تکلیف انجام نشد
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Class Dialog */}
      <JoinClassDialog
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onSuccess={() => fetchClasses(true)}
      />
    </div>
  );
}
