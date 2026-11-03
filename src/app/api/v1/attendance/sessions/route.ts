// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { withIdempotency } from "@/lib/idempotency/store";
import { emitAttendanceSubmitted } from "@/lib/realtime/event-bus";
import { IDEMPOTENCY_HEADER } from "@/lib/auth/jwt";
import { toPersianDate } from "@/lib/date-utils";
import { tehranDateKey } from "@/lib/timetable/tehran-time";

const SubmitBody = z.object({
  timetableSlotId: z.string().uuid(),
  /** ISO date string for the session date (e.g. "2026-09-27"). */
  date: z.string().date(),
  /** Array of student UUIDs marked ABSENT. */
  absentees: z.array(z.string().uuid()).default([]),
  /**
   * Accepted for forward-compatibility with the attendance toggle. The
   * `AttendanceStatus` enum is currently PRESENT/ABSENT only, so these are
   * validated against the roster and then ignored when deriving status.
   *
   * They MUST be declared here: an undeclared key is stripped by zod, so
   * spreading the parsed result threw `undefined is not iterable` and every
   * submission returned 500.
   */
  latecomers: z.array(z.string().uuid()).default([]),
  excused: z.array(z.string().uuid()).default([]),
});

/**
 * POST /api/v1/attendance/sessions
 *
 * Submit the teacher's roll-call. Per Section 6 of the architecture doc:
 *
 *   1. **Batch Insert**: all AttendanceRecords are created in a single
 *      `db.$transaction` along with the ClassSession. If ANY record fails,
 *      the whole transaction rolls back — no partial state.
 *
 *   2. **Idempotency**: if the teacher presses "Commit" twice (due to slow
 *      network or background sync retrying), the same X-Idempotency-Key
 *      ensures only ONE transaction runs. Subsequent requests return the
 *      cached successful response.
 *
 *   3. **Event emission**: on successful commit, emits an
 *      `attendance:submitted` event to the SSE bus, which pushes to all
 *      connected deputy dashboards in the same school.
 *
 *   4. **Default PRESENT**: per Section 6 — "پیش‌فرض حاضر بودن همه":
 *      students not in absentees/latecomers/excused are marked PRESENT.
 *      The client doesn't send PRESENT students explicitly — the server
 *      derives them from the classroom's active enrollment list.
 */
