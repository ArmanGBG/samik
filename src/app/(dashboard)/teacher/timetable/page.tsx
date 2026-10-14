import { TeacherWeeklyTimetable } from "@/components/dashboard/teacher-weekly-timetable";

export const metadata = { title: "برنامه هفتگی من | سامیک" };

export default function TeacherTimetablePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <TeacherWeeklyTimetable />
    </div>
  );
}
