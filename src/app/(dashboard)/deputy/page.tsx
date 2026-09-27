import { WelcomeCard } from "@/components/dashboard/welcome-card";

export const metadata = { title: "داشبورد ناظم | سامیک" };

export default function DeputyDashboard() {
  return (
    <WelcomeCard
      role="DEPUTY"
      roleLabel="ناظم / معاون"
      schoolName="مدرسه شما"
      features={[
        {
          title: "برنامه هفتگی",
          description: "ساخت و ویرایش تقویم هفتگی با Drag & Drop.",
          status: "soon",
        },
        {
          title: "مانیتورینگ زنده حضور و غیاب",
          description: "داشبورد Command Center با اتصال SSE.",
          status: "soon",
        },
        {
          title: "کارتابل پیامک",
          description: "تأیید و ارسال گروهی پیامک غیبت به اولیا.",
          status: "soon",
        },
      ]}
    />
  );
}
