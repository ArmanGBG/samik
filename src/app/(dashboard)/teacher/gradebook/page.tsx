"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, BookOpen, ArrowLeft, DoorClosed } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface ClassroomSlot {
  classRoom: { id: string; name: string; gradeLevel: string };
  subject: { id: string; title: string };
}

export default function TeacherGradebookIndexPage() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<ClassroomSlot[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/v1/deputy/timetable");
        const d = await r.json();
        if (d.ok) {
          // Deduplicate by classroom (a teacher may teach multiple subjects in one classroom)
          const seen = new Set<string>();
          const unique: ClassroomSlot[] = [];
          for (const s of d.slots) {
            if (!seen.has(s.classRoom.id)) {
              seen.add(s.classRoom.id);
              unique.push(s);
            }
          }
          setSlots(unique);
        }
      } catch {
        toast.error("خطا در دریافت برنامه.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  // Group by classroom
  const classrooms = slots.reduce<Record<string, { info: ClassroomSlot["classRoom"]; subjects: string[] }>>(
    (acc, s) => {
      const key = s.classRoom.id;
      if (!acc[key]) acc[key] = { info: s.classRoom, subjects: [] };
      if (!acc[key].subjects.includes(s.subject.title)) {
        acc[key].subjects.push(s.subject.title);
      }
      return acc;
    },
    {}
  );

  const classroomList = Object.values(classrooms);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="دفتر نمره"
        subtitle="یکی از کلاس‌های خود را برای مشاهده دفتر نمره انتخاب کنید."
        icon={BookOpen}
      />

      {classroomList.length === 0 ? (
        <Card>
          <CardContent className="py-0">
            <EmptyState
              icon={DoorClosed}
              title="هنوز کلاسی به شما اختصاص نیافته است."
              description="به‌محض اختصاص کلاس، دفتر نمره آن در اینجا نمایش داده می‌شود."
            />
          </CardContent>
        </Card>
      ) : (
        <ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classroomList.map(({ info, subjects }, i) => (
              <Link
                key={info.id}
                href={`/teacher/gradebook/${info.id}`}
                className="block h-full"
              >
                <Card
                  className={cn(
                    "kpi-card stagger-item h-full hover:border-navy/40 cursor-pointer"
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {info.gradeLevel}
                        </div>
                        <div className="font-semibold text-base text-navy truncate">
                          {info.name}
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {subjects.map((subj) => (
                        <Badge
                          key={subj}
                          variant="outline"
                          className="text-[10px] bg-emerald/5 text-emerald border-emerald/20"
                        >
                          {subj}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
