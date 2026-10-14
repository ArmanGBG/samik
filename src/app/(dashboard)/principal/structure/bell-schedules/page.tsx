import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "مدیریت زنگ‌ها | سامیک" };

export default function BellSchedulesPage() {
  return <SchoolDetailsManager isPrincipal={true} defaultTab="timetable" defaultSubTab="bells" />;
}
