import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "مدیریت دانش‌آموزان | سامیک" };

export default function PrincipalStudentsPage() {
  return <SchoolDetailsManager isPrincipal={true} defaultTab="students" />;
}
