"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ClipboardCheck,
  PlayCircle,
  Clock,
  DoorClosed,
  Calendar,
  BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { dayToPersian, currentSamikDayOfWeek } from "@/lib/timetable/days";
import { hhmmToPersian } from "@/lib/timetable/time-utils";
import { cn } from "@/lib/utils";

interface SlotItem {
  id: string;
  dayOfWeek: number;
  weekType: string;
  classRoom: { id: string; name: string; gradeLevel: string };
  subject: { id: string; title: string };
  teacher: { id: string; firstName: string; lastName: string };
  bellSchedule: { id: string; title: string; startTime: string; endTime: string };
}

export default function TeacherAttendanceIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  const todaySamikDay = useMemo(() => currentSamikDayOfWeek(new Date()), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [meRes, ttRes] = await Promise.all([
          fetch("/api/v1/me"),
          fetch("/api/v1/deputy/timetable"),
        ]);
        const meData = await meRes.json();
        const ttData = await ttRes.json();

        if (meData.ok) {
          setCurrentTeacherId(meData.user.id);
        }

        if (ttData.ok) {
          setSlots(ttData.slots);
        } else {
          toast.error("خطا در دریافت برنامه هفتگی.");
        }
      } catch (err) {
        console.error("[LOAD_TEACHER_ATTENDANCE_PAGE_ERROR]", err);
        toast.error("خطا در برقراری ارتباط با سرور.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter slots for this teacher (or all school slots if teacher ID match fallback)
  const teacherSlots = useMemo(() => {
    if (!currentTeacherId) return slots;
    const filtered = slots.filter((s) => s.teacher.id === currentTeacherId);
    return filtered.length > 0 ? filtered : slots;
  }, [slots, currentTeacherId]);

  // Group by day of week
  const slotsByDay = useMemo(() => {
    const map = new Map<number, SlotItem[]>();
    for (let day = 0; day <= 6; day++) map.set(day, []);
    for (const s of teacherSlots) {
      const arr = map.get(s.dayOfWeek) ?? [];
      arr.push(s);
      map.set(s.dayOfWeek, arr);
    }
    return map;
  }, [teacherSlots]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="حضور و غیاب کلاس‌ها"
        subtitle="کلاس و زنگ مورد نظر را جهت ثبت حضور و غیاب و امتیازات انضباطی انتخاب کنید."
        icon={ClipboardCheck}
      />

      {teacherSlots.length === 0 ? (
        <Card>
          <CardContent className="py-0">
            <EmptyState
              icon={DoorClosed}
              title="هیچ کلاسی در برنامه هفتگی شما یافت نشد"
              description="پس از ثبت برنامه هفتگی توسط معاون، کلاس‌های شما در این بخش نمایش داده می‌شوند."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(slotsByDay.entries())
            .filter(([_, daySlots]) => daySlots.length > 0)
            .map(([day, daySlots], groupIdx) => {
              const isToday = day === todaySamikDay;
              return (
                <ScrollReveal key={day} delay={groupIdx * 40}>
                  <Card className={cn(isToday && "border-emerald/40 bg-emerald/[0.02]")}>
                    <CardHeader className="pb-3 border-b border-border">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-navy flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {dayToPersian(day)}
                          {isToday && (
                            <Badge className="bg-emerald text-white text-[11px] font-normal">
                              امروز
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="tabular-nums">
                          {daySlots.length.toLocaleString("fa-IR")} زنگ درسی
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-border">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors gap-3 flex-wrap sm:flex-nowrap"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-navy/5 text-navy flex items-center justify-center shrink-0">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm truncate text-foreground">
                                {slot.subject.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <DoorClosed className="h-3 w-3" />
                                  {slot.classRoom.gradeLevel} {slot.classRoom.name}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {slot.bellSchedule.title} (
                                  <span dir="ltr" className="font-mono tabular-nums">
                                    {hhmmToPersian(slot.bellSchedule.startTime)} تا{" "}
                                    {hhmmToPersian(slot.bellSchedule.endTime)}
                                  </span>
                                  )
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <Button
                              size="sm"
                              className="bg-emerald hover:bg-emerald-600 text-white gap-1.5 cursor-pointer text-xs h-9 px-4 font-medium"
                              onClick={() => router.push(`/teacher/attendance/${slot.id}`)}
                            >
                              <PlayCircle className="h-4 w-4" />
                              ورود به حضور و غیاب
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
        </div>
      )}
    </div>
  );
}
