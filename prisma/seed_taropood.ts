import { PrismaClient, StaffRole, EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

interface StudentData {
  nationalCode: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  userPhone: string;
  guardianPhone: string;
  hasRealPhone: boolean;
  gradeLevel: string;
  major: string;
  fieldCode: string;
}

const students: StudentData[] = [
  {
    "nationalCode": "2743324635",
    "firstName": "ال آي",
    "lastName": "تلچي",
    "fatherName": "بهمن",
    "userPhone": "09928898344",
    "guardianPhone": "09928898344",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743309709",
    "firstName": "زهرا",
    "lastName": "جعفري اهرنجاني",
    "fatherName": "شهرام",
    "userPhone": "09148558373",
    "guardianPhone": "09148558373",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743294272",
    "firstName": "زهرا",
    "lastName": "حاجي نصيري خانقاه",
    "fatherName": "اكبر",
    "userPhone": "09147606493",
    "guardianPhone": "09147606493",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743241071",
    "firstName": "ملينا",
    "lastName": "شندواري قوشجي",
    "fatherName": "مهدي",
    "userPhone": "09962922876",
    "guardianPhone": "09962922876",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2745464574",
    "firstName": "اليف",
    "lastName": "فرهمنداصل",
    "fatherName": "آيهان",
    "userPhone": "09919829775",
    "guardianPhone": "09919829775",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743316764",
    "firstName": "ريحانه",
    "lastName": "نباتي",
    "fatherName": "محرم",
    "userPhone": "09050489456",
    "guardianPhone": "09050489456",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743299835",
    "firstName": "سما",
    "lastName": "همتي",
    "fatherName": "رضا",
    "userPhone": "09002743299",
    "guardianPhone": "09002743299",
    "hasRealPhone": false,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743246693",
    "firstName": "ستايش",
    "lastName": "آهمند",
    "fatherName": "احمد",
    "userPhone": "09376832124",
    "guardianPhone": "09376832124",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2900619734",
    "firstName": "ريحانه",
    "lastName": "پورآذري",
    "fatherName": "واحد",
    "userPhone": "09587788402",
    "guardianPhone": "09587788402",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743213061",
    "firstName": "سولماز",
    "lastName": "تقي زاده",
    "fatherName": "سيفعلي",
    "userPhone": "09038538638",
    "guardianPhone": "09038538638",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "6380281495",
    "firstName": "روژدا",
    "lastName": "حسيني",
    "fatherName": "عادل",
    "userPhone": "09038734104",
    "guardianPhone": "09038734104",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743149221",
    "firstName": "هستي",
    "lastName": "شجاع دل",
    "fatherName": "نادر",
    "userPhone": "09339888624",
    "guardianPhone": "09339888624",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743192720",
    "firstName": "سيده نازنين",
    "lastName": "عارف زاده",
    "fatherName": "سيدجعفر",
    "userPhone": "09148710288",
    "guardianPhone": "09148710288",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743184558",
    "firstName": "مائده",
    "lastName": "علي بگلوئي",
    "fatherName": "رامين",
    "userPhone": "09144838388",
    "guardianPhone": "09144838388",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743283599",
    "firstName": "رزا",
    "lastName": "غفارنژادثاني",
    "fatherName": "كاوس",
    "userPhone": "09944418005",
    "guardianPhone": "09944418005",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743255341",
    "firstName": "مليكا",
    "lastName": "قره نقدهي",
    "fatherName": "ناصر",
    "userPhone": "09002743255",
    "guardianPhone": "09002743255",
    "hasRealPhone": false,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743200952",
    "firstName": "زهرا",
    "lastName": "كاويد",
    "fatherName": "جواد",
    "userPhone": "09002743200",
    "guardianPhone": "09928898344",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743236116",
    "firstName": "سلوي سادات",
    "lastName": "اكبري كافي",
    "fatherName": "سيدمحمد",
    "userPhone": "09056436116",
    "guardianPhone": "09056436116",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743161973",
    "firstName": "فاطمه",
    "lastName": "اميري چلانسفلي",
    "fatherName": "سعيد",
    "userPhone": "09149226189",
    "guardianPhone": "09149226189",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743240301",
    "firstName": "ستايش",
    "lastName": "جعفرزاده",
    "fatherName": "رضا",
    "userPhone": "09043026594",
    "guardianPhone": "09043026594",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743167815",
    "firstName": "الهه",
    "lastName": "رستمي گمچي",
    "fatherName": "جعفر",
    "userPhone": "09366995630",
    "guardianPhone": "09366995630",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2840893835",
    "firstName": "محيا",
    "lastName": "رضائي تمر",
    "fatherName": "مهدي",
    "userPhone": "09146577643",
    "guardianPhone": "09146577643",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743282916",
    "firstName": "تارا",
    "lastName": "شجاع حسن آباد",
    "fatherName": "علي",
    "userPhone": "09023271512",
    "guardianPhone": "09023271512",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743255765",
    "firstName": "آيسل",
    "lastName": "كبوكي",
    "fatherName": "امير",
    "userPhone": "09399040579",
    "guardianPhone": "09399040579",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743309512",
    "firstName": "نسا",
    "lastName": "مظلوم تومتري",
    "fatherName": "مسعود",
    "userPhone": "09916179721",
    "guardianPhone": "09916179721",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743191600",
    "firstName": "آرميتا",
    "lastName": "ولي زاده ولنده",
    "fatherName": "حيدر",
    "userPhone": "09911827645",
    "guardianPhone": "09911827645",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110"
  },
  {
    "nationalCode": "2743268425",
    "firstName": "عسل",
    "lastName": "كشي آده مرتضي پاشا",
    "fatherName": "ايرج",
    "userPhone": "09361419916",
    "guardianPhone": "09361419916",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "معماري داخلي",
    "fieldCode": "73110"
  },
  {
    "nationalCode": "2743279273",
    "firstName": "يسنا",
    "lastName": "كوكيائي سنگر",
    "fatherName": "احمد",
    "userPhone": "09144414596",
    "guardianPhone": "09144414596",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "معماري داخلي",
    "fieldCode": "73110"
  },
  {
    "nationalCode": "2743350261",
    "firstName": "ريحانه",
    "lastName": "وليمحمدي",
    "fatherName": "اسلام",
    "userPhone": "09383268066",
    "guardianPhone": "09383268066",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "معماري داخلي",
    "fieldCode": "73110"
  },
  {
    "nationalCode": "2743048905",
    "firstName": "نورا",
    "lastName": "آدم عارف",
    "fatherName": "محسن",
    "userPhone": "09302765527",
    "guardianPhone": "09302765527",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "4712075643",
    "firstName": "سيما",
    "lastName": "احمدي حقيقت",
    "fatherName": "احمد",
    "userPhone": "09142120995",
    "guardianPhone": "09142120995",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2742985328",
    "firstName": "دلپاك",
    "lastName": "اسماعيلي",
    "fatherName": "بهرام",
    "userPhone": "09052939535",
    "guardianPhone": "09052939535",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743138017",
    "firstName": "مليسا",
    "lastName": "پروين",
    "fatherName": "يوسف",
    "userPhone": "09145630891",
    "guardianPhone": "09145630891",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "0314453938",
    "firstName": "دنيز",
    "lastName": "جليلي",
    "fatherName": "داود",
    "userPhone": "09308400749",
    "guardianPhone": "09308400749",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743061774",
    "firstName": "مبينا",
    "lastName": "جوادزاده",
    "fatherName": "مجيد",
    "userPhone": "09031824420",
    "guardianPhone": "09031824420",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743052376",
    "firstName": "رها",
    "lastName": "جوادي",
    "fatherName": "غلامرضا",
    "userPhone": "09146768353",
    "guardianPhone": "09146768353",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743095040",
    "firstName": "فاطمه",
    "lastName": "حبيبي",
    "fatherName": "بهنام",
    "userPhone": "09141407198",
    "guardianPhone": "09141407198",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743025001",
    "firstName": "راشين",
    "lastName": "فتاحياني",
    "fatherName": "رضا",
    "userPhone": "09141463150",
    "guardianPhone": "09141463150",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743082755",
    "firstName": "شكيلا",
    "lastName": "محمدزاده كله رش",
    "fatherName": "امير",
    "userPhone": "09145608317",
    "guardianPhone": "09145608317",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743137339",
    "firstName": "باران",
    "lastName": "مردوخي",
    "fatherName": "شهرام",
    "userPhone": "09352128313",
    "guardianPhone": "09352128313",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810"
  },
  {
    "nationalCode": "2743133211",
    "firstName": "اسنا",
    "lastName": "احمدزاده بالدرلو",
    "fatherName": "اسماعيل",
    "userPhone": "09143881719",
    "guardianPhone": "09143881719",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743130806",
    "firstName": "حديث",
    "lastName": "پولادزاده",
    "fatherName": "رامين",
    "userPhone": "09142740040",
    "guardianPhone": "09142740040",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2742993371",
    "firstName": "مهسا",
    "lastName": "تمرزاده بستك آباد",
    "fatherName": "اسگندر",
    "userPhone": "09046159469",
    "guardianPhone": "09046159469",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2742897852",
    "firstName": "اسرا",
    "lastName": "جعفرزاده چونقرالو",
    "fatherName": "عباس",
    "userPhone": "09143896441",
    "guardianPhone": "09143896441",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743096251",
    "firstName": "ريحانه",
    "lastName": "حشمتي آقاجري",
    "fatherName": "فيروز",
    "userPhone": "09223754528",
    "guardianPhone": "09223754528",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743090545",
    "firstName": "اسرا",
    "lastName": "رسولي",
    "fatherName": "مرتضي",
    "userPhone": "09143892982",
    "guardianPhone": "09143892982",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743103744",
    "firstName": "آتنا",
    "lastName": "سقاتپه",
    "fatherName": "عليرضا",
    "userPhone": "09141469842",
    "guardianPhone": "09141469842",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743136707",
    "firstName": "اسما",
    "lastName": "سيدخاني شنگي",
    "fatherName": "اكبر",
    "userPhone": "09002743136",
    "guardianPhone": "09002743136",
    "hasRealPhone": false,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743152575",
    "firstName": "هستي",
    "lastName": "مبين فر",
    "fatherName": "داريوش",
    "userPhone": "09393214768",
    "guardianPhone": "09393214768",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743022884",
    "firstName": "آيسا",
    "lastName": "مهري",
    "fatherName": "عيسي",
    "userPhone": "09144937516",
    "guardianPhone": "09144937516",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743089237",
    "firstName": "رها",
    "lastName": "نوبخت",
    "fatherName": "اكبر",
    "userPhone": "09144434727",
    "guardianPhone": "09144434727",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2743014865",
    "firstName": "سوگل",
    "lastName": "نوري كوجان",
    "fatherName": "آرش",
    "userPhone": "09907431849",
    "guardianPhone": "09907431849",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2742925112",
    "firstName": "سوين",
    "lastName": "وحيدي",
    "fatherName": "اميد",
    "userPhone": "09002742925",
    "guardianPhone": "09002742925",
    "hasRealPhone": false,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320"
  },
  {
    "nationalCode": "2742905472",
    "firstName": "النا",
    "lastName": "اماني دولاما",
    "fatherName": "وحيد",
    "userPhone": "09907343853",
    "guardianPhone": "09907343853",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820"
  },
  {
    "nationalCode": "2742833889",
    "firstName": "ساغر",
    "lastName": "حسيني",
    "fatherName": "مهدي",
    "userPhone": "09353936431",
    "guardianPhone": "09353936431",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820"
  },
  {
    "nationalCode": "2743033150",
    "firstName": "ثنا",
    "lastName": "رضائي",
    "fatherName": "محمدرضا",
    "userPhone": "09918500634",
    "guardianPhone": "09918500634",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820"
  },
  {
    "nationalCode": "2743084588",
    "firstName": "آتنا",
    "lastName": "ژاله كريمي",
    "fatherName": "مهدي",
    "userPhone": "09143895465",
    "guardianPhone": "09143895465",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820"
  },
  {
    "nationalCode": "2743146877",
    "firstName": "آيتن",
    "lastName": "فيروزي خانشان",
    "fatherName": "سعيد",
    "userPhone": "09149509593",
    "guardianPhone": "09149509593",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820"
  },
  {
    "nationalCode": "1364998920",
    "firstName": "آتنا",
    "lastName": "قائمي",
    "fatherName": "حسين",
    "userPhone": "09370597288",
    "guardianPhone": "09370597288",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820"
  }
];

async function main() {
  console.log("🚀 شروع فرآیند ایجاد مدرسه و کلاس‌های تار و پود...");

  // ۱. ایجاد یا به‌روزرسانی مدرسه تار و پود
  const school = await prisma.school.upsert({
    where: { subdomain: "taropood" },
    create: {
      name: "هنرستان تار و پود",
      subdomain: "taropood",
      smsBalance: 2000,
      status: "ACTIVE",
      termStartDate: new Date("2025-09-23T00:00:00Z"),
    },
    update: {
      name: "هنرستان تار و پود",
      status: "ACTIVE",
    },
  });
  console.log(`✅ مدرسه ایجاد شد: ${school.name} (ساب‌دامین: ${school.subdomain})`);

  // ۲. ایجاد مدیر مدرسه (خانم سیداشرف)
  const principalUser = await prisma.user.upsert({
    where: { phoneNumber: "09121110001" },
    create: {
      phoneNumber: "09121110001",
      nationalCode: "0011110001",
      firstName: "خانم",
      lastName: "سیداشرف (مدیر)",
    },
    update: {
      firstName: "خانم",
      lastName: "سیداشرف (مدیر)",
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
  console.log(`✅ مدیر مدرسه ثبت شد: خانم سیداشرف (شماره: ${principalUser.phoneNumber} | کد ملی: ${principalUser.nationalCode})`);

  // ۳. ایجاد کلاس‌های درس به تفکیک پایه و رشته
  const classConfigs = [
    { gradeLevel: "دهم", name: "دهم شبکه و نرم‌افزار", major: "شبكه و نرم‌افزار رايانه" },
    { gradeLevel: "دهم", name: "دهم طراحی و دوخت", major: "طراحي و دوخت" },
    { gradeLevel: "دهم", name: "دهم عکاسی", major: "عکاسی" },
    { gradeLevel: "دهم", name: "دهم معماری داخلی", major: "معماري داخلي" },
    { gradeLevel: "یازدهم", name: "یازدهم شبکه و نرم‌افزار", major: "شبكه و نرم‌افزار رايانه" },
    { gradeLevel: "یازدهم", name: "یازدهم طراحی و دوخت", major: "طراحي و دوخت" },
    { gradeLevel: "یازدهم", name: "یازدهم فتو-گرافیک", major: "فتو-گرافيك" },
  ];

  const classRoomMap = new Map<string, string>();

  for (const c of classConfigs) {
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
    classRoomMap.set(`${c.gradeLevel}_${c.major}`, room.id);
    console.log(`✅ کلاس ایجاد شد: ${room.name} (شناسه: ${room.id})`);
  }

  // ۴. ثبت‌نام تمام دانش‌آموزان در جدول کاربران و انتساب به کلاس مربوطه
  console.log(`\n⏳ در حال ثبت ${students.length} دانش‌آموز...`);
  let successCount = 0;

  for (const st of students) {
    // ایجاد یا یافتن کاربر در جدول User با مدیریت شماره‌های یکتا
    let user = await prisma.user.findUnique({
      where: { nationalCode: st.nationalCode },
    });

    if (!user) {
      // بررسی اینکه آیا این شماره موبایل قبلاً برای کاربر دیگری ثبت شده یا خیر
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phoneNumber: st.userPhone },
      });

      const finalPhone = existingPhoneUser ? ("0900" + st.nationalCode.slice(0, 7)) : st.userPhone;

      user = await prisma.user.create({
        data: {
          nationalCode: st.nationalCode,
          phoneNumber: finalPhone,
          firstName: st.firstName,
          lastName: st.lastName,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: st.firstName,
          lastName: st.lastName,
        },
      });
    }

    const classRoomKey = `${st.gradeLevel}_${st.major}`;
    const classRoomId = classRoomMap.get(classRoomKey);

    if (!classRoomId) {
      console.warn(`⚠️ کلاس متناظر برای دانش‌آموز ${st.firstName} ${st.lastName} یافت نشد: ${classRoomKey}`);
      continue;
    }

    // ایجاد یا ثبت‌نام در جدول SchoolEnrollment
    const existingEnrollment = await prisma.schoolEnrollment.findFirst({
      where: {
        schoolId: school.id,
        studentUserId: user.id,
      },
    });

    if (!existingEnrollment) {
      await prisma.schoolEnrollment.create({
        data: {
          schoolId: school.id,
          studentUserId: user.id,
          classRoomId: classRoomId,
          academicYear: "1403-1404",
          guardianPhone1: st.guardianPhone,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    } else {
      await prisma.schoolEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          classRoomId: classRoomId,
          academicYear: "1403-1404",
          guardianPhone1: st.guardianPhone,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    }

    successCount++;
  }

  console.log(`\n🎉 فرآیند با موفقیت به پایان رسید!`);
  console.log(`📊 آمار:`);
  console.log(` - مدرسه: ${school.name}`);
  console.log(` - تعداد کلاس‌ها: ${classConfigs.length} کلاس`);
  console.log(` - دانش‌آموزان ثبت‌شده و منتسب به کلاس: ${successCount} نفر`);
}

main()
  .catch((e) => {
    console.error("❌ خطا در اجرای سید:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