export async function POST(req: NextRequest) {
  // Extract idempotency key from header BEFORE entering tenant context
  // (so the cache lookup happens before any DB work).
  const idempotencyKey = req.headers.get(IDEMPOTENCY_HEADER);

  return withIdempotency(idempotencyKey, async () => {
    return withTenantContext(req, ["TEACHER"], async (ctx) => {
    let body: z.infer<typeof SubmitBody>;
    try {
      body = SubmitBody.parse(await req.json());
    } catch (e) {
      return {
        status: 400,
        body: {
          ok: false,
          error: (e as z.ZodError).issues?.[0]?.message ?? "ورودی نامعتبر",
        },
      };
    }

    // Resolved once and reused for the "is this today?" check, the session
    // date, and the notification timestamp.
    const now = new Date();

      try {
        // Validate the timetable slot exists + belongs to this teacher
        const slot = await db.timetableSlot.findFirst({
          where: {
            id: body.timetableSlotId,
            teacherUserId: ctx.userId,
          },
          include: {
            classRoom: { select: { id: true, name: true, gradeLevel: true } },
            subject: { select: { id: true, title: true } },
            bellSchedule: { select: { id: true, title: true, startTime: true, endTime: true } },
            teacher: { select: { firstName: true, lastName: true } },
          },
        });
      if (!slot) {
        return {
          status: 404,
          body: {
            ok: false,
            error: "خانه برنامه هفتگی یافت نشد یا متعلق به شما نیست.",
          },
        };
      }

      // Validate the date matches today (prevent backdating for now).
      // The client sends the school-local (Tehran) date, so compare against
      // the Tehran calendar day. Using the UTC date here rejected every
      // submission between 20:30 and 24:00 UTC (i.e. 00:00-03:30 Tehran).
      if (body.date !== tehranDateKey(now)) {
        return {
          status: 400,
          body: {
            ok: false,
            error: "ثبت حضور و غیاب فقط برای امروز مجاز است.",
          },
        };
      }

      // Find merged peer slots if slot belongs to a merged group
      const targetSlots = slot.mergedGroupId
        ? await db.timetableSlot.findMany({
            where: {
              mergedGroupId: slot.mergedGroupId,
              schoolId: ctx.schoolId,
            },
            include: {
              classRoom: { select: { id: true, name: true, gradeLevel: true } },
            },
          })
        : [slot];

      const targetClassroomIds = targetSlots.map((s) => s.classRoomId);

      // Get all active students in the target classroom(s)
      const enrollments = await db.schoolEnrollment.findMany({
        where: {
          classRoomId: { in: targetClassroomIds },
          status: "ACTIVE",
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Build the attendance records: default PRESENT, override with provided arrays
      const absenteeSet = new Set(body.absentees);

      // Validate all student IDs are actually enrolled in this classroom / merged classrooms
      const enrolledIds = new Set(enrollments.map((e) => e.student.id));
      const invalidIds = [
        ...body.absentees,
        ...body.latecomers,
        ...body.excused,
      ].filter((id) => !enrolledIds.has(id));
      if (invalidIds.length > 0) {
        return {
          status: 400,
          body: {
            ok: false,
            error: "برخی از دانش‌آموزان در این کلاس ثبت‌نام نشده‌اند.",
            invalidIds,
          },
        };
      }

      const recordsToCreate = enrollments.map((e) => {
        const sid = e.student.id;
        let status: "PRESENT" | "ABSENT" = "PRESENT";
        if (absenteeSet.has(sid)) status = "ABSENT";
        return {
          studentUserId: sid,
          classRoomId: e.classRoomId,
          status,
          studentName: `${e.student.firstName} ${e.student.lastName}`,
          // For NotificationOutbox draft generation:
          enrollmentId: e.id,
          guardianPhone: e.guardianPhone1,
          studentFirstName: e.student.firstName,
          studentLastName: e.student.lastName,
        };
      });

      // Stored as UTC midnight, matching /api/v1/teacher/session/[slotId],
      // so the @@unique([timetableSlotId, date]) constraint can't produce two
      // sessions for one school day. Both "today" readers (active classes,
      // gradebook) span the whole Tehran day, which contains this instant.
      const sessionDate = new Date(body.date + "T00:00:00Z");

      // === Atomic Transaction ===
      const result = await db.$transaction(async (tx) => {
        // For each target slot (main slot or peers in merged group), upsert the ClassSession
        // and insert the respective attendance records.
        const createdSessions = [];

        for (const tSlot of targetSlots) {
          const session = await tx.classSession.upsert({
            where: {
              timetableSlotId_date: {
                timetableSlotId: tSlot.id,
                date: sessionDate,
              },
            },
            create: {
              schoolId: ctx.schoolId,
              timetableSlotId: tSlot.id,
              date: sessionDate,
              status: "SUBMITTED",
              submittedAt: new Date(),
            },
            update: {
              status: "SUBMITTED",
              submittedAt: new Date(),
            },
          });
          createdSessions.push(session);

          // Delete existing attendance records for this session
          await tx.attendanceRecord.deleteMany({
            where: { classSessionId: session.id },
          });

          // Filter records belonging to this slot's classroom
          const slotRecords = recordsToCreate.filter(
            (r) => r.classRoomId === tSlot.classRoomId
          );

          if (slotRecords.length > 0) {
            await tx.attendanceRecord.createMany({
              data: slotRecords.map((r) => ({
                schoolId: ctx.schoolId,
                classSessionId: session.id,
                studentUserId: r.studentUserId,
                status: r.status,
              })),
            });
          }
        }

        const session = createdSessions[0];

        // === NotificationOutbox Draft Generation (Section 8 + Phase 5.1) ===
        // For each ABSENT student, create a DRAFT notification to their
        // guardian. We store BOTH:
        //   - `messageBody`: a human-readable Persian string (for the
        //     deputy's outbox UI display + editing).
        //   - `metadataJson`: structured JSON with the 4 pattern variables
        //     (studentName, date, subject, schoolName) so the background
        //     send-bulk job can call `sendAbsenceAlert()` without re-fetching.
        //
        // We also delete any existing DRAFT notifications for this
        // session+student pair to avoid duplicates on re-submit.
        const absenteesWithPhone = recordsToCreate.filter(
          (r) => r.status === "ABSENT" && r.guardianPhone
        );

        const todayFa = toPersianDate(new Date());

        // Clean up old drafts for this specific session/subject only (in case of re-submission).
        // Does NOT wipe out drafts from earlier bells or other subjects!
        const candidateDrafts = await tx.notificationOutbox.findMany({
          where: {
            schoolId: ctx.schoolId,
            status: "DRAFT",
            eventType: "ABSENCE",
            studentUserId: { in: recordsToCreate.map((r) => r.studentUserId) },
          },
          select: { id: true, metadataJson: true, messageBody: true },
        });

        const draftsToDelete = candidateDrafts.filter((d) => {
          if (d.metadataJson) {
            try {
              const meta = JSON.parse(d.metadataJson);
              if (meta.classSessionId && meta.classSessionId === session.id) return true;
              if (meta.timetableSlotId && meta.timetableSlotId === slot.id) return true;
              if (meta.subject === slot.subject.title && meta.date === todayFa) return true;
            } catch {}
          }
          return d.messageBody.includes(slot.subject.title);
        });

        if (draftsToDelete.length > 0) {
          await tx.notificationOutbox.deleteMany({
            where: { id: { in: draftsToDelete.map((d) => d.id) } },
          });
        }

        if (absenteesWithPhone.length > 0) {
          // Fetch school name for the metadata (needed by the pattern API).
          // This is a small query inside the transaction — acceptable cost.
          const schoolInfo = await tx.school.findUnique({
            where: { id: ctx.schoolId },
            select: { name: true },
          });
          const schoolName = schoolInfo?.name ?? "";

          await tx.notificationOutbox.createMany({
            data: absenteesWithPhone.map((r) => {
              const studentName = `${r.studentFirstName} ${r.studentLastName}`;
              return {
                schoolId: ctx.schoolId,
                studentUserId: r.studentUserId,
                recipientPhone: r.guardianPhone!,
                eventType: "ABSENCE",
                messageBody: `ولی محترم، فرزند شما ${studentName} امروز (${todayFa}) در کلاس ${slot.subject.title} غیبت داشت.`,
                // Structured metadata for the Arta Payamak pattern API:
                //   text = "studentName;date;subject;schoolName"
                metadataJson: JSON.stringify({
                  studentName,
                  date: todayFa,
                  subject: slot.subject.title,
                  schoolName,
                  timetableSlotId: slot.id,
                  classSessionId: session.id,
                }),
                status: "DRAFT",
              };
            }),
          });
        }

        return { session, draftCount: absenteesWithPhone.length };
      });

      // === Emit SSE event ===
      // Per Section 6 + Section 10 — push the result to deputy dashboards.
      const absentees = recordsToCreate
        .filter((r) => r.status === "ABSENT")
        .map((r) => ({
          studentId: r.studentUserId,
          studentName: r.studentName,
          guardianPhone: r.guardianPhone ?? undefined,
          status: r.status as "ABSENT",
        }));

      emitAttendanceSubmitted({
        schoolId: ctx.schoolId,
        classSessionId: result.session.id,
        timetableSlotId: body.timetableSlotId,
        date: body.date,
        classroomName: `${slot.classRoom.gradeLevel} ${slot.classRoom.name}`,
        subjectTitle: slot.subject.title,
        teacherName: slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : "",
        submittedAt: new Date().toISOString(),
        absentees,
      });

        return {
          status: 201,
          body: {
            ok: true,
            session: {
              id: result.session.id,
              status: result.session.status,
              submittedAt: result.session.submittedAt,
            },
            stats: {
              total: recordsToCreate.length,
              present: recordsToCreate.filter((r) => r.status === "PRESENT").length,
              absent: recordsToCreate.filter((r) => r.status === "ABSENT").length,
              
              notificationDrafts: result.draftCount,
            },
          },
        };
      } catch (err) {
        console.error("[ATTENDANCE_SESSION_ERROR]", err);
        return {
          status: 500,
          body: { ok: false, error: "خطا در پردازش و ذخیره حضور و غیاب." },
        };
      }
    });
  }).then((res: any) => {
    if (res instanceof NextResponse) return res;
    if (res && typeof res.status === "number" && "body" in res) {
      return NextResponse.json(res.body, { status: res.status });
    }
    return NextResponse.json(res);
  });
}
