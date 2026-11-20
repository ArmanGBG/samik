# نقشه جامع معماری و پیاده‌سازی ماژول «آموزشگاه کنکور» در سامیک (Academy Mode)

این سند طراحی جامع و مرحله‌به‌مرحله برای افزودن حالت **«آموزشگاه کنکور و مراکز آزاد»** به سامانه سامیک است، به گونه‌ای که ساختار فعلی مدارس، برنامه هفتگی، ناظم و چاپ‌های اداری **۱۰۰٪ دست‌نخورده و بدون کوچک‌ترین ریسک** باقی بماند.

---

## ۱. مرور نیازمندی‌ها و اهداف کلیدی

1. **تفکیک کامل و عدم دستکاری ساختار مدارس**: ساختار فعلی مدارس (`School`, `ClassRoom`, `TimetableSlot`, `ClassSession`, `StaffRole`) بدون تغییر باقی می‌ماند.
2. **مدیریت از طریق پنل سوپرادمین**: ایجاد و مدیریت آموزشگاه‌ها دقیقاً مشابه ایجاد مدارس از پنل سوپرادمین کنترل می‌شود.
3. **بازاستفاده از کدهای آماده `samik2`**: انتقال کامپوننت‌های فرانت‌اند و منطق‌های قبلی شامل اسکنر QR با دوربین، فرم حضور و غیاب تکلیفی، سیستم جلسات عددی و اتصال چابک.
4. **پشتیبانی از عضویت هم‌زمان (Dual-Membership)**: یک دانش‌آموز یا معلم می‌تواند همزمان در یک مدرسه رسمی و در چند کلاس کنکوری عضو باشد و بدون تداخل از طریق `/select-profile` سوئیچ کند.

---

## ۲. معماری و ساختار تفکیک‌شده

```text
                               ┌────────────────────────────────┐
                               │     سوپر ادمین (Super Admin)    │
                               └──────────────┬─────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │   مدارس رسمی (School)   │                     │  آموزشگاه کنکور (Academy)│
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
           [ساختار فعلی دست‌نخورده]                             [ساختار جدید چابک]
        - مدیر مدرسه (Principal)                           - مدیر آموزشگاه (Manager)
        - ناظم / معاون (Deputy)                             - اساتید کنکور + شبا/کارت
        - زنگ‌های ثابت شنبه تا چهارشنبه                      - کلاس‌های دوره‌ای (CLS-XXXX)
        - دفتر نمرات و کارنامه رسمی                        - جلسات عددی (جلسه ۱، ۲، ...)
        - چاپ فرم‌های آموزش و پرورش                        - حضور/غیاب/تأخیر + تکلیف
                                                           - اسکن QR Code با دوربین گوشی
```

---

## ۳. جزییات پایگاه داده (Prisma Models)

مدل‌های زیر به صورت ماژولار و مستقل به اسکیما اضافه می‌شوند:

