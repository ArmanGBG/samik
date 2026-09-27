import { GradebookGrid } from "@/components/teacher/gradebook-grid";
import { use } from "react";

export const metadata = { title: "دفتر نمره | سامیک" };

export default function GradebookPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  return <GradebookGrid classId={classId} />;
}
