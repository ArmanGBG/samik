import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "برنامه هفتگی | سامیک" };

export default function PrincipalTimetablePage() {
  return <SchoolDetailsManager isPrincipal={true} defaultTab="timetable" defaultSubTab="builder" />;
}
