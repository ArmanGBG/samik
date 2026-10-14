import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "مدیریت دروس | سامیک" };

export default function SubjectsPage() {
  return <SchoolDetailsManager isPrincipal={true} defaultTab="timetable" defaultSubTab="subjects" />;
}
