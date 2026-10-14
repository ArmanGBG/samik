import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "مدیریت کادر و پرسنل | سامیک" };

export default function PrincipalStaffPage() {
  return <SchoolDetailsManager isPrincipal={true} defaultTab="staff" />;
}
