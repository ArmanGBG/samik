import { redirect } from "next/navigation";

export const metadata = { title: "داشبورد ناظم | سامیک" };

/**
 * Deputy landing — redirect to the primary workspace (Live Attendance
 * dashboard). Per the UI/UX Pro Max redesign brief, the deputy's primary
 * workspace is the live attendance command-center; the welcome card is
 * retired in favor of an immediate redirect.
 */
export default function DeputyDashboard() {
  redirect("/deputy/live-attendance");
}
