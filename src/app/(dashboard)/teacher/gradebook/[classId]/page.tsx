import { GradebookGrid } from "@/components/teacher/gradebook-grid";
import { redirect } from "next/navigation";
import { use } from "react";

export const metadata = { title: "دفتر نمره | سامیک" };
export const dynamic = "force-dynamic";

export default function GradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { classId } = use(params);
  const { subjectId } = use(searchParams);

  // The gradebook is scoped to one lesson, so a class alone is not enough.
  // Send the teacher to the class+subject picker rather than guessing.
  if (!subjectId) redirect("/teacher/gradebook");

  return <GradebookGrid classId={classId} subjectId={subjectId} />;
}
