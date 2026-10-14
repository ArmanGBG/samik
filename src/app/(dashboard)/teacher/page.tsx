import { TeacherCurrentSession } from "@/components/dashboard/teacher-current-session";

export const metadata = { title: "داشبورد معلم | سامیک" };

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <TeacherCurrentSession />
      </div>
  );
}
