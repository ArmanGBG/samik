import { WelcomeCard } from "@/components/dashboard/welcome-card";

export const metadata = { title: "داشبورد دانش‌آموز / ولی | سامیک" };

export default function StudentDashboard() {
  return (
    <WelcomeCard
      role="STUDENT"
      roleLabel="دانش‌آموز / ولی"
      schoolName="مدرسه شما"
      features={[
        {
          title: "کارنامه آنلاین",
          description: "نمودار روند پیشرفت نمرات عددی.",
          status: "soon",
        },
        {
          title: "سوابق حضور و غیاب",
          description: "تاریخچه کامل با فیلتر سال تحصیلی.",
          status: "soon",
        },
        {
          title: "امتیازات انضباطی",
          description: "کانتر مثبت/منفی در بالای پروفایل.",
          status: "soon",
        },
      ]}
    />
  );
}
