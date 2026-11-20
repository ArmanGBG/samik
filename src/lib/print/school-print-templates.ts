/**
 * school-print-templates.ts
 *
 * Official Iranian Ministry of Education (آموزش و پرورش) compliant printable document generators.
 * Includes official headers, RTL layout, zebra-striped tables, metadata strips, and signature footers.
 */

import { toPersianDate, toPersianDateTime } from "../date-utils";

export interface PrintBaseMeta {
  schoolName: string;
  academicYear?: string;
  reportDate?: string;
  printedBy?: string;
}

function getBaseStyles(orientation: "portrait" | "landscape" = "portrait"): string {
  return `
    @page {
      size: A4 ${orientation};
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      background: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 0;
      font-size: 9pt;
      line-height: 1.35;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .print-header-center {
      text-align: center;
      flex: 1;
    }
    .print-header-center .sub-title {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 2px;
    }
    .print-header-center h1 {
      font-size: 13pt;
      font-weight: 800;
      color: #1e3a8a;
      margin: 0 0 4px 0;
    }
    .print-header-center h2 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .print-header-side {
      font-size: 8pt;
      color: #475569;
      line-height: 1.6;
      min-width: 130px;
    }
    .print-header-side.left {
      text-align: left;
    }
    .stats-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 10px;
      margin-bottom: 10px;
      font-size: 8.5pt;
      color: #334155;
    }
    .stats-strip strong {
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      font-size: 8.5pt;
      margin-bottom: 12px;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      vertical-align: middle;
      text-align: right;
    }
    th {
      background-color: #f1f5f9;
      color: #1e3a8a;
      font-weight: 700;
      text-align: center;
      padding: 5px 4px;
    }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .font-mono { font-family: monospace, Tahoma, sans-serif !important; direction: ltr; display: inline-block; }
    .even-row { background-color: #ffffff; }
    .odd-row { background-color: #f8fafc; }
    
    .print-footer {
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 15px 0 10px 0;
      font-size: 8.5pt;
      color: #1e293b;
    }
    .signature-box {
      text-align: center;
      min-width: 180px;
    }
    .signature-dots {
      margin-top: 25px;
      border-top: 1px dashed #94a3b8;
      width: 140px;
      margin-left: auto;
      margin-right: auto;
    }
    .system-brand {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 7.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  `;
}

function renderHeader(title: string, subTitle: string, meta: PrintBaseMeta): string {
  const dateStr = meta.reportDate || toPersianDateTime(new Date());
  const yearStr = meta.academicYear || "۱۴۰۴-۱۴۰۵";

  return `
    <div class="print-header">
      <div class="print-header-side">
        <div><strong>جمهوری اسلامی ایران</strong></div>
        <div>وزارت آموزش و پرورش</div>
        <div>مدرسه: <strong>${meta.schoolName}</strong></div>
      </div>
      <div class="print-header-center">
        <div class="sub-title">سامانه مدیریت هوشمند مدارس — سامیک</div>
        <h1>${title}</h1>
        <h2>${subTitle}</h2>
      </div>
      <div class="print-header-side left">
        <div>سال تحصیلی: <strong>${yearStr}</strong></div>
        <div>تاریخ گزارش: <strong>${dateStr}</strong></div>
        ${meta.printedBy ? `<div>تنظیم: ${meta.printedBy}</div>` : ""}
      </div>
    </div>
  `;
}

function renderFooter(signatures: string[] = ["امضای تنظیم‌کننده", "مهر و امضای مدیر مدرسه"]): string {
  const sigsHtml = signatures
    .map(
      (s) => `
      <div class="signature-box">
        <div><strong>${s}</strong></div>
        <div class="signature-dots"></div>
      </div>
    `
    )
    .join("");

  return `
    <div class="print-footer">
      <div class="signatures">
        ${sigsHtml}
      </div>
      <div class="system-brand">
        <span>سامیک © سامانه یکپارچه مدیریت آموزشی، کلاسی و انضباطی مدارس</span>
        <span>صفحه رسمی اداری آموزشگاه</span>
      </div>
    </div>
  `;
}

