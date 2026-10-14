"use client";

import React, { useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DAYS_OF_WEEK } from "@/lib/timetable/days";
import { hhmmToPersian } from "@/lib/timetable/time-utils";
import { toPersianDateLong } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Clock,
  BookOpen,
  DoorOpen,
  Phone,
  CreditCard,
  Sparkles,
  Printer,
  CalendarDays,
  X,
} from "lucide-react";

export interface TeacherSlotData {
  id: string;
  classRoom: { id: string; name: string; gradeLevel: string };
  subject: { id: string; title: string };
  teacher?: { id: string; firstName: string; lastName: string };
  bellSchedule: { id: string; title: string; startTime: string; endTime: string };
  dayOfWeek: number;
  weekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS";
}

export interface TeacherInfo {
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  nationalCode?: string;
}

export interface BellInfo {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface TeacherScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherInfo | null;
  slots: TeacherSlotData[];
  bells?: BellInfo[];
}

const WEEK_TYPE_BADGE: Record<
  "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS" | "SINGLE_SESSION",
  { label: string; className: string }
> = {
  ALL_WEEKS: {
    label: "همه هفته‌ها",
    className: "bg-emerald/15 text-emerald border-emerald/30",
  },
  ODD_WEEKS: {
    label: "هفته‌های فرد",
    className: "bg-info/15 text-info border-info/30",
  },
  EVEN_WEEKS: {
    label: "هفته‌های زوج",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  SINGLE_SESSION: {
    label: "تک‌جلسه",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

const WEEK_TYPES_LEGEND = [
  { label: "همه هفته‌ها", dotClass: "bg-emerald" },
  { label: "هفته‌های فرد", dotClass: "bg-info" },
  { label: "هفته‌های زوج", dotClass: "bg-warning" },
];

function printTeacherScheduleDocument(params: {
  fullName: string;
  phoneNumber?: string;
  nationalCode?: string;
  stats: { totalSlots: number; uniqueClasses: number; uniqueSubjects: number };
  schoolWeekDays: { value: number; persianName: string; englishName: string }[];
  resolvedBells: BellInfo[];
  matrixGrid: Map<number, Map<string, TeacherSlotData[]>>;
}) {
  const {
    fullName,
    phoneNumber,
    nationalCode,
    stats,
    schoolWeekDays,
    resolvedBells,
    matrixGrid,
  } = params;

  const dateStr = toPersianDateLong(new Date());

  const theadHtml = `
    <thead>
      <tr>
        <th class="bell-col">زنگ و ساعت تدریس</th>
        ${schoolWeekDays
          .map(
            (d) => `
          <th>
            <div class="day-fa">${d.persianName}</div>
            <div class="day-en">${d.englishName}</div>
          </th>
        `
          )
          .join("")}
      </tr>
    </thead>
  `;

  let tbodyHtml = `<tbody>`;
  resolvedBells.forEach((bell, idx) => {
    const bgClass = idx % 2 === 0 ? "even-row" : "odd-row";
    tbodyHtml += `<tr class="${bgClass}">`;
    tbodyHtml += `
      <td class="bell-col">
        <div class="bell-title">${bell.title}</div>
        <div class="bell-time">${hhmmToPersian(bell.startTime)} – ${hhmmToPersian(bell.endTime)}</div>
      </td>
    `;

    schoolWeekDays.forEach((day) => {
      const cellSlots = matrixGrid.get(day.value)?.get(bell.id) ?? [];
      tbodyHtml += `<td>`;
      if (cellSlots.length === 0) {
        tbodyHtml += `<div class="empty-cell">—</div>`;
      } else {
        cellSlots.forEach((slot) => {
          const weekTypeClass =
            slot.weekType === "ODD_WEEKS"
              ? "odd"
              : slot.weekType === "EVEN_WEEKS"
              ? "even"
              : "all";
          const weekTypeLabel =
            slot.weekType === "ODD_WEEKS"
              ? "هفته‌های فرد"
              : slot.weekType === "EVEN_WEEKS"
              ? "هفته‌های زوج"
              : "همه هفته‌ها";

          tbodyHtml += `
            <div class="slot-card ${weekTypeClass}">
              <div class="slot-subject">${slot.subject?.title || "درس"}</div>
              <div class="slot-classroom">کلاس ${slot.classRoom?.name || "—"} (پایه ${slot.classRoom?.gradeLevel || "—"})</div>
              ${
                slot.weekType !== "ALL_WEEKS"
                  ? `<div class="slot-badge ${weekTypeClass}">${weekTypeLabel}</div>`
                  : ""
              }
            </div>
          `;
        });
      }
      tbodyHtml += `</td>`;
    });

    tbodyHtml += `</tr>`;
  });
  tbodyHtml += `</tbody>`;

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>برنامه هفتگی تدریس: ${fullName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      background: #ffffff;
      color: #0f172a;
      padding: 4px;
      font-size: 9.5pt;
      line-height: 1.35;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .print-header-right h1 {
      font-size: 13.5pt;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0;
    }
    .print-header-right h2 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 3px;
    }
    .print-header-left {
      text-align: left;
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.5;
    }
    .stats-strip {
      display: flex;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 12px;
      margin-bottom: 10px;
      font-size: 9pt;
      color: #334155;
    }
    .stats-strip strong {
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      vertical-align: top;
      text-align: right;
    }
    th {
      background-color: #f1f5f9;
      color: #1e3a8a;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
      padding: 5px 4px;
    }
    .day-fa {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e3a8a;
    }
    .day-en {
      font-size: 7pt;
      color: #64748b;
      font-weight: normal;
    }
    th.bell-col, td.bell-col {
      width: 120px;
      background-color: #f8fafc;
      vertical-align: middle;
      text-align: right;
      padding: 5px 8px;
    }
    .bell-title {
      font-weight: 700;
      font-size: 8.5pt;
      color: #1e3a8a;
    }
    .bell-time {
      direction: ltr;
      text-align: right;
      font-size: 7.5pt;
      color: #475569;
      font-family: monospace;
      margin-top: 2px;
    }
    .even-row {
      background-color: #ffffff;
    }
    .odd-row {
      background-color: #fafbfc;
    }
    .slot-card {
      padding: 4px 6px;
      border-radius: 4px;
      margin-bottom: 3px;
      border: 1px solid #86efac;
      background: #f0fdf4;
      color: #064e3b;
    }
    .slot-card.odd {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1e3a8a;
    }
    .slot-card.even {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #78350f;
    }
    .slot-subject {
      font-weight: 700;
      font-size: 8.5pt;
    }
    .slot-classroom {
      font-size: 7.5pt;
      color: #334155;
      margin-top: 1px;
    }
    .slot-badge {
      display: inline-block;
      font-size: 6.5pt;
      padding: 0 4px;
      border-radius: 3px;
      margin-top: 2px;
      border: 1px solid rgba(0,0,0,0.15);
    }
    .empty-cell {
      text-align: center;
      color: #cbd5e1;
      font-size: 11pt;
      line-height: 32px;
    }
    .print-footer {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 8pt;
      color: #475569;
    }
    .signatures {
      display: flex;
      gap: 60px;
      font-size: 8pt;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-header-right">
      <h1>سامانه هوشمند مدیریت مدارس سامیک</h1>
      <h2>برنامه هفتگی تدریس: ${fullName}</h2>
    </div>
    <div class="print-header-left">
      <div>تاریخ چاپ: ${dateStr}</div>
      ${phoneNumber ? `<div>شماره تماس: ${phoneNumber}</div>` : ""}
      ${nationalCode ? `<div>کد ملی: ${nationalCode}</div>` : ""}
    </div>
  </div>

  <div class="stats-strip">
    <div>مجموع جلسات: <strong>${stats.totalSlots.toLocaleString("fa-IR")} زنگ در هفته</strong></div>
    <div>•</div>
    <div>کلاس‌های درس: <strong>${stats.uniqueClasses.toLocaleString("fa-IR")} کلاس</strong></div>
    <div>•</div>
    <div>عناوین درسی: <strong>${stats.uniqueSubjects.toLocaleString("fa-IR")} عنوان</strong></div>
  </div>

  <table>
    ${theadHtml}
    ${tbodyHtml}
  </table>

  <div class="print-footer">
    <div class="signatures">
      <div>امضای دبیر محترم: ............................................</div>
      <div>امضا و مهر مدیر مدرسه: ............................................</div>
    </div>
    <div>سامیک © ۱۴۰۴ — سامانه مدیریت یکپارچه کلاس</div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  } else {
    console.error("Print popup blocked by browser.");
    alert("لطفاً مسدودکننده پاپ‌آپ (Popup Blocker) را برای این سایت غیرفعال کنید.");
  }
}

export function TeacherScheduleDialog({
  open,
  onOpenChange,
  teacher,
  slots,
  bells: propBells,
}: TeacherScheduleDialogProps) {
  // Filter slots belonging to this teacher
  const teacherSlots = useMemo(() => {
    if (!teacher) return [];
    const tId = teacher.userId || teacher.id;
    return slots.filter((s) => s.teacher?.id === tId);
  }, [teacher, slots]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalSlots = teacherSlots.length;
    const uniqueClasses = new Set(
      teacherSlots.map((s) => s.classRoom?.id).filter(Boolean)
    ).size;
    const uniqueSubjects = new Set(
      teacherSlots.map((s) => s.subject?.id).filter(Boolean)
    ).size;

    // Days present
    const activeDayIndices = new Set(teacherSlots.map((s) => s.dayOfWeek));
    const activeDays = DAYS_OF_WEEK.filter((d) => activeDayIndices.has(d.value));

    return {
      totalSlots,
      uniqueClasses,
      uniqueSubjects,
      activeDays,
    };
  }, [teacherSlots]);

  // Compute resolved bell schedules
  const resolvedBells = useMemo(() => {
    if (propBells && propBells.length > 0) return propBells;
    const map = new Map<string, BellInfo>();
    for (const s of slots) {
      if (s.bellSchedule && !map.has(s.bellSchedule.id)) {
        map.set(s.bellSchedule.id, s.bellSchedule);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [propBells, slots]);

  // School days to show in the timetable matrix: Saturday(0) through Wednesday(4), plus Thursday(5) if has slots
  const schoolWeekDays = useMemo(() => DAYS_OF_WEEK, []);

  // Matrix cell lookup: Map<dayOfWeek, Map<bellId, TeacherSlotData[]>>
  const matrixGrid = useMemo(() => {
    const m = new Map<number, Map<string, TeacherSlotData[]>>();
    for (const d of DAYS_OF_WEEK) {
      m.set(d.value, new Map());
    }
    for (const b of resolvedBells) {
      for (const d of DAYS_OF_WEEK) {
        m.get(d.value)!.set(b.id, []);
      }
    }
    for (const s of teacherSlots) {
      const dayMap = m.get(s.dayOfWeek);
      if (!dayMap) continue;
      const list = dayMap.get(s.bellSchedule?.id);
      if (list) list.push(s);
    }
    return m;
  }, [teacherSlots, resolvedBells]);

  if (!teacher) return null;

  const fullName =
    teacher.fullName ||
    `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
    "معلم";

  const handlePrint = () => {
    printTeacherScheduleDocument({
      fullName,
      phoneNumber: teacher.phoneNumber,
      nationalCode: teacher.nationalCode,
      stats,
      schoolWeekDays,
      resolvedBells,
      matrixGrid,
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content
          dir="rtl"
          className="fixed inset-0 z-50 w-screen h-screen bg-slate-50 flex flex-col overflow-hidden outline-none text-right"
        >
          {/* ── Top Bar Header ── */}
          <div className="px-6 py-4 bg-white border-b border-border/80 flex items-center justify-between shrink-0 shadow-xs print:hidden">
            {/* Right: Teacher Identity & Live Badges */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-navy text-white flex items-center justify-center shrink-0 shadow-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-navy">
                    برنامه هفتگی تدریس: {fullName}
                  </h2>
                  <Badge variant="secondary" className="bg-navy/10 text-navy border-0 text-xs font-semibold">
                    کادر آموزشی
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono flex-wrap">
                  {teacher.phoneNumber && (
                    <span className="flex items-center gap-1 text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {teacher.phoneNumber}
                    </span>
                  )}
                  {teacher.nationalCode && (
                    <span className="flex items-center gap-1 text-slate-700">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      کد ملی: {teacher.nationalCode}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Summary Badges */}
              <div className="hidden lg:flex items-center gap-2 mr-6 pr-6 border-r border-border/70">
                <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-medium text-navy flex items-center gap-1.5 shadow-2xs">
                  <Clock className="h-3.5 w-3.5 text-navy/70" />
                  <span className="font-bold tabular-nums">{stats.totalSlots.toLocaleString("fa-IR")}</span>
                  <span>زنگ تدریس هفتگی</span>
                </div>
                <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-medium text-emerald flex items-center gap-1.5 shadow-2xs">
                  <DoorOpen className="h-3.5 w-3.5 text-emerald/70" />
                  <span className="font-bold tabular-nums">{stats.uniqueClasses.toLocaleString("fa-IR")}</span>
                  <span>کلاس درس</span>
                </div>
                <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-medium text-info flex items-center gap-1.5 shadow-2xs">
                  <BookOpen className="h-3.5 w-3.5 text-info/70" />
                  <span className="font-bold tabular-nums">{stats.uniqueSubjects.toLocaleString("fa-IR")}</span>
                  <span>عنوان درسی</span>
                </div>
              </div>
            </div>

            {/* Left: Print Action & Single Close (X) Button */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-10 px-4 text-xs gap-2 border-border hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs rounded-xl"
                title="چاپ برنامه هفتگی این معلم"
              >
                <Printer className="h-4 w-4 text-navy" />
                <span>چاپ برنامه</span>
              </Button>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-border/60"
                title="بستن (Esc)"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Main Full-Screen Timetable Body ── */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
            {/* Dedicated Print-Only Document Header */}
            <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-800 text-right">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">سامانه هوشمند مدارس سامیک</h1>
                  <h2 className="text-base font-bold text-slate-800 mt-1">برنامه هفتگی تدریس: {fullName}</h2>
                </div>
                <div className="text-left text-xs text-slate-600 font-mono space-y-1">
                  {teacher.phoneNumber && <div>تلفن تماس: {teacher.phoneNumber}</div>}
                  {teacher.nationalCode && <div>کد ملی: {teacher.nationalCode}</div>}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-700">
                <span>مجموع جلسات: <strong className="font-bold">{stats.totalSlots.toLocaleString("fa-IR")} زنگ در هفته</strong></span>
                <span>•</span>
                <span>کلاس‌های درس: <strong className="font-bold">{stats.uniqueClasses.toLocaleString("fa-IR")} کلاس</strong></span>
                <span>•</span>
                <span>عناوین درسی: <strong className="font-bold">{stats.uniqueSubjects.toLocaleString("fa-IR")} عنوان</strong></span>
              </div>
            </div>

            {stats.totalSlots === 0 ? (
              <div className="py-24 px-6 text-center rounded-2xl border-2 border-dashed border-border/80 bg-white max-w-xl mx-auto my-12 shadow-sm">
                <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-4 shadow-2xs">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h4 className="font-bold text-navy text-lg">
                  هیچ برنامه‌ای برای این معلم تنظیم نشده است
                </h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  هنوز زنگ درسی به {fullName} تخصیص نیافته است. می‌توانید از بخش «برنامه هفتگی و زنگ‌ها» در داشبورد، دروس این معلم را در کلاس‌های مختلف ثبت کنید.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden max-w-7xl mx-auto print:border-slate-300 print:shadow-none print:max-w-none print:w-full">
                {/* Table Header Legend Bar */}
                <div className="px-6 py-4 bg-slate-50/80 border-b border-border/70 flex items-center justify-between flex-wrap gap-2 print:border-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-navy" />
                    <span className="font-bold text-sm text-navy">
                      جدول زمانی جلسات تدریس در طول هفته
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {WEEK_TYPES_LEGEND.map((w) => (
                      <span key={w.label} className="flex items-center gap-1.5">
                        <span className={cn("h-2.5 w-2.5 rounded-full", w.dotClass)} />
                        <span>{w.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Full-width Timetable Matrix */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-sm border-collapse min-w-[900px] print:min-w-0 print:w-full print:border print:border-slate-400">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-border/80 print:border-slate-400">
                        <th className="p-4 text-right font-bold text-xs text-navy border-l border-border/70 w-[160px] sticky right-0 bg-slate-100 z-10 print:static print:w-[120px] print:bg-slate-100 print:text-black print:border-slate-400 print:p-2">
                          زنگ و ساعت تدریس
                        </th>
                        {schoolWeekDays.map((day) => (
                          <th
                            key={day.value}
                            className="p-4 text-center font-bold text-xs text-navy border-l border-border/70 last:border-l-0 print:border-slate-400 print:text-black print:p-2"
                          >
                            <div className="text-base font-bold text-navy print:text-black">{day.persianName}</div>
                            <div className="text-xs text-muted-foreground font-normal tabular-nums mt-0.5 print:text-slate-600">
                              {day.englishName}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedBells.map((bell, bIdx) => (
                        <tr
                          key={bell.id}
                          className={cn(
                            "border-b border-border/60 hover:bg-slate-50/50 transition-colors print:border-slate-400",
                            bIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          )}
                        >
                          {/* Bell Name & Time */}
                          <td className="p-4 border-l border-border/70 align-middle sticky right-0 bg-inherit z-10 print:static print:bg-slate-50 print:border-slate-400 print:p-2">
                            <div className="font-bold text-sm text-navy print:text-black">{bell.title}</div>
                            <div
                              dir="ltr"
                              className="text-xs text-muted-foreground font-mono tabular-nums mt-1 font-medium print:text-slate-700"
                            >
                              {hhmmToPersian(bell.startTime)} – {hhmmToPersian(bell.endTime)}
                            </div>
                          </td>

                          {/* Day Columns */}
                          {schoolWeekDays.map((day) => {
                            const cellSlots = matrixGrid.get(day.value)?.get(bell.id) ?? [];
                            return (
                              <td
                                key={day.value}
                                className="p-3 border-l border-border/70 align-top last:border-l-0 min-w-[170px] print:min-w-0 print:border-slate-400 print:p-1.5"
                              >
                                {cellSlots.length === 0 ? (
                                  <div className="min-h-[72px] flex items-center justify-center text-xs text-slate-300 font-light select-none print:min-h-[44px] print:text-slate-400">
                                    —
                                  </div>
                                ) : (
                                  <div className="space-y-2 print:space-y-1">
                                    {cellSlots.map((slot) => {
                                      const weekBadge = WEEK_TYPE_BADGE[slot.weekType];
                                      return (
                                        <div
                                          key={slot.id}
                                          className={cn(
                                            "p-3 rounded-xl border shadow-2xs transition-all space-y-2 text-right print:p-1.5 print:rounded-lg print:border-slate-300 print:shadow-none print:space-y-1",
                                            slot.weekType === "ALL_WEEKS"
                                              ? "bg-emerald/5 border-emerald/25 text-emerald-950"
                                              : slot.weekType === "ODD_WEEKS"
                                              ? "bg-info/5 border-info/25 text-blue-950"
                                              : "bg-warning/5 border-warning/25 text-amber-950"
                                          )}
                                        >
                                          {/* Subject Title */}
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-bold text-sm text-navy flex items-center gap-1.5 truncate">
                                              <BookOpen className="h-3.5 w-3.5 text-navy/70 shrink-0" />
                                              <span className="truncate">{slot.subject?.title}</span>
                                            </span>
                                          </div>

                                          {/* Classroom */}
                                          <div className="flex items-center gap-1 text-xs text-slate-700 font-medium">
                                            <DoorOpen className="h-3.5 w-3.5 text-emerald shrink-0" />
                                            <span>
                                              کلاس {slot.classRoom?.name}
                                              <span className="text-muted-foreground text-[11px] mr-1 font-normal">
                                                (پایه {slot.classRoom?.gradeLevel})
                                              </span>
                                            </span>
                                          </div>

                                          {/* Week Parity Badge */}
                                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                                            <Badge
                                              variant="outline"
                                              className={cn("text-[10px] px-2 py-0 h-4 font-normal", weekBadge.className)}
                                            >
                                              {weekBadge.label}
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const TeacherScheduleSheet = TeacherScheduleDialog;