```prisma
// آموزشگاه کنکور
model Academy {
  id            String         @id @default(uuid())
  name          String
  code          String         @unique
  managerUserId String
  managerUser   User           @relation("AcademyManager", fields: [managerUserId], references: [id])
  status        SchoolStatus   @default(ACTIVE)
  province      String?
  city          String?
  phone         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  classes       AcademyClass[]
  staff         AcademyStaff[]
}

// کادر آموزشگاه (مدیر، استاد، دستیار)
model AcademyStaff {
  id          String    @id @default(uuid())
  academyId   String
  userId      String
  role        String    // MANAGER | TEACHER | ASSISTANT
  academy     Academy   @relation(fields: [academyId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id])

  @@unique([academyId, userId])
}

// کلاس کنکور
model AcademyClass {
  id             String              @id // CLS-XXXXXX
  name           String              // عنوان دوره (مثلا: شیمی جامع کنکور)
  academyId      String
  teacherUserId  String?
  schedule       String?             // متن زمان‌بندی (مثلا: پنج‌شنبه‌ها ساعت ۱۶)
  qrToken        String              @unique
  createdAt      DateTime            @default(now())

  academy        Academy             @relation(fields: [academyId], references: [id], onDelete: Cascade)
  enrollments    AcademyEnrollment[]
  sessions       AcademySession[]
}

// عضویت دانش‌آموز در دوره کنکور
model AcademyEnrollment {
  id                 String       @id @default(uuid())
  classId            String
  studentUserId      String
  joinedAtSessionNum Int          @default(1) // جهت جلوگیری از غیبت خوردن در جلسات پیشین
  status             String       @default("ACTIVE") // ACTIVE | LEFT
  createdAt          DateTime     @default(now())

  class              AcademyClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  studentUser        User         @relation(fields: [studentUserId], references: [id])

  @@unique([classId, studentUserId])
}

// جلسه کلاسی (جلسه‌محور)
model AcademySession {
  id         String              @id @default(uuid())
  classId    String
  sessionNum Int                 // شماره جلسه (۱، ۲، ۳، ...)
  name       String              // عنوان جلسه (پیش‌فرض «جلسه N» یا «جلسه فوق‌العاده»)
  date       DateTime            @default(now())
  createdAt  DateTime            @default(now())

  class       AcademyClass       @relation(fields: [classId], references: [id], onDelete: Cascade)
  attendances AcademyAttendance[]

  @@unique([classId, sessionNum])
}

// حضور، غیاب، تأخیر و تکلیف
model AcademyAttendance {
  id             String         @id @default(uuid())
  sessionId      String
  studentUserId  String
  status         String         // PRESENT | ABSENT | LATE
  assignmentDone Boolean        @default(true) // وضعیت انجام تکلیف
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  session        AcademySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentUser    User           @relation(fields: [studentUserId], references: [id])

  @@unique([sessionId, studentUserId])
}
```

---

## ۴. لیست روت‌ها و صفحات اختصاصی آموزشگاه

```text
src/
├── app/
│   ├── (auth)/
│   │   └── select-profile/page.tsx      [ارتقا: نمایش تفکیک‌شده مدارس و آموزشگاه‌ها]
│   │
│   ├── academy/                         [پنل مدیر آموزشگاه]
│   │   ├── page.tsx                     (داشبورد اصلی آموزشگاه)
│   │   ├── classes/page.tsx             (کلاس‌ها، صدور بارکد QR و پوستر)
│   │   └── teachers/page.tsx            (اساتید و تسویه‌حساب)
│   │
│   ├── academy/teacher/                 [پنل استاد کنکور]
│   │   ├── page.tsx                     (کلاس‌های من)
│   │   └── session/[classId]/page.tsx   (ثبت جلسه جدید + حضور و غیاب و تکالیف)
│   │
│   ├── academy/student/                 [پنل دانش‌آموز کنکور]
│   │   └── page.tsx                     (کارت دوره‌ها، اسکن بارکد، وضعیت تکالیف)
│   │
│   └── api/v1/academy/                  [سرویس‌های بک‌اند]
│       ├── classes/route.ts
│       ├── sessions/route.ts
│       ├── attendance/route.ts
│       └── join/route.ts
```

---

## ۵. نقشه راه پیاده‌سازی گام‌به‌گام

1. **گام ۱: توسعه اسکیما (Schema Update)**
   * ثبت مدل‌های ماژولار آموزشگاه در فایل اسکیما و ایجاد کلاینت با `npx prisma generate`.
2. **گام ۲: اندپوینت‌های سوپرادمین و پنل آموزشگاه‌ها**
   * اضافه شدن تب «آموزشگاه‌ها» به داشبورد سوپرادمین جهت ایجاد آموزشگاه جدید و ثبت مدیر.
3. **گام ۳: انتقال ماژول‌های آماده از `samik2`**
   * انتقال اسکنر QR با دوربین (`qr-scanner.tsx`).
   * انتقال فرم حضور و غیاب سریع با سوییچ تکلیف (`session-attendance.tsx`).
4. **گام ۴: فرآیند اتصال سریع دانش‌آموز**
   * پیاده‌سازی روت اتصال دانش‌آموز با بارکد QR و کد ۶ حرفی کلاسی.
5. **گام ۵: تست جامع و تضمین سلامت سیستم مدارس**
   * اجرای کامل `tsc --noEmit` و `npm run build` جهت اعتبارسنجی ۱۰۰٪ بدون باگ.
