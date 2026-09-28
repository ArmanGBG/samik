import { PrismaClient, StaffRole, EnrollmentStatus, WeekType, EvaluationType, AttendanceStatus, PointType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Samik database seeding...");

  // 1. Create or update School
  const school = await prisma.school.upsert({
    where: { subdomain: "razi" },
    create: {
      name: "دبیرستان رازی",
      subdomain: "razi",
      smsBalance: 1500,
      status: "ACTIVE",
      termStartDate: new Date("2025-09-23T00:00:00Z"),
    },
    update: {
      name: "دبیرستان رازی",
      status: "ACTIVE",
      termStartDate: new Date("2025-09-23T00:00:00Z"),
    },
  });
  console.log(`✅ School created: ${school.name} (${school.subdomain})`);

  // 2. Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: "09120000000" },
    create: {
      phoneNumber: "09120000000",
      nationalCode: "0000000000",
      firstName: "امیرحسین",
      lastName: "مدیرکل (پلتفرم)",
    },
    update: {
      firstName: "امیرحسین",
      lastName: "مدیرکل (پلتفرم)",
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.phoneNumber}`);

  // 3. Principal User
  const principalUser = await prisma.user.upsert({
    where: { phoneNumber: "09121111111" },
    create: {
      phoneNumber: "09121111111",
      nationalCode: "0011111111",
      firstName: "علیرضا",
      lastName: "رضایی (مدیر)",
    },
    update: {
      firstName: "علیرضا",
      lastName: "رضایی (مدیر)",
    },
  });

  await prisma.staffEmployment.upsert({
    where: {
      schoolId_userId: { schoolId: school.id, userId: principalUser.id },
    },
    create: {
      schoolId: school.id,
      userId: principalUser.id,
      role: StaffRole.PRINCIPAL,
    },
    update: {
      role: StaffRole.PRINCIPAL,
    },
  });
  console.log(`✅ Principal created: ${principalUser.phoneNumber}`);

  // 4. Deputy User (معاون / ناظم)
  const deputyUser = await prisma.user.upsert({
    where: { phoneNumber: "09122222222" },
    create: {
      phoneNumber: "09122222222",
      nationalCode: "0022222222",
      firstName: "محمد",
      lastName: "حسینی (معاون)",
    },
    update: {
      firstName: "محمد",
      lastName: "حسینی (معاون)",
    },
  });

  await prisma.staffEmployment.upsert({
    where: {
      schoolId_userId: { schoolId: school.id, userId: deputyUser.id },
    },
    create: {
      schoolId: school.id,
      userId: deputyUser.id,
      role: StaffRole.DEPUTY,
    },
    update: {
      role: StaffRole.DEPUTY,
    },
  });
  console.log(`✅ Deputy created: ${deputyUser.phoneNumber}`);

  // 5. Teachers (معلمان)
  const teachersData = [
    {
      phone: "09123333333",
      nationalCode: "0033333333",
      firstName: "علی",
      lastName: "احمدی (دبیر ریاضی)",
    },
    {
      phone: "09124444444",
      nationalCode: "0044444444",
      firstName: "رضا",
      lastName: "محمدی (دبیر فیزیک)",
    },
    {
      phone: "09125555555",
      nationalCode: "0055555555",
      firstName: "امیر",
      lastName: "کاظمی (دبیر زیست/ادبیات)",
    },
  ];

  const teachers = [];
  for (const t of teachersData) {
    const user = await prisma.user.upsert({
      where: { phoneNumber: t.phone },
      create: {
        phoneNumber: t.phone,
        nationalCode: t.nationalCode,
        firstName: t.firstName,
        lastName: t.lastName,
      },
      update: {
        firstName: t.firstName,
        lastName: t.lastName,
      },
    });

    await prisma.staffEmployment.upsert({
      where: {
        schoolId_userId: { schoolId: school.id, userId: user.id },
      },
      create: {
        schoolId: school.id,
        userId: user.id,
        role: StaffRole.TEACHER,
      },
      update: {
        role: StaffRole.TEACHER,
      },
    });
    teachers.push(user);
    console.log(`✅ Teacher created: ${user.firstName} ${user.lastName} - ${user.phoneNumber}`);
  }

  // 6. Bell Schedules (زنگ‌های تحصیلی)
  const bellsData = [
    { title: "زنگ اول", startTime: "07:30", endTime: "09:00" },
    { title: "زنگ دوم", startTime: "09:15", endTime: "10:45" },
    { title: "زنگ سوم", startTime: "11:00", endTime: "12:30" },
    { title: "زنگ چهارم", startTime: "12:45", endTime: "14:15" },
  ];

  const bells = [];
  for (const b of bellsData) {
    let bell = await prisma.bellSchedule.findFirst({
      where: { schoolId: school.id, title: b.title },
    });
    if (!bell) {
      bell = await prisma.bellSchedule.create({
        data: {
          schoolId: school.id,
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
        },
      });
    }
    bells.push(bell);
  }
  console.log(`✅ Created ${bells.length} Bell Schedules`);

  // 7. Subjects (دروس)
  const subjectsData = [
    "ریاضیات",
    "فیزیک",
    "زیست‌شناسی",
    "شیمی",
    "زبان و ادبیات فارسی",
    "زبان انگلیسی",
  ];

  const subjects = [];
  for (const title of subjectsData) {
    let subject = await prisma.subject.findFirst({
      where: { schoolId: school.id, title },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { schoolId: school.id, title },
      });
    }
    subjects.push(subject);
  }
  console.log(`✅ Created ${subjects.length} Subjects`);

  // 8. Classrooms (۳ کلاس درس)
  const classroomsData = [
    { gradeLevel: "دهم", name: "۱۰۱ تجربی", major: "EXPERIMENTAL" },
    { gradeLevel: "دهم", name: "۱۰۲ ریاضی", major: "MATHEMATICS" },
    { gradeLevel: "یازدهم", name: "۲۰۱ تجربی", major: "EXPERIMENTAL" },
  ];

  const classrooms = [];
  for (const c of classroomsData) {
    let room = await prisma.classRoom.findFirst({
      where: { schoolId: school.id, name: c.name },
    });
    if (!room) {
      room = await prisma.classRoom.create({
        data: {
          schoolId: school.id,
          gradeLevel: c.gradeLevel,
          name: c.name,
          major: c.major,
        },
      });
    }
    classrooms.push(room);
  }
  console.log(`✅ Created ${classrooms.length} Classrooms`);

  // 9. Timetable Slots (برنامه هفتگی بدون تداخل)
  // Clean old timetable slots for clean seed
  await prisma.timetableSlot.deleteMany({
    where: { schoolId: school.id },
  });

  // Schedule for days 0 (Saturday) to 4 (Wednesday)
  // Teachers: [0: Ali Ahmadi (Math), 1: Reza Mohammadi (Physics), 2: Amir Kazemi (Bio/Lit)]
  // Subjects: [0: Math, 1: Physics, 2: Bio, 3: Chem, 4: Lit, 5: English]
  // Rooms: [0: 101 Tajrobi, 1: 102 Riazi, 2: 201 Tajrobi]
  // Bells: [0: Bell 1, 1: Bell 2, 2: Bell 3]
  for (let day = 0; day <= 4; day++) {
    // Period 1 (07:30 - 09:00)
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[0].id,
        bellScheduleId: bells[0].id,
        teacherUserId: teachers[0].id,
        subjectId: subjects[0].id, // Math
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[1].id,
        bellScheduleId: bells[0].id,
        teacherUserId: teachers[1].id,
        subjectId: subjects[1].id, // Physics
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[2].id,
        bellScheduleId: bells[0].id,
        teacherUserId: teachers[2].id,
        subjectId: subjects[2].id, // Biology
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });

    // Period 2 (09:15 - 10:45)
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[0].id,
        bellScheduleId: bells[1].id,
        teacherUserId: teachers[1].id,
        subjectId: subjects[1].id, // Physics
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[1].id,
        bellScheduleId: bells[1].id,
        teacherUserId: teachers[2].id,
        subjectId: subjects[4].id, // Literature
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[2].id,
        bellScheduleId: bells[1].id,
        teacherUserId: teachers[0].id,
        subjectId: subjects[0].id, // Math
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });

    // Period 3 (11:00 - 12:30)
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[0].id,
        bellScheduleId: bells[2].id,
        teacherUserId: teachers[2].id,
        subjectId: subjects[2].id, // Biology
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[1].id,
        bellScheduleId: bells[2].id,
        teacherUserId: teachers[0].id,
        subjectId: subjects[0].id, // Math
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
    await prisma.timetableSlot.create({
      data: {
        schoolId: school.id,
        classRoomId: classrooms[2].id,
        bellScheduleId: bells[2].id,
        teacherUserId: teachers[1].id,
        subjectId: subjects[1].id, // Physics
        dayOfWeek: day,
        weekType: WeekType.ALL_WEEKS,
      },
    });
  }
  console.log(`✅ Created Full Timetable Slots for all 3 classes (Days 0-4)`);

  // 10. Students: 10 students in each class (30 students total)
  const studentsConfig = [
    // Class 1: 101 Tajrobi
    {
      classIndex: 0,
      students: [
        { name: "مهدی اکبری", phone: "09301010001", guardian: "09191010001", code: "1010000001" },
        { name: "حسین باقری", phone: "09301010002", guardian: "09191010002", code: "1010000002" },
        { name: "سجاد تقوی", phone: "09301010003", guardian: "09191010003", code: "1010000003" },
        { name: "رضا جعفری", phone: "09301010004", guardian: "09191010004", code: "1010000004" },
        { name: "علی چاووشی", phone: "09301010005", guardian: "09191010005", code: "1010000005" },
        { name: "امیرحسین حیدری", phone: "09301010006", guardian: "09191010006", code: "1010000006" },
        { name: "سینا خسروی", phone: "09301010007", guardian: "09191010007", code: "1010000007" },
        { name: "دانیال داوودی", phone: "09301010008", guardian: "09191010008", code: "1010000008" },
        { name: "پویا راد", phone: "09301010009", guardian: "09191010009", code: "1010000009" },
        { name: "عرفان زارع", phone: "09301010010", guardian: "09191010010", code: "1010000010" },
      ],
    },
    // Class 2: 102 Riazi
    {
      classIndex: 1,
      students: [
        { name: "کیان سجادی", phone: "09301020001", guardian: "09191020001", code: "1020000001" },
        { name: "آرش شریفی", phone: "09301020002", guardian: "09191020002", code: "1020000002" },
        { name: "متین صابری", phone: "09301020003", guardian: "09191020003", code: "1020000003" },
        { name: "بردیا ضیایی", phone: "09301020004", guardian: "09191020004", code: "1020000004" },
        { name: "طاها طاهری", phone: "09301020005", guardian: "09191020005", code: "1020000005" },
        { name: "پارسا ظفری", phone: "09301020006", guardian: "09191020006", code: "1020000006" },
        { name: "سپهر عباسی", phone: "09301020007", guardian: "09191020007", code: "1020000007" },
        { name: "مانی غلامی", phone: "09301020008", guardian: "09191020008", code: "1020000008" },
        { name: "نوید فرهمند", phone: "09301020009", guardian: "09191020009", code: "1020000009" },
        { name: "کیارش قاسمی", phone: "09301020010", guardian: "09191020010", code: "1020000010" },
      ],
    },
    // Class 3: 201 Tajrobi
    {
      classIndex: 2,
      students: [
        { name: "امید کاشانی", phone: "09302010001", guardian: "09192010001", code: "2010000001" },
        { name: "کسری لطفی", phone: "09302010002", guardian: "09192010002", code: "2010000002" },
        { name: "شایان محمدزاده", phone: "09302010003", guardian: "09192010003", code: "2010000003" },
        { name: "آرین نادری", phone: "09302010004", guardian: "09192010004", code: "2010000004" },
        { name: "سامان والی", phone: "09302010005", guardian: "09192010005", code: "2010000005" },
        { name: "آرمین هدایتی", phone: "09302010006", guardian: "09192010006", code: "2010000006" },
        { name: "یونس یعقوبی", phone: "09302010007", guardian: "09192010007", code: "2010000007" },
        { name: "امیررضا اسدی", phone: "09302010008", guardian: "09192010008", code: "2010000008" },
        { name: "آرتین بهرامی", phone: "09302010009", guardian: "09192010009", code: "2010000009" },
        { name: "ایلیا پناهی", phone: "09302010010", guardian: "09192010010", code: "2010000010" },
      ],
    },
  ];

  let totalStudentsCreated = 0;
  let firstStudentUserId = "";

  for (const group of studentsConfig) {
    const targetClass = classrooms[group.classIndex];
    for (const s of group.students) {
      const parts = s.name.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ");

      const studentUser = await prisma.user.upsert({
        where: { phoneNumber: s.phone },
        create: {
          phoneNumber: s.phone,
          nationalCode: s.code,
          firstName,
          lastName,
        },
        update: {
          firstName,
          lastName,
        },
      });

      if (!firstStudentUserId) firstStudentUserId = studentUser.id;

      // School enrollment
      const existingEnrollment = await prisma.schoolEnrollment.findFirst({
        where: {
          schoolId: school.id,
          studentUserId: studentUser.id,
          academicYear: "۱۴۰۴-۱۴۰۵",
        },
      });

      if (!existingEnrollment) {
        await prisma.schoolEnrollment.create({
          data: {
            schoolId: school.id,
            studentUserId: studentUser.id,
            classRoomId: targetClass.id,
            academicYear: "۱۴۰۴-۱۴۰۵",
            guardianPhone1: s.guardian,
            status: EnrollmentStatus.ACTIVE,
          },
        });
      }

      totalStudentsCreated++;
    }
  }
  console.log(`✅ Created ${totalStudentsCreated} Students across 3 Classrooms (10 in each)`);

  // 11. Add sample Assessment & Grades for class 101 to populate charts
  if (firstStudentUserId) {
    const class101 = classrooms[0];
    const mathTeacher = teachers[0];

    const assessment = await prisma.assessment.create({
      data: {
        schoolId: school.id,
        classRoomId: class101.id,
        teacherUserId: mathTeacher.id,
        title: "آزمون مستمر ریاضی مهرماه",
        evaluationType: EvaluationType.NUMERIC,
        date: new Date("2025-10-15T00:00:00Z"),
      },
    });

    await prisma.grade.upsert({
      where: {
        assessmentId_studentUserId: {
          assessmentId: assessment.id,
          studentUserId: firstStudentUserId,
        },
      },
      create: {
        schoolId: school.id,
        assessmentId: assessment.id,
        studentUserId: firstStudentUserId,
        numericScore: 18.5,
      },
      update: {
        numericScore: 18.5,
      },
    });

    // Sample behavioral points
    await prisma.behavioralPoint.create({
      data: {
        schoolId: school.id,
        studentUserId: firstStudentUserId,
        teacherUserId: mathTeacher.id,
        pointType: PointType.POSITIVE,
        reasonTag: "حل تمرین خلاقانه پای تخته",
      },
    });

    console.log(`✅ Added sample assessment and behavioral point for test student`);
  }

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
