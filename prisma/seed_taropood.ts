import { PrismaClient, StaffRole, EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

interface StudentData {
  nationalCode: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  userPhone: string;
  guardianPhone: string;
  guardianPhone1?: string;
  guardianPhone2?: string | null;
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
    "guardianPhone": "09141873814",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09141873814",
    "guardianPhone2": "09143468061"
  },
  {
    "nationalCode": "2743309709",
    "firstName": "زهرا",
    "lastName": "جعفري اهرنجاني",
    "fatherName": "شهرام",
    "userPhone": "09148558373",
    "guardianPhone": "09333232578",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09333232578",
    "guardianPhone2": "09144492748"
  },
  {
    "nationalCode": "2743294272",
    "firstName": "زهرا",
    "lastName": "حاجي نصيري خانقاه",
    "fatherName": "اكبر",
    "userPhone": "09147606493",
    "guardianPhone": "09045805721",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09045805721",
    "guardianPhone2": "09149373056"
  },
  {
    "nationalCode": "2743241071",
    "firstName": "ملينا",
    "lastName": "شندواري قوشجي",
    "fatherName": "مهدي",
    "userPhone": "09962922876",
    "guardianPhone": "09147109235",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09147109235",
    "guardianPhone2": "09102660484"
  },
  {
    "nationalCode": "2745464574",
    "firstName": "اليف",
    "lastName": "فرهمنداصل",
    "fatherName": "آيهان",
    "userPhone": "09360498436",
    "guardianPhone": "09360498436",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09360498436",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743316764",
    "firstName": "ريحانه",
    "lastName": "نباتي",
    "fatherName": "محرم",
    "userPhone": "09050489456",
    "guardianPhone": "09144637341",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09144637341",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743299835",
    "firstName": "سما",
    "lastName": "همتي",
    "fatherName": "رضا",
    "userPhone": "09374585311",
    "guardianPhone": "09300326742",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09300326742",
    "guardianPhone2": "09148541986"
  },
  {
    "nationalCode": "2743246693",
    "firstName": "ستايش",
    "lastName": "آهمند",
    "fatherName": "احمد",
    "userPhone": "09376832124",
    "guardianPhone": "09058842405",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09058842405",
    "guardianPhone2": "09149434639"
  },
  {
    "nationalCode": "2900619734",
    "firstName": "ريحانه",
    "lastName": "پورآذري",
    "fatherName": "واحد",
    "userPhone": "09903012580",
    "guardianPhone": "09903012580",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09903012580",
    "guardianPhone2": "09144494220"
  },
  {
    "nationalCode": "2743213061",
    "firstName": "سولماز",
    "lastName": "تقي زاده",
    "fatherName": "سيفعلي",
    "userPhone": "09038538638",
    "guardianPhone": "09142089394",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09142089394",
    "guardianPhone2": "09148161595"
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
    "fieldCode": "72320",
    "guardianPhone1": "09038734104",
    "guardianPhone2": "09135276168"
  },
  {
    "nationalCode": "2743149221",
    "firstName": "هستي",
    "lastName": "شجاع دل",
    "fatherName": "نادر",
    "userPhone": "09339888624",
    "guardianPhone": "09373574212",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09373574212",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743192720",
    "firstName": "سيده نازنين",
    "lastName": "عارف زاده",
    "fatherName": "سيدجعفر",
    "userPhone": "09148710288",
    "guardianPhone": "09144401190",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09144401190",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743184558",
    "firstName": "مائده",
    "lastName": "علي بگلوئي",
    "fatherName": "رامين",
    "userPhone": "09390344341",
    "guardianPhone": "09354766923",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09354766923",
    "guardianPhone2": "09144838388"
  },
  {
    "nationalCode": "2743283599",
    "firstName": "رزا",
    "lastName": "غفارنژادثاني",
    "fatherName": "كاوس",
    "userPhone": "09944418005",
    "guardianPhone": "09149703016",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09149703016",
    "guardianPhone2": "09147224073"
  },
  {
    "nationalCode": "2743255341",
    "firstName": "مليكا",
    "lastName": "قره نقدهي",
    "fatherName": "ناصر",
    "userPhone": "09058508116",
    "guardianPhone": "09147163102",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09147163102",
    "guardianPhone2": "09145078195"
  },
  {
    "nationalCode": "2743200952",
    "firstName": "زهرا",
    "lastName": "كاويد",
    "fatherName": "جواد",
    "userPhone": "09002743200",
    "guardianPhone": "09104413558",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09104413558",
    "guardianPhone2": "09148113002"
  },
  {
    "nationalCode": "2743236116",
    "firstName": "سلوي سادات",
    "lastName": "اكبري كافي",
    "fatherName": "سيدمحمد",
    "userPhone": "09056436116",
    "guardianPhone": "09055906252",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09055906252",
    "guardianPhone2": "09143839575"
  },
  {
    "nationalCode": "2743161973",
    "firstName": "فاطمه",
    "lastName": "اميري چلانسفلي",
    "fatherName": "سعيد",
    "userPhone": "09148778419",
    "guardianPhone": "09149226189",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09149226189",
    "guardianPhone2": "09911547232"
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
    "fieldCode": "21110",
    "guardianPhone1": "09043026594",
    "guardianPhone2": "09144850059"
  },
  {
    "nationalCode": "2743167815",
    "firstName": "الهه",
    "lastName": "رستمي گمچي",
    "fatherName": "جعفر",
    "userPhone": "09366995630",
    "guardianPhone": "09142766001",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09142766001",
    "guardianPhone2": "09143470120"
  },
  {
    "nationalCode": "2840893835",
    "firstName": "محيا",
    "lastName": "رضائي تمر",
    "fatherName": "مهدي",
    "userPhone": "09375800896",
    "guardianPhone": "09146577643",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09146577643",
    "guardianPhone2": "09143400714"
  },
  {
    "nationalCode": "2743282916",
    "firstName": "تارا",
    "lastName": "شجاع حسن آباد",
    "fatherName": "علي",
    "userPhone": "09023271215",
    "guardianPhone": "09141860665",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09141860665",
    "guardianPhone2": "09149701315"
  },
  {
    "nationalCode": "2743255765",
    "firstName": "آيسل",
    "lastName": "كبوكي",
    "fatherName": "امير",
    "userPhone": "09143492484",
    "guardianPhone": "09143492484",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09143492484",
    "guardianPhone2": "09399040579"
  },
  {
    "nationalCode": "2743309512",
    "firstName": "نسا",
    "lastName": "مظلوم تومتري",
    "fatherName": "مسعود",
    "userPhone": "09916179721",
    "guardianPhone": "09399227315",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09399227315",
    "guardianPhone2": "09144479721"
  },
  {
    "nationalCode": "2743191600",
    "firstName": "آرميتا",
    "lastName": "ولي زاده ولنده",
    "fatherName": "حيدر",
    "userPhone": "09911827645",
    "guardianPhone": "09934079949",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "عکاسی",
    "fieldCode": "21110",
    "guardianPhone1": "09934079949",
    "guardianPhone2": "09144486988"
  },
  {
    "nationalCode": "2743268425",
    "firstName": "عسل",
    "lastName": "كشي آده مرتضي پاشا",
    "fatherName": "ايرج",
    "userPhone": "09361419916",
    "guardianPhone": "09028423666",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "معماري داخلي",
    "fieldCode": "73110",
    "guardianPhone1": "09028423666",
    "guardianPhone2": "09143466549"
  },
  {
    "nationalCode": "2743279273",
    "firstName": "يسنا",
    "lastName": "كوكيائي سنگر",
    "fatherName": "احمد",
    "userPhone": "09963517671",
    "guardianPhone": "09963517188",
    "hasRealPhone": true,
    "gradeLevel": "دهم",
    "major": "معماري داخلي",
    "fieldCode": "73110",
    "guardianPhone1": "09963517188",
    "guardianPhone2": "09144414596"
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
    "fieldCode": "73110",
    "guardianPhone1": "09383268066",
    "guardianPhone2": "09338089799"
  },
  {
    "nationalCode": "2743048905",
    "firstName": "نورا",
    "lastName": "آدم عارف",
    "fatherName": "محسن",
    "userPhone": "09302765527",
    "guardianPhone": "09147479044",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09147479044",
    "guardianPhone2": null
  },
  {
    "nationalCode": "4712075643",
    "firstName": "سيما",
    "lastName": "احمدي حقيقت",
    "fatherName": "احمد",
    "userPhone": "09334989891",
    "guardianPhone": "09142634710",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09142634710",
    "guardianPhone2": null
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
    "fieldCode": "68810",
    "guardianPhone1": "09052939535",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743138017",
    "firstName": "مليسا",
    "lastName": "پروين",
    "fatherName": "يوسف",
    "userPhone": "09330148915",
    "guardianPhone": "09145630891",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09145630891",
    "guardianPhone2": "09145083014"
  },
  {
    "nationalCode": "0314453938",
    "firstName": "دنيز",
    "lastName": "جليلي",
    "fatherName": "داود",
    "userPhone": "09308400749",
    "guardianPhone": "0912857633",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "0912857633",
    "guardianPhone2": "09120891994"
  },
  {
    "nationalCode": "2743061774",
    "firstName": "مبينا",
    "lastName": "جوادزاده",
    "fatherName": "مجيد",
    "userPhone": "09031824420",
    "guardianPhone": "09148534605",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09148534605",
    "guardianPhone2": "09143899413"
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
    "fieldCode": "68810",
    "guardianPhone1": "09146768353",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743095040",
    "firstName": "فاطمه",
    "lastName": "حبيبي",
    "fatherName": "بهنام",
    "userPhone": "09146057191",
    "guardianPhone": "09146057191",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09146057191",
    "guardianPhone2": "09141407191"
  },
  {
    "nationalCode": "2743025001",
    "firstName": "راشين",
    "lastName": "فتاحياني",
    "fatherName": "رضا",
    "userPhone": "09904793150",
    "guardianPhone": "09141463150",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09141463150",
    "guardianPhone2": "09144454174"
  },
  {
    "nationalCode": "2743082755",
    "firstName": "شكيلا",
    "lastName": "محمدزاده كله رش",
    "fatherName": "امير",
    "userPhone": "09059198317",
    "guardianPhone": "09142699578",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09142699578",
    "guardianPhone2": "09145608317"
  },
  {
    "nationalCode": "2743137339",
    "firstName": "باران",
    "lastName": "مردوخي",
    "fatherName": "شهرام",
    "userPhone": "09352128313",
    "guardianPhone": "09141478313",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "شبكه و نرم‌افزار رايانه",
    "fieldCode": "68810",
    "guardianPhone1": "09141478313",
    "guardianPhone2": "09143472279"
  },
  {
    "nationalCode": "2743133211",
    "firstName": "اسنا",
    "lastName": "احمدزاده بالدرلو",
    "fatherName": "اسماعيل",
    "userPhone": "09145871943",
    "guardianPhone": "09148337415",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09148337415",
    "guardianPhone2": "09143881719"
  },
  {
    "nationalCode": "2743130806",
    "firstName": "حديث",
    "lastName": "پولادزاده",
    "fatherName": "رامين",
    "userPhone": "09935972605",
    "guardianPhone": "09929417795",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09929417795",
    "guardianPhone2": "09935972605"
  },
  {
    "nationalCode": "2742993371",
    "firstName": "مهسا",
    "lastName": "تمرزاده بستك آباد",
    "fatherName": "اسگندر",
    "userPhone": "09046159469",
    "guardianPhone": "09399981551",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09399981551",
    "guardianPhone2": "09149686793"
  },
  {
    "nationalCode": "2742897852",
    "firstName": "اسرا",
    "lastName": "جعفرزاده چونقرالو",
    "fatherName": "عباس",
    "userPhone": "09146080512",
    "guardianPhone": "09395838722",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09395838722",
    "guardianPhone2": "09143896441"
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
    "fieldCode": "72320",
    "guardianPhone1": "09223754528",
    "guardianPhone2": null
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
    "fieldCode": "72320",
    "guardianPhone1": "09143892982",
    "guardianPhone2": null
  },
  {
    "nationalCode": "2743103744",
    "firstName": "آتنا",
    "lastName": "سقاتپه",
    "fatherName": "عليرضا",
    "userPhone": "09365579842",
    "guardianPhone": "09146319842",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09146319842",
    "guardianPhone2": "09141469842"
  },
  {
    "nationalCode": "2743136707",
    "firstName": "اسما",
    "lastName": "سيدخاني شنگي",
    "fatherName": "اكبر",
    "userPhone": "09391496151",
    "guardianPhone": "09020644151",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09020644151",
    "guardianPhone2": "09143411092"
  },
  {
    "nationalCode": "2743152575",
    "firstName": "هستي",
    "lastName": "مبين فر",
    "fatherName": "داريوش",
    "userPhone": "09373770841",
    "guardianPhone": "09393214768",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09393214768",
    "guardianPhone2": "09143407311"
  },
  {
    "nationalCode": "2743022884",
    "firstName": "آيسا",
    "lastName": "مهري",
    "fatherName": "عيسي",
    "userPhone": "09936381585",
    "guardianPhone": "09145150285",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09145150285",
    "guardianPhone2": "09144937516"
  },
  {
    "nationalCode": "2743089237",
    "firstName": "رها",
    "lastName": "نوبخت",
    "fatherName": "اكبر",
    "userPhone": "09055772629",
    "guardianPhone": "09144434727",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09144434727",
    "guardianPhone2": "09141452732"
  },
  {
    "nationalCode": "2743014865",
    "firstName": "سوگل",
    "lastName": "نوري كوجان",
    "fatherName": "آرش",
    "userPhone": "09907431849",
    "guardianPhone": "09147148078",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09147148078",
    "guardianPhone2": "09143451849"
  },
  {
    "nationalCode": "2742925112",
    "firstName": "سوين",
    "lastName": "وحيدي",
    "fatherName": "اميد",
    "userPhone": "09146106901",
    "guardianPhone": "09142012138",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "طراحي و دوخت",
    "fieldCode": "72320",
    "guardianPhone1": "09142012138",
    "guardianPhone2": "09148622138"
  },
  {
    "nationalCode": "2742905472",
    "firstName": "النا",
    "lastName": "اماني دولاما",
    "fatherName": "وحيد",
    "userPhone": "09390766079",
    "guardianPhone": "09907343853",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820",
    "guardianPhone1": "09907343853",
    "guardianPhone2": "09145603859"
  },
  {
    "nationalCode": "2742833889",
    "firstName": "ساغر",
    "lastName": "حسيني",
    "fatherName": "مهدي",
    "userPhone": "09353936431",
    "guardianPhone": "09335260108",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820",
    "guardianPhone1": "09335260108",
    "guardianPhone2": "09144481131"
  },
  {
    "nationalCode": "2743033150",
    "firstName": "ثنا",
    "lastName": "رضائي",
    "fatherName": "محمدرضا",
    "userPhone": "09331640950",
    "guardianPhone": "09918500634",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820",
    "guardianPhone1": "09918500634",
    "guardianPhone2": "09146057991"
  },
  {
    "nationalCode": "2743084588",
    "firstName": "آتنا",
    "lastName": "ژاله كريمي",
    "fatherName": "مهدي",
    "userPhone": "09039429237",
    "guardianPhone": "09915335495",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820",
    "guardianPhone1": "09915335495",
    "guardianPhone2": "09143895495"
  },
  {
    "nationalCode": "2743146877",
    "firstName": "آيتن",
    "lastName": "فيروزي خانشان",
    "fatherName": "سعيد",
    "userPhone": "09149509593",
    "guardianPhone": "09144831083",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820",
    "guardianPhone1": "09144831083",
    "guardianPhone2": "09142617008"
  },
  {
    "nationalCode": "1364998920",
    "firstName": "آتنا",
    "lastName": "قائمي",
    "fatherName": "حسين",
    "userPhone": "09337268448",
    "guardianPhone": "09370597288",
    "hasRealPhone": true,
    "gradeLevel": "یازدهم",
    "major": "فتو-گرافيك",
    "fieldCode": "28820",
    "guardianPhone1": "09370597288",
    "guardianPhone2": "09141095436"
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

  // ۲.۵ ایجاد معاون مدرسه (جهت لاگین و تست چیدمان برنامه هفتگی)
  const deputyUser = await prisma.user.upsert({
    where: { phoneNumber: "09122220001" },
    create: {
      phoneNumber: "09122220001",
      nationalCode: "0022220001",
      firstName: "مریم",
      lastName: "محمدی (معاون)",
    },
    update: {
      firstName: "مریم",
      lastName: "محمدی (معاون)",
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
  console.log(`✅ معاون مدرسه ثبت شد: مریم محمدی (شماره: ${deputyUser.phoneNumber} | کد ملی: ${deputyUser.nationalCode})`);

  // ۲.۶ ایجاد معلمان نمونه
  const teachersData = [
    { phone: "09123330001", nationalCode: "0033330001", firstName: "علی", lastName: "احمدی (دبیر تاریخ/عمومی)" },
    { phone: "09123330002", nationalCode: "0033330002", firstName: "زهرا", lastName: "کریمی (دبیر ادبیات)" },
    { phone: "09123330003", nationalCode: "0033330003", firstName: "حسین", lastName: "رضایی (دبیر تخصصی)" },
  ];

  for (const t of teachersData) {
    const tUser = await prisma.user.upsert({
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
      where: { schoolId_userId: { schoolId: school.id, userId: tUser.id } },
      create: {
        schoolId: school.id,
        userId: tUser.id,
        role: StaffRole.TEACHER,
      },
      update: { role: StaffRole.TEACHER },
    });
  }
  console.log(`✅ معلمان مدرسه ثبت شدند.`);

  // ۲.۷ ایجاد زنگ‌های کلاسی (Bell Schedules)
  const bellsData = [
    { title: "زنگ اول", startTime: "07:30", endTime: "09:00" },
    { title: "زنگ دوم", startTime: "09:15", endTime: "10:45" },
    { title: "زنگ سوم", startTime: "11:00", endTime: "12:30" },
    { title: "زنگ چهارم", startTime: "12:45", endTime: "14:15" },
  ];

  for (const b of bellsData) {
    const existingBell = await prisma.bellSchedule.findFirst({
      where: { schoolId: school.id, title: b.title },
    });
    if (!existingBell) {
      await prisma.bellSchedule.create({
        data: {
          schoolId: school.id,
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
        },
      });
    }
  }
  console.log(`✅ زنگ‌های کلاسی ثبت شدند.`);

  // ۲.۸ ایجاد دروس عمومی و تخصصی (Subjects)
  const subjectsData = [
    "تاریخ",
    "زبان و ادبیات فارسی",
    "زبان انگلیسی",
    "دین و زندگی",
    "کارگاه طراحی و دوخت",
    "کارگاه شبکه و نرم‌افزار",
    "مبانی عکاسی دیجیتال",
    "تربیت بدنی",
  ];

  for (const sTitle of subjectsData) {
    const existingSubject = await prisma.subject.findFirst({
      where: { schoolId: school.id, title: sTitle },
    });
    if (!existingSubject) {
      await prisma.subject.create({
        data: {
          schoolId: school.id,
          title: sTitle,
        },
      });
    }
  }
  console.log(`✅ دروس پایه و عمومی ثبت شدند.`);

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
          guardianPhone1: st.guardianPhone1 || st.guardianPhone,
          guardianPhone2: st.guardianPhone2 || null,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    } else {
      await prisma.schoolEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          classRoomId: classRoomId,
          academicYear: "1403-1404",
          guardianPhone1: st.guardianPhone1 || st.guardianPhone,
          guardianPhone2: st.guardianPhone2 || null,
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
