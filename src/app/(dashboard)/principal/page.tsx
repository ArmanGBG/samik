import { WelcomeCard } from "@/components/dashboard/welcome-card";

export const metadata = { title: "داشبورد مدیر مدرسه | سامیک" };

export default function PrincipalDashboard() {
  return (
    <WelcomeCard
      role="PRINCIPAL"
      roleLabel="مدیر مدرسه"
      schoolName="مدرسه شما"
      features={[
        {
          title: "تعریف ساختار مدرسه",
          description: "پایه‌ها، کلاس‌ها، دروس و زنگ‌های مدرسه.",
          status: "soon",
        },
        {
          title: "مدیریت پرسنل",
          description: "دعوت ناظم و معلمان، تخصیص نقش.",
          status: "soon",
        },
        {
          title: "ثبت‌نام دانش‌آموزان",
          description: "ثبت‌نام فردی یا گروهی (Excel) با کد ملی.",
          status: "soon",
        },
        {
          title: "ارتقای سال تحصیلی",
          description: "Promotion دسته‌ای پایه‌ها در پایان سال.",
          status: "soon",
        },
        {
          title: "گزارش‌گیری کلان",
          description: "داشبورد KPI و گزارش عملکرد مدرسه.",
          status: "soon",
        },
      ]}
    />
  );
}
