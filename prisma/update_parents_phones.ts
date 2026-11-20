import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ExtractedStudent {
  canonical_national_code: string;
  first_name: string;
  last_name: string;
  father_name: string;
  grade_level: string;
  major: string;
  student_phone: string;
  father_phone: string;
  mother_phone: string;
  old_db_guardian_phone: string;
  old_db_user_phone: string;
}

async function main() {
  const jsonPath = path.join(process.cwd(), "scratch/extracted_students_update.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ فایل اطلاعات استخراج‌شده یافت نشد:", jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const students: ExtractedStudent[] = JSON.parse(raw);

  console.log(`🚀 شروع به‌روزرسانی اطلاعات اولیا برای ${students.length} دانش‌آموز...`);

  let updatedEnrollments = 0;
  let updatedUsers = 0;
  let skipped = 0;

  for (const st of students) {
    const user = await prisma.user.findUnique({
      where: { nationalCode: st.canonical_national_code },
      include: {
        studentEnrollments: true,
      },
    });

    if (!user) {
      console.warn(`⚠️ کاربر با کد ملی ${st.canonical_national_code} در دیتابیس یافت نشد.`);
      skipped++;
      continue;
    }

    // تعیین شماره ولی ۱ = مادر (در صورت نبود مادر، پدر یا شماره قبلی جایگزین می‌شود)
    const gPhone1 = st.mother_phone || st.father_phone || st.old_db_guardian_phone;
    // تعیین شماره ولی ۲ = پدر (در صورتی که با ولی ۱ متفاوت باشد و موجود باشد)
    const gPhone2 = st.father_phone && st.father_phone !== gPhone1 ? st.father_phone : null;

    // به‌روزرسانی SchoolEnrollment
    if (user.studentEnrollments && user.studentEnrollments.length > 0) {
      for (const enr of user.studentEnrollments) {
        await prisma.schoolEnrollment.update({
          where: { id: enr.id },
          data: {
            guardianPhone1: gPhone1,
            guardianPhone2: gPhone2,
          },
        });
        updatedEnrollments++;
      }
    }

    // به‌روزرسانی شماره همراه خود دانش‌آموز (در صورتی که موجود باشد و شماره یکتایی باشد)
    if (st.student_phone && st.student_phone !== user.phoneNumber) {
      const phoneTaken = await prisma.user.findFirst({
        where: {
          phoneNumber: st.student_phone,
          NOT: { id: user.id },
        },
      });

      if (!phoneTaken) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phoneNumber: st.student_phone },
        });
        updatedUsers++;
      }
    }
  }

  console.log("==========================================");
  console.log(`✅ به‌روزرسانی با موفقیت انجام شد:`);
  console.log(`   - ثبت‌نام‌های به‌روزرسانی‌شده (SchoolEnrollment): ${updatedEnrollments}`);
  console.log(`   - شماره‌های مستقیم دانش‌آموزان به‌روزشده: ${updatedUsers}`);
  console.log(`   - رکوردهای یافت‌نشده: ${skipped}`);
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("❌ خطا در اجرای اسکریپت:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
