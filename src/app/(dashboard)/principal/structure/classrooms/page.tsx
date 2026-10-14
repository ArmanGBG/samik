import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "مدیریت کلاس‌ها | سامیک" };

export default function ClassRoomsPage() {
  return <SchoolDetailsManager isPrincipal={true} defaultTab="classrooms" />;
}
