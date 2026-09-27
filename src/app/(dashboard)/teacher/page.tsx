import { WelcomeCard } from "@/components/dashboard/welcome-card";

export const metadata = { title: "داشبورد معلم | سامیک" };

export default function TeacherDashboard() {
  return (
    <WelcomeCard
      role="TEACHER"
      roleLabel="معلم"
      schoolName="مدرسه شما"
      features={[
        {
          title: "کلاس فعلی",
          description: "Hero Card با تشخیص هفته زوج/فرد و زنگ جاری.",
          status: "soon",
        },
        {
          title: "ثبت حضور و غیاب",
          description: "Toggle iOS با پیش‌فرض حاضر + Commit Button.",
          status: "soon",
        },
        {
          title: "دفتر نمره هوشمند",
          description: "Data-Grid ماتریسی با میانگین ۳۰ روزه.",
          status: "soon",
        },
        {
          title: "ثبت سریع امتیاز +/-",
          description: "دکمه‌های quick action با long-press tag.",
          status: "soon",
        },
        {
          title: "پشتیبانی آفلاین (PWA)",
          description: "IndexedDB + Background Sync + Idempotency Key.",
          status: "soon",
        },
      ]}
    />
  );
}
