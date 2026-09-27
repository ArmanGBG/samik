"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  CalendarX,
  Award,
  History,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCardGrid } from "@/components/shared/kpi-card";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { EmptyState } from "@/components/shared/empty-state";

interface Enrollment {
  id: string;
  schoolName: string;
  classRoomName: string;
  academicYear: string;
  status: string;
  studentName: string;
  studentFirstName: string;
  studentLastName: string;
}

interface DashboardData {
  ok: boolean;
  enrollment: {
    id: string;
    schoolName: string;
    classRoomName: string;
    academicYear: string;
    status: string;
    studentName: string;
  };
  stats: {
    absences: number;
    lates: number;
    positivePoints: number;
    negativePoints: number;
    totalSessions: number;
  };
  gradesTimeline: Array<{
    date: string;
    score: number;
    assessmentTitle: string;
  }>;
  behavioralPoints: Array<{
    id: string;
    pointType: "POSITIVE" | "NEGATIVE";
    reasonTag: string | null;
    teacherName: string;
    createdAt: string;
  }>;
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  recentAttendance: Array<{
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  }>;
}

const ATTENDANCE_LABELS: Record<string, { label: string; tint: string }> = {
  PRESENT: { label: "حاضر", tint: "bg-emerald/10 text-emerald border-emerald/20" },
  ABSENT: { label: "غایب", tint: "bg-destructive/10 text-destructive border-destructive/20" },
  LATE: { label: "تاخیر", tint: "bg-warning/10 text-warning border-warning/20" },
  EXCUSED: { label: "موجه", tint: "bg-info/10 text-info border-info/20" },
};

