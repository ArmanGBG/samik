import { SchoolDetailsManager } from "@/components/dashboard/school-details-manager";

export const metadata = { title: "مدیریت مدرسه | سامیک" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SchoolDetailsPage({ params }: PageProps) {
  const { id } = await params;
  return <SchoolDetailsManager schoolId={id} />;
}
