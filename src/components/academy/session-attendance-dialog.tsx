"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  User,
  Sparkles,
  Save,
} from "lucide-react";
import { toPersianDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface StudentAttendanceItem {
  studentUserId: string;
  fullName: string;
  phoneNumber: string;
  nationalCode: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  assignmentDone: boolean;
}

interface SessionAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onSuccess?: () => void;
}

export function SessionAttendanceDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
}: SessionAttendanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    id: string;
    sessionNum: number;
    name: string;
    date: string;
    className: string;
    teacherName: string;
  } | null>(null);
  const [roster, setRoster] = useState<StudentAttendanceItem[]>([]);
  const [query, setQuery] = useState("");

  const loadSheet = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/academy/attendance?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.ok) {
        setSessionInfo(data.session);
        setRoster(data.roster || []);
      } else {
        toast.error(data.error || "خطا در دریافت لیست حضور و غیاب.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && sessionId) {
      loadSheet();
    } else {
      setSessionInfo(null);
      setRoster([]);
      setQuery("");
    }
  }, [open, sessionId]);

  const setStudentStatus = (
    studentUserId: string,
    status: "PRESENT" | "ABSENT" | "LATE"
  ) => {
    setRoster((prev) =>
      prev.map((s) => (s.studentUserId === studentUserId ? { ...s, status } : s))
    );
  };

  const setStudentAssignment = (studentUserId: string, assignmentDone: boolean) => {
    setRoster((prev) =>
      prev.map((s) =>
        s.studentUserId === studentUserId ? { ...s, assignmentDone } : s
      )
    );
  };

  const handleAllPresent = () => {
    setRoster((prev) => prev.map((s) => ({ ...s, status: "PRESENT" })));
    toast.success("همه حاضر علامت خوردند.");
  };

  const handleAllAssignmentsDone = () => {
    setRoster((prev) => prev.map((s) => ({ ...s, assignmentDone: true })));
    toast.success("تکلیف همه ثبت شد.");
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/academy/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          records: roster.map((r) => ({
            studentUserId: r.studentUserId,
            status: r.status,
            assignmentDone: r.assignmentDone,
          })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "حضور و غیاب ذخیره شد.");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "خطا در ذخیره حضور و غیاب.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.phoneNumber.includes(q) ||
        s.nationalCode.includes(q)
    );
  }, [roster, query]);

  const presentCount = roster.filter((s) => s.status === "PRESENT").length;
  const lateCount = roster.filter((s) => s.status === "LATE").length;
  const absentCount = roster.filter((s) => s.status === "ABSENT").length;
  const assignmentDoneCount = roster.filter((s) => s.assignmentDone).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <span>{sessionInfo?.className || "حضور و غیاب کلاس"}</span>
                {sessionInfo && (
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {sessionInfo.name}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {sessionInfo && (
                  <>
                    مدرس: {sessionInfo.teacherName} • تاریخ برگزاری:{" "}
                    {toPersianDate(new Date(sessionInfo.date))}
                  </>
                )}
              </DialogDescription>
            </div>

            {/* Quick summary counters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                حاضر: {presentCount}
              </span>
              <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                تأخیر: {lateCount}
              </span>
              <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                غایب: {absentCount}
              </span>
              <span className="text-[11px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                تکلیف: {assignmentDoneCount} / {roster.length}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar: search + bulk actions */}
        <div className="p-4 bg-muted/30 border-b flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="جستجوی نام یا شماره..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAllPresent}
              className="text-xs h-8 gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              همه حاضر
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAllAssignmentsDone}
              className="text-xs h-8 gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              تکالیف همه کامل
            </Button>
          </div>
        </div>

        {/* Student Roster List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              {query
                ? "دانش‌آموزی با این مشخصات یافت نشد."
                : "هیچ دانش‌آموزی در این جلسه ثبت‌نام نکرده است."}
            </div>
          ) : (
            filtered.map((student) => {
              const isPresent = student.status === "PRESENT";
              const isLate = student.status === "LATE";
              const isAbsent = student.status === "ABSENT";

              return (
                <div
                  key={student.studentUserId}
                  className="p-3 bg-card border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {student.fullName.charAt(0) || <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{student.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {student.phoneNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                    {/* Assignment Switch */}
                    <div className="flex items-center gap-2 pl-3 border-l">
                      <Label
                        htmlFor={`assign-${student.studentUserId}`}
                        className="text-xs cursor-pointer text-muted-foreground select-none"
                      >
                        {student.assignmentDone ? "تکلیف شد" : "بدون تکلیف"}
                      </Label>
                      <Switch
                        id={`assign-${student.studentUserId}`}
                        checked={student.assignmentDone}
                        onCheckedChange={(checked) =>
                          setStudentAssignment(student.studentUserId, checked)
                        }
                      />
                    </div>

                    {/* 3-State Attendance Segmented Control */}
                    <div className="flex items-center bg-muted/60 p-1 rounded-lg border gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setStudentStatus(student.studentUserId, "PRESENT")
                        }
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                          isPresent
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        حاضر
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStudentStatus(student.studentUserId, "LATE")
                        }
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                          isLate
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        تأخیر
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStudentStatus(student.studentUserId, "ABSENT")
                        }
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                          isAbsent
                            ? "bg-rose-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        غایب
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={submitting || loading || roster.length === 0}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-1" />
                ثبت نهایی حضور و غیاب
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