export function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activeEnrollment, setActiveEnrollment] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load enrollments first
  useEffect(() => {
    async function loadEnrollments() {
      try {
        const r = await fetch("/api/v1/student/enrollments");
        const d = await r.json();
        if (d.ok) {
          setEnrollments(d.enrollments);
          if (d.enrollments.length > 0) {
            setActiveEnrollment(d.enrollments[0].id);
          }
        }
      } catch {
        toast.error("خطا در دریافت عضویت‌ها.");
      }
    }
    loadEnrollments();
  }, []);

  // Load dashboard data when enrollment changes
  const loadData = useCallback(async () => {
    if (!activeEnrollment) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/student/dashboard?enrollmentId=${activeEnrollment}`);
      const d = await r.json();
      if (d.ok) setData(d);
      else toast.error(d.error ?? "خطا در دریافت داده‌ها.");
    } finally {
      setLoading(false);
    }
  }, [activeEnrollment]);

  useEffect(() => {
    if (activeEnrollment) loadData();
  }, [activeEnrollment, loadData]);

  // Prepare chart data — handle edge cases per Section 7:
  //   - Missing numeric grades: filtered out (no point on the chart)
  //   - Descriptive-only assessments: not included (no numeric value)
  //   - is_absent grades: excluded (per the directive — don't count as zero)
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.gradesTimeline.map((g) => ({
      date: new Date(g.date).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
      score: g.score,
      title: g.assessmentTitle,
    }));
  }, [data]);

  const activeEnrollmentInfo = enrollments.find((e) => e.id === activeEnrollment);

  if (loading && !data) {
    return (
      <div className="max-w-5xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-0">
            <EmptyState
              icon={GraduationCap}
              title="هیچ عضویت تحصیلی برای شما یافت نشد."
              description="به‌محض ثبت‌نام در مدرسه، اطلاعات تحصیلی شما در این صفحه نمایش داده می‌شود."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enrollment selector — compact, in actions area
  const enrollmentSelect = (
    <Select value={activeEnrollment} onValueChange={setActiveEnrollment}>
      <SelectTrigger className="h-9 w-56 sm:w-72 text-xs">
        <SelectValue placeholder="انتخاب سال تحصیلی..." />
      </SelectTrigger>
      <SelectContent>
        {enrollments.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.studentName} — {e.schoolName} ({e.academicYear})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={activeEnrollmentInfo?.studentName ?? "پروفایل دانش‌آموز"}
        subtitle="مشاهده روند پیشرفت تحصیلی"
        icon={GraduationCap}
        actions={enrollmentSelect}
      />

      {/* Active enrollment info — compact badges */}
      {data && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <Badge variant="outline" className="bg-navy/5 text-navy border-navy/20 text-xs">
            {data.enrollment.schoolName}
          </Badge>
          <Badge variant="outline" className="bg-emerald/5 text-emerald border-emerald/20 text-xs">
            {data.enrollment.classRoomName}
          </Badge>
          <Badge variant="outline" className="bg-muted text-muted-foreground text-xs tabular-nums">
            سال {data.enrollment.academicYear}
          </Badge>
        </div>
      )}

      {/* Top stats — KpiCardGrid */}
      {data && (
        <KpiCardGrid
          cards={[
            {
              label: "کل جلسات",
              value: data.stats.totalSessions,
              icon: CalendarX,
              tint: "navy",
            },
            {
              label: "غیبت",
              value: data.stats.absences,
              icon: CalendarX,
              tint: "destructive",
            },
            {
              label: "امتیاز مثبت",
              value: data.stats.positivePoints,
              icon: ThumbsUp,
              tint: "emerald",
            },
            {
              label: "امتیاز منفی",
              value: data.stats.negativePoints,
              icon: ThumbsDown,
              tint: "warning",
            },
          ]}
        />
      )}

      {/* Grades chart */}
      {data && (
        <ScrollReveal delay={60}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                روند پیشرفت تحصیلی
              </CardTitle>
              <CardDescription>
                نمرات عددی در طول زمان{chartData.length === 0 && " — هنوز نمره‌ای ثبت نشده است."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="هنوز نمره عددی ثبت نشده است."
                  description="به‌محض ثبت نمره عددی توسط معلمان، نمودار روند پیشرفت در اینجا نمایش داده می‌شود."
                />
              ) : (
                <>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fontFamily: "Vazirmatn" }}
                          stroke="var(--muted-foreground)"
                        />
                        <YAxis
                          domain={[0, 20]}
                          ticks={[0, 5, 10, 15, 20]}
                          tick={{ fontSize: 11, fontFamily: "Vazirmatn" }}
                          stroke="var(--muted-foreground)"
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontFamily: "Vazirmatn",
                            fontSize: "12px",
                          }}
                          labelStyle={{ fontFamily: "Vazirmatn" }}
                          formatter={(value: number) => [value.toLocaleString("fa-IR"), "نمره"]}
                          labelFormatter={(label) => `تاریخ: ${label}`}
                        />
                        <ReferenceLine
                          y={10}
                          stroke="var(--warning)"
                          strokeDasharray="3 3"
                          label={{ value: "حداقل قبولی", position: "insideTopRight", fontSize: 10, fill: "var(--warning)" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="var(--navy)"
                          strokeWidth={2.5}
                          dot={{ fill: "var(--emerald)", r: 4 }}
                          activeDot={{ r: 6, fill: "var(--navy)" }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Accessibility: data table fallback — always visible */}
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-navy transition list-none flex items-center gap-1">
                      <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                      نمایش جدول نمرات (برای دسترس‌پذیری)
                    </summary>
                    <div className="mt-2 rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="text-xs h-8">تاریخ</TableHead>
                            <TableHead className="text-xs h-8">ارزیابی</TableHead>
                            <TableHead className="text-xs h-8 text-left">نمره</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.map((row, i) => (
                            <TableRow key={i} className="data-table-row">
                              <TableCell className="text-xs tabular-nums py-1.5">{row.date}</TableCell>
                              <TableCell className="text-xs py-1.5">{row.title}</TableCell>
                              <TableCell
                                className={cn(
                                  "text-xs font-bold tabular-nums py-1.5",
                                  row.score >= 15 ? "text-emerald" : row.score >= 10 ? "text-warning" : "text-destructive"
                                )}
                              >
                                {row.score.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </details>
                </>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Two-column: behavioral feed + attendance */}
      {data && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Behavioral feed */}
          <ScrollReveal delay={120}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-navy flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  امتیازات انضباطی
                  <Badge variant="outline" className="text-[10px] ml-1 tabular-nums bg-muted/50">
                    {data.behavioralPoints.length.toLocaleString("fa-IR")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.behavioralPoints.length === 0 ? (
                  <EmptyState
                    icon={ThumbsUp}
                    title="هنوز امتیازی ثبت نشده است."
                    description="امتیازات مثبت و منفی انضباطی در اینجا نمایش داده می‌شوند."
                  />
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {data.behavioralPoints.map((b, i) => (
                      <div
                        key={b.id}
                        className={cn(
                          "stagger-item flex items-center gap-2 p-2 rounded-lg border text-xs",
                          b.pointType === "POSITIVE"
                            ? "bg-emerald/5 border-emerald/20"
                            : "bg-destructive/5 border-destructive/20"
                        )}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        {b.pointType === "POSITIVE" ? (
                          <ThumbsUp className="h-3.5 w-3.5 text-emerald shrink-0" />
                        ) : (
                          <ThumbsDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">
                            {b.reasonTag ?? (b.pointType === "POSITIVE" ? "امتیاز مثبت" : "امتیاز منفی")}
                          </span>
                          <span className="text-[10px] text-muted-foreground mr-2">
                            • {b.teacherName}
                          </span>
                        </div>
                        <span dir="ltr" className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                          {new Date(b.createdAt).toLocaleDateString("fa-IR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Recent attendance */}
          <ScrollReveal delay={180}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-navy flex items-center gap-2">
                  <History className="h-4 w-4" />
                  سوابق حضور و غیاب
                  <Badge variant="outline" className="text-[10px] ml-1 tabular-nums bg-muted/50">
                    {data.recentAttendance.length.toLocaleString("fa-IR")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentAttendance.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="هنوز ثبت حضور و غیابی وجود ندارد."
                    description="سوابق حضور و غیاب اخیر شما در اینجا نمایش داده می‌شوند."
                  />
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {data.recentAttendance.map((a, i) => {
                      const info = ATTENDANCE_LABELS[a.status] ?? { label: a.status, tint: "bg-muted text-muted-foreground" };
                      return (
                        <div
                          key={i}
                          className="stagger-item flex items-center gap-2 p-2 rounded-lg border text-xs bg-card"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <span dir="ltr" className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                            {new Date(a.date).toLocaleDateString("fa-IR")}
                          </span>
                          <div className="flex-1" />
                          <Badge variant="outline" className={cn("text-[10px]", info.tint)}>
                            {info.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      )}
    </div>
  );
}
