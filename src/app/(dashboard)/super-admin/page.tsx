import { WelcomeCard } from "@/components/dashboard/welcome-card";

export const metadata = { title: "داشبورد مدیر سامانه | سامیک" };

export default function SuperAdminDashboard() {
  return (
    <WelcomeCard
      role="SUPER_ADMIN"
      roleLabel="مدیر سامانه"
      schoolName="پلتفرم سامیک"
      features={[
        {
          title: "آنبوردینگ مدرسه جدید",
          description: "ثبت مدرسه جدید، تخصیص زیردامنه و لایسنس اولیه.",
          status: "ready",
        },
        {
          title: "لیست مدارس",
          description: "مشاهده، فیلتر و مدیریت تمام مدارس روی پلتفرم.",
          status: "ready",
        },
        {
          title: "آمار کلان پلتفرم",
          description: "تعداد مدارس فعال، کاربران و تراکنش‌های روزانه.",
          status: "soon",
        },
        {
          title: "لاگ‌های ممیزی",
          description: "مشاهده رویدادهای امنیتی و تغییرات حساس.",
          status: "soon",
        },
      ]}
    />
  );
}