// ============================================================================
// 1. لیست دانش‌آموزان (کلاسی یا کل مدرسه)
// ============================================================================
export interface StudentPrintItem {
  index?: number;
  fullName: string;
  nationalCode: string;
  classroomName?: string | null;
  guardianPhone1?: string | null;
  guardianPhone2?: string | null;
  phoneNumber?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export function generateStudentRosterHtml(
  students: StudentPrintItem[],
  options: {
    title?: string;
    subTitle?: string;
    showClassCol?: boolean;
    meta: PrintBaseMeta;
  }
): string {
  const title = options.title || "لیست رسمی مشخصات دانش‌آموزان";
  const subTitle = options.subTitle || `تعداد کل: ${students.length.toLocaleString("fa-IR")} نفر`;

  const colSpan = options.showClassCol !== false ? 8 : 7;
  const rowsHtml = students.length === 0
    ? `<tr><td colspan="${colSpan}" class="text-center" style="padding: 24px; color: #64748b;">هیچ دانش‌آموزی در این لیست یافت نشد.</td></tr>`
    : students
        .map((st, i) => {
          const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
          const cleanNc = st.nationalCode?.startsWith("TEMP-") ? "موقت" : st.nationalCode || "—";
          const classTd = options.showClassCol !== false
            ? `<td class="text-center">${st.classroomName || "—"}</td>`
            : "";
          const guardianPhonesHtml = [
            st.guardianPhone1 ? `<div><span style="font-size: 7pt; color: #64748b;">مادر:</span> ${st.guardianPhone1}</div>` : null,
            st.guardianPhone2 ? `<div><span style="font-size: 7pt; color: #64748b;">پدر:</span> ${st.guardianPhone2}</div>` : null,
          ].filter(Boolean).join("") || "—";

          return `
            <tr class="${rowClass}">
              <td class="text-center" style="width: 35px;">${(i + 1).toLocaleString("fa-IR")}</td>
              <td><strong>${st.fullName}</strong></td>
              <td class="text-center font-mono" style="width: 95px;">${cleanNc}</td>
              ${classTd}
              <td class="text-center font-mono" style="width: 125px; line-height: 1.3;">${guardianPhonesHtml}</td>
              <td class="text-center font-mono" style="width: 100px;">${st.phoneNumber || "—"}</td>
              <td class="text-center" style="width: 65px;">${st.status === "ACTIVE" ? "فعال" : "در انتظار"}</td>
              <td class="text-center" style="width: 70px;"></td>
            </tr>
          `;
        })
        .join("");

  const classTh = options.showClassCol !== false
    ? `<th style="width: 110px;">کلاس درس</th>`
    : "";

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${options.meta.schoolName}</title>
  <style>
    ${getBaseStyles("portrait")}
  </style>
</head>
<body>
  ${renderHeader(title, subTitle, options.meta)}

  <div class="stats-strip">
    <div>تعداد دانش‌آموزان: <strong>${students.length.toLocaleString("fa-IR")} نفر</strong></div>
    <div>•</div>
    <div>وضعیت: <strong>رسمی و معتبر جهت بایگانی و ارائه به آموزش و پرورش</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">ردیف</th>
        <th>نام و نام خانوادگی</th>
        <th style="width: 95px;">کد ملی</th>
        ${classTh}
        <th style="width: 125px;">شماره اولیاء (مادر / پدر)</th>
        <th style="width: 100px;">شماره دانش‌آموز</th>
        <th style="width: 65px;">وضعیت</th>
        <th style="width: 70px;">ملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${renderFooter(["معاون اجرایی آموزشگاه", "مهر و امضای مدیر آموزشگاه"])}
</body>
</html>`;
}

// ============================================================================
// 2. دفتر کلاسی خام معلم (دفتر حضور و غیاب و ارزشیابی کلاسی ۳۰ جلسه‌ای)
// ============================================================================
export function generateBlankTeacherSheetHtml(
  students: StudentPrintItem[],
  options: {
    classroomName: string;
    subjectTitle?: string;
    teacherName?: string;
    sessionCount?: number;
    meta: PrintBaseMeta;
  }
): string {
  const sessionCount = options.sessionCount || 24; // 24 sessions standard
  const title = "دفتر ارزشیابی مستمر و حضور و غیاب کلاسی";
  const subTitle = `کلاس: ${options.classroomName} ${options.subjectTitle ? `• درس: ${options.subjectTitle}` : ""} ${options.teacherName ? `• دبیر: ${options.teacherName}` : ""}`;

  let headerSessions = "";
  for (let s = 1; s <= sessionCount; s++) {
    headerSessions += `<th style="width: 25px; padding: 2px 1px; font-size: 7pt; font-weight: normal;">${s.toLocaleString("fa-IR")}</th>`;
  }

  const rowsHtml = students.length === 0
    ? `<tr><td colspan="${sessionCount + 5}" class="text-center" style="padding: 24px; color: #64748b;">هیچ دانش‌آموزی در این کلاس ثبت نشده است.</td></tr>`
    : students
        .map((st, i) => {
          const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
          let sessionCells = "";
          for (let s = 1; s <= sessionCount; s++) {
            sessionCells += `<td style="width: 25px; padding: 0;"></td>`;
          }
          return `
            <tr class="${rowClass}">
              <td class="text-center" style="width: 30px; font-size: 8pt;">${(i + 1).toLocaleString("fa-IR")}</td>
              <td style="white-space: nowrap; font-size: 8.5pt;"><strong>${st.fullName}</strong></td>
              <td class="text-center font-mono" style="width: 80px; font-size: 7.5pt;">${st.nationalCode?.startsWith("TEMP-") ? "موقت" : st.nationalCode || ""}</td>
              ${sessionCells}
              <td style="width: 35px;"></td>
              <td style="width: 35px;"></td>
            </tr>
          `;
        })
        .join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${options.classroomName}</title>
  <style>
    ${getBaseStyles("landscape")}
    table { font-size: 8pt; }
    th, td { height: 22px; }
  </style>
</head>
<body>
  ${renderHeader(title, subTitle, options.meta)}

  <div class="stats-strip" style="justify-content: space-between;">
    <div>کلاس: <strong>${options.classroomName}</strong> | درس: <strong>${options.subjectTitle || ".................."}</strong> | دبیر: <strong>${options.teacherName || ".................."}</strong></div>
    <div>تعداد دانش‌آموزان: <strong>${students.length.toLocaleString("fa-IR")} نفر</strong> | راهنما: <strong>غ (غایب) - ت (تاخیر)</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width: 30px;">#</th>
        <th rowspan="2" style="width: 140px;">نام و نام خانوادگی</th>
        <th rowspan="2" style="width: 80px;">کد ملی</th>
        <th colspan="${sessionCount}">جلسات و تاریخ‌های آموزشی (ارزشیابی / حضور و غیاب)</th>
        <th rowspan="2" style="width: 35px; font-size: 7pt;">مستمر</th>
        <th rowspan="2" style="width: 35px; font-size: 7pt;">پایانی</th>
      </tr>
      <tr>
        ${headerSessions}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${renderFooter(["امضای دبیر محترم", "امضا و مهر مدیر آموزشگاه"])}
</body>
</html>`;
}

// ============================================================================
// 3. لیست همکاران و کادر آموزشی مدرسه (Staff List)
// ============================================================================
export interface StaffPrintItem {
  fullName: string;
  role: string;
  roleLabel: string;
  phoneNumber?: string | null;
  nationalCode?: string | null;
  subjectTitles?: string[];
  classCount?: number;
}

export function generateStaffListHtml(
  staff: StaffPrintItem[],
  options: {
    meta: PrintBaseMeta;
  }
): string {
  const title = "لیست رسمی پرسنل و کادر آموزشی مدرسه";
  const subTitle = `تعداد کل همکاران: ${staff.length.toLocaleString("fa-IR")} نفر`;

  const rowsHtml = staff.length === 0
    ? `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #64748b;">هیچ پرسنلی در این لیست ثبت نشده است.</td></tr>`
    : staff
        .map((s, i) => {
          const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
          return `
            <tr class="${rowClass}">
              <td class="text-center" style="width: 40px;">${(i + 1).toLocaleString("fa-IR")}</td>
              <td><strong>${s.fullName}</strong></td>
              <td class="text-center"><strong>${s.roleLabel || s.role}</strong></td>
              <td class="text-center font-mono" style="width: 110px;">${s.nationalCode || "—"}</td>
              <td class="text-center font-mono" style="width: 110px;">${s.phoneNumber || "—"}</td>
              <td>${s.subjectTitles && s.subjectTitles.length > 0 ? s.subjectTitles.join("، ") : "—"}</td>
              <td class="text-center" style="width: 90px;"></td>
            </tr>
          `;
        })
        .join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${options.meta.schoolName}</title>
  <style>
    ${getBaseStyles("portrait")}
  </style>
</head>
<body>
  ${renderHeader(title, subTitle, options.meta)}

  <div class="stats-strip">
    <div>تعداد کل پرسنل: <strong>${staff.length.toLocaleString("fa-IR")} نفر</strong></div>
    <div>•</div>
    <div>معلمان: <strong>${staff.filter((s) => s.role === "TEACHER").length.toLocaleString("fa-IR")} نفر</strong></div>
    <div>•</div>
    <div>کادر اداری و معاونین: <strong>${staff.filter((s) => s.role !== "TEACHER").length.toLocaleString("fa-IR")} نفر</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">ردیف</th>
        <th>نام و نام خانوادگی</th>
        <th style="width: 120px;">سمت سازمانی</th>
        <th style="width: 110px;">کد ملی</th>
        <th style="width: 110px;">شماره تماس</th>
        <th>دروس / حیطه فعالیت</th>
        <th style="width: 90px;">امضا</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${renderFooter(["تنظیم‌کننده: امور دفتری", "تأیید حراست / آموزش", "مهر و امضای مدیر آموزشگاه"])}
</body>
</html>`;
}

// ============================================================================
// 4. برنامه هفتگی کلاسی و برنامه جامع مدرسه (Timetable)
// ============================================================================
export interface BellPrintItem {
  id: string;
  name?: string;
  title?: string;
  bellOrder?: number;
  startTime: string;
  endTime: string;
}

export interface SlotPrintItem {
  id: string;
  dayOfWeek: number; // 0..5
  bellScheduleId: string;
  subjectTitle: string;
  teacherName: string;
  classroomName: string;
  weekType?: string;
}

export const DAYS_LIST = [
  { day: 0, fa: "شنبه" },
  { day: 1, fa: "یک‌شنبه" },
  { day: 2, fa: "دوشنبه" },
  { day: 3, fa: "سه‌شنبه" },
  { day: 4, fa: "چهارشنبه" },
];

export function generateClassTimetableHtml(
  targetName: string, // e.g. "دهم ریاضی" or "برنامه جامع مدرسه"
  slots: SlotPrintItem[],
  bells: BellPrintItem[],
  options: {
    isMasterTimetable?: boolean;
    subTitle?: string;
    meta: PrintBaseMeta;
  }
): string {
  const title = options.isMasterTimetable
    ? "ماتریس جامع برنامه هفتگی آموزشگاه"
    : `برنامه هفتگی کلاس: ${targetName}`;
  const subTitle = options.subTitle || "برنامه رسمی مصوب شورای آموزشی مدرسه";

  const sortedBells = [...bells].sort((a, b) =>
    (a.bellOrder || 0) !== (b.bellOrder || 0)
      ? (a.bellOrder || 0) - (b.bellOrder || 0)
      : a.startTime.localeCompare(b.startTime)
  );

  const theadHtml = `
    <thead>
      <tr>
        <th style="width: 110px;">زنگ / روز هفته</th>
        ${DAYS_LIST.map((d) => `<th style="width: 18%;">${d.fa}</th>`).join("")}
      </tr>
    </thead>
  `;

  const tbodyHtml = sortedBells
    .map((bell, bIdx) => {
      const bellTitle = bell.title || bell.name || `زنگ ${(bIdx + 1).toLocaleString("fa-IR")}`;
      const bellTime = `${bell.startTime} - ${bell.endTime}`;

      const daysCols = DAYS_LIST.map((dayObj) => {
        const matchingSlots = slots.filter(
          (s) => s.dayOfWeek === dayObj.day && s.bellScheduleId === bell.id
        );

        if (matchingSlots.length === 0) {
          return `<td style="text-align: center; color: #cbd5e1; font-size: 13pt;">—</td>`;
        }

        const cards = matchingSlots
          .map((s) => {
            const extra = options.isMasterTimetable
              ? `<div style="font-size: 7.5pt; color: #1e3a8a; font-weight: bold;">${s.classroomName}</div>`
              : "";
            return `
              <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; margin-bottom: 3px;">
                <div style="font-weight: 700; color: #0f172a; font-size: 8.5pt;">${s.subjectTitle}</div>
                <div style="font-size: 7.5pt; color: #475569;">دبیر: ${s.teacherName}</div>
                ${extra}
              </div>
            `;
          })
          .join("");

        return `<td>${cards}</td>`;
      }).join("");

      return `
        <tr>
          <td style="background: #f8fafc; text-align: center;">
            <div style="font-weight: 700; color: #1e3a8a;">${bellTitle}</div>
            <div class="font-mono" style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">${bellTime}</div>
          </td>
          ${daysCols}
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${options.meta.schoolName}</title>
  <style>
    ${getBaseStyles("landscape")}
    table { height: calc(100% - 140px); }
    td { vertical-align: top; }
  </style>
</head>
<body>
  ${renderHeader(title, subTitle, options.meta)}

  <div class="stats-strip">
    <div>عنوان برنامه: <strong>${targetName}</strong></div>
    <div>•</div>
    <div>تعداد زنگ‌های آموزشی: <strong>${sortedBells.length.toLocaleString("fa-IR")} زنگ</strong></div>
    <div>•</div>
    <div>مجموع ساعات آموزشی ثبت‌شده: <strong>${slots.length.toLocaleString("fa-IR")} زنگ در هفته</strong></div>
  </div>

  <table>
    ${theadHtml}
    <tbody>
      ${tbodyHtml}
    </tbody>
  </table>

  ${renderFooter(["شورای برنامه‌ریزی مدرسه", "مهر و امضای مدیر آموزشگاه"])}
</body>
</html>`;
}

// ============================================================================
// 5. ریزنمرات رسمی دبیر (Gradebook)
// ============================================================================
export interface GradebookPrintStudent {
  fullName: string;
  nationalCode: string;
  monthlyAverage: number | null;
  grades: Array<{
    title: string;
    numericScore: number | null;
    descriptiveScore: string | null;
    isAbsent: boolean;
  }>;
}

export function generateGradebookHtml(
  students: GradebookPrintStudent[],
  assessments: string[],
  options: {
    classroomName: string;
    subjectTitle: string;
    teacherName: string;
    meta: PrintBaseMeta;
  }
): string {
  const title = "دفتر ریزنمرات و ارزشیابی مستمر کلاسی";
  const subTitle = `کلاس: ${options.classroomName} • درس: ${options.subjectTitle} • دبیر: ${options.teacherName}`;

  const theadAssessments = assessments
    .map((a) => `<th style="width: 55px; font-size: 7.5pt; padding: 3px 2px;">${a}</th>`)
    .join("");

  const colSpan = assessments.length + 5;
  const rowsHtml = students.length === 0
    ? `<tr><td colspan="${colSpan}" class="text-center" style="padding: 24px; color: #64748b;">هیچ دانش‌آموزی در این ارزشیابی ثبت نشده است.</td></tr>`
    : students
        .map((st, i) => {
      const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
      const cleanNc = st.nationalCode?.startsWith("TEMP-") ? "موقت" : st.nationalCode || "";
      const scoreCells = st.grades
        .map((g) => {
          if (g.isAbsent) {
            return `<td class="text-center" style="color: #dc2626; font-size: 8pt; font-weight: bold;">غ</td>`;
          }
          if (g.numericScore !== null && g.numericScore !== undefined) {
            return `<td class="text-center font-mono">${g.numericScore.toLocaleString("fa-IR")}</td>`;
          }
          if (g.descriptiveScore) {
            return `<td class="text-center" style="font-size: 7pt;">${g.descriptiveScore}</td>`;
          }
          return `<td class="text-center">—</td>`;
        })
        .join("");

      const avgStr = st.monthlyAverage !== null && st.monthlyAverage !== undefined
        ? Number(st.monthlyAverage).toFixed(2).replace(".", "/")
        : "—";

      return `
        <tr class="${rowClass}">
          <td class="text-center" style="width: 35px;">${(i + 1).toLocaleString("fa-IR")}</td>
          <td><strong>${st.fullName}</strong></td>
          <td class="text-center font-mono" style="width: 90px;">${cleanNc}</td>
          ${scoreCells}
          <td class="text-center font-mono" style="width: 60px; font-weight: bold; background: #f8fafc;">${avgStr}</td>
          <td style="width: 80px;"></td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${options.classroomName}</title>
  <style>
    ${getBaseStyles("landscape")}
  </style>
</head>
<body>
  ${renderHeader(title, subTitle, options.meta)}

  <div class="stats-strip">
    <div>کلاس: <strong>${options.classroomName}</strong></div>
    <div>•</div>
    <div>درس: <strong>${options.subjectTitle}</strong></div>
    <div>•</div>
    <div>دبیر: <strong>${options.teacherName}</strong></div>
    <div>•</div>
    <div>تعداد دانش‌آموزان: <strong>${students.length.toLocaleString("fa-IR")} نفر</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">ردیف</th>
        <th style="width: 160px;">نام و نام خانوادگی</th>
        <th style="width: 90px;">کد ملی</th>
        ${theadAssessments}
        <th style="width: 60px;">میانگین</th>
        <th style="width: 80px;">امضای دبیر</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${renderFooter(["امضای دبیر درس", "تأیید مسئول امتحانات", "مهر و امضای مدیر آموزشگاه"])}
</body>
</html>`;
}

// ============================================================================
// 6. گزارش صورت‌جلسه غایبین روزانه (Absentee List)
// ============================================================================
export interface AbsenteePrintItem {
  studentName: string;
  classroomName: string;
  subjectTitle: string;
  teacherName: string;
  guardianPhone?: string | null;
  time?: string | null;
}

export function generateAbsenteeHtml(
  absentees: AbsenteePrintItem[],
  options: {
    reportDate?: string;
    meta: PrintBaseMeta;
  }
): string {
  const title = "صورت‌جلسه رسمی غیبت روزانه دانش‌آموزان";
  const subTitle = `تعداد کل غایبین: ${absentees.length.toLocaleString("fa-IR")} نفر`;

  const rowsHtml = absentees.length === 0
    ? `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #16a34a; font-weight: bold;">هیچ موردی از غیبت دانش‌آموزان ثبت نشده است (کلیه دانش‌آموزان حاضر هستند).</td></tr>`
    : absentees
        .map((ab, i) => {
      const rowClass = i % 2 === 0 ? "even-row" : "odd-row";
      return `
        <tr class="${rowClass}">
          <td class="text-center" style="width: 40px;">${(i + 1).toLocaleString("fa-IR")}</td>
          <td><strong>${ab.studentName}</strong></td>
          <td class="text-center">${ab.classroomName}</td>
          <td class="text-center">${ab.subjectTitle}</td>
          <td class="text-center">${ab.teacherName}</td>
          <td class="text-center font-mono" style="width: 110px;">${ab.guardianPhone || "—"}</td>
          <td class="text-center font-mono" style="width: 70px;">${ab.time || "—"}</td>
          <td style="width: 100px;"></td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${options.meta.schoolName}</title>
  <style>
    ${getBaseStyles("portrait")}
  </style>
</head>
<body>
  ${renderHeader(title, subTitle, options.meta)}

  <div class="stats-strip">
    <div>تاریخ بررسی: <strong>${options.reportDate || toPersianDate(new Date())}</strong></div>
    <div>•</div>
    <div>مجموع موارد غیبت ثبت‌شده: <strong>${absentees.length.toLocaleString("fa-IR")} مورد</strong></div>
    <div>•</div>
    <div>جهت ثبت در دفتر انضباطی و پیگیری با اولیا</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">ردیف</th>
        <th>نام دانش‌آموز</th>
        <th style="width: 110px;">کلاس درس</th>
        <th style="width: 110px;">درس</th>
        <th style="width: 110px;">دبیر کلاس</th>
        <th style="width: 110px;">شماره تماس ولی</th>
        <th style="width: 70px;">ساعت ثبت</th>
        <th style="width: 100px;">اقدام و علت غیبت</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${renderFooter(["معاون آموزشی / ناظم آموزشگاه", "مهر و امضای مدیر آموزشگاه"])}
</body>
</html>`;
}
