import { SuperAdminClassroomDetails } from "@/components/dashboard/super-admin-classroom-details";

export const metadata = { title: "مدیریت کلاس و دانش‌آموزان | سامیک" };

interface PageProps {
  params: Promise<{
    id: string;
    classroomId: string;
  }>;
}

export default async function ClassroomDetailsPage({ params }: PageProps) {
  const { id, classroomId } = await params;
  return <SuperAdminClassroomDetails schoolId={id} classroomId={classroomId} />;
}
