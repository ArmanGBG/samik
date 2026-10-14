import { db } from "@/lib/db";

/**
 * The unit of independence for a lesson is `(classRoom, subject)`.
 *
 * A teacher may legitimately teach the same subject to several classes, and
 * the same class may have several subjects — but a row that belongs to a
 * lesson must always be provably attached to that lesson's subject. Teachers
 * writing assessments or behavioural points therefore have to prove ownership
 * of the pair, not just of the class.
 */
export type SubjectOwnership = { ok: true } | { ok: false; reason: string };

/**
 * Verifies the teacher actually teaches `subjectId` to `classRoomId`.
 *
 * Checks the weekly timetable for an active slot, plus any one-off
 * SINGLE_SESSION slot for that subject, so a teacher running a single
 * special session can still register activity for it.
 */
export async function teacherOwnsSubjectForClass(
  teacherUserId: string,
  classRoomId: string,
  subjectId: string
): Promise<SubjectOwnership> {
  const slot = await db.timetableSlot.findFirst({
    where: { teacherUserId, classRoomId, subjectId },
    select: { id: true },
  });

  if (slot) return { ok: true };

  return {
    ok: false,
    reason: "این درس در برنامهٔ هفتگی شما برای این کلاس تعریف نشده است.",
  };
}
