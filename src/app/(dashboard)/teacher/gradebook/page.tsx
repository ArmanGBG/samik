"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, BookOpen, ArrowLeft, DoorClosed } from "lucide-react";

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          دفتر نمره
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          یکی از کلاس‌های خود را برای مشاهده دفتر نمره انتخاب کنید.
        </p>
      </div>

      {Object.values(classrooms).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DoorClosed className="h-10 w-10 mx-auto mb-2 opacity-30" />
            هنوز کلاسی به شما اختصاص نیافته است.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(classrooms).map(({ info, subjects }) => (
            <Link key={info.id} href={`/teacher/gradebook/${info.id}`}>
              <Card className="hover:border-navy hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{info.gradeLevel} {info.name}</span>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {subjects.map((subj) => (
                      <Badge key={subj} variant="outline" className="text-xs">
                        {subj}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
