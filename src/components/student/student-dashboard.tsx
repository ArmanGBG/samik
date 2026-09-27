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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  CalendarX,
  Clock,
  Award,
  History,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  PRESENT: { label: "حاضر", tint: "bg-emerald/10 text-emerald" },
  ABSENT: { label: "غایب", tint: "bg-destructive/10 text-destructive" },
  LATE: { label: "تاخیر", tint: "bg-warning/10 text-warning" },
  EXCUSED: { label: "موجه", tint: "bg-info/10 text-info" },
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
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
            هیچ عضویت تحصیلی برای شما یافت نشد.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            {activeEnrollmentInfo?.studentName ?? "پروفایل دانش‌آموز"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مشاهده روند پیشرفت تحصیلی و سوابق حضور و غیاب
          </p>
        </div>
        {/* Year/School filter */}
        <div className="w-full sm:w-72">
          <Select value={activeEnrollment} onValueChange={setActiveEnrollment}>
            <SelectTrigger>
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
        </div>
      </div>

      {/* Active enrollment info */}
      {data && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <Badge variant="outline" className="bg-navy/5 text-navy border-navy/20">
            {data.enrollment.schoolName}
          </Badge>
          <Badge variant="outline" className="bg-emerald/5 text-emerald border-emerald/20">
            {data.enrollment.classRoomName}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            سال {data.enrollment.academicYear}
          </Badge>
        </div>
      )}

      {/* Top stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="کل جلسات"
            value={data.stats.totalSessions}
            icon={<CalendarX className="h-4 w-4" />}
            tint="bg-navy/5 text-navy border-navy/20"
          />
          <StatCard
            label="غیبت"
            value={data.stats.absences}
            icon={<CalendarX className="h-4 w-4" />}
            tint="bg-destructive/5 text-destructive border-destructive/20"
          />
          <StatCard
            label="امتیاز مثبت"
            value={data.stats.positivePoints}
            icon={<ThumbsUp className="h-4 w-4" />}
            tint="bg-emerald/5 text-emerald border-emerald/20"
          />
          <StatCard
            label="امتیاز منفی"
            value={data.stats.negativePoints}
            icon={<ThumbsDown className="h-4 w-4" />}
            tint="bg-warning/5 text-warning border-warning/20"
          />
        </div>
      )}

      {/* Grades chart */}
      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-navy flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              روند پیشرفت تحصیلی
            </CardTitle>
            <CardDescription>
              نمرات عددی در طول زمان
              {chartData.length === 0 && " — هنوز نمره‌ای ثبت نشده است."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  هنوز نمره عددی ثبت نشده است.
                </div>
              </div>
            ) : (
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
                    <ReferenceLine y={10} stroke="var(--warning)" strokeDasharray="3 3" label={{ value: "حداقل قبولی", position: "insideTopRight", fontSize: 10, fill: "var(--warning)" }} />
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Two-column: behavioral feed + attendance */}
      {data && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Behavioral feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <Award className="h-4 w-4" />
                امتیازات انضباطی
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.behavioralPoints.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  هنوز امتیازی ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {data.behavioralPoints.map((b) => (
                    <div
                      key={b.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-sm",
                        b.pointType === "POSITIVE"
                          ? "bg-emerald/5 border-emerald/20"
                          : "bg-destructive/5 border-destructive/20"
                      )}
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
                        <span className="text-xs text-muted-foreground mr-2">
                          • {b.teacherName}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(b.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent attendance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-navy flex items-center gap-2">
                <History className="h-4 w-4" />
                سوابق حضور و غیاب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentAttendance.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  هنوز ثبت حضور و غیابی وجود ندارد.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {data.recentAttendance.map((a, i) => {
                    const info = ATTENDANCE_LABELS[a.status] ?? { label: a.status, tint: "bg-muted" };
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {new Date(a.date).toLocaleDateString("fa-IR")}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", info.tint)}>
                          {info.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", tint)}>
      <div className="flex items-center gap-2 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString("fa-IR")}</div>
    </div>
  );
}
