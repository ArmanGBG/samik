import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAcademyContext } from "@/lib/middleware-helpers/academy-guard";
import { db } from "@/lib/db";

const SaveAttendanceBody = z.object({
  sessionId: z.string().uuid("شناسه جلسه نامعتبر است."),
  records: z.array(
    z.object({
      studentUserId: z.string().uuid(),
      status: z.enum(["PRESENT", "ABSENT", "LATE"]),
      assignmentDone: z.boolean().default(true),
    })
  ),
});

/**
 * GET /api/v1/academy/attendance?sessionId=...
 *
 * Retrieves the attendance sheet for a specific academy session.
 */
export async function GET(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT"],
    async (ctx) => {
      const { searchParams } = new URL(req.url);
      const sessionId = searchParams.get("sessionId");

      if (!sessionId) {
        return NextResponse.json(
          { ok: false, error: "پارامتر sessionId الزامی است." },
          { status: 400 }
        );
      }

      try {
        const session = await db.academySession.findUnique({
          where: { id: sessionId },
          include: {
            class: {
              include: {
                teacherUser: {
                  select: { id: true, firstName: true, lastName: true },
                },
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: {
                    studentUser: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phoneNumber: true,
                        nationalCode: true,
                      },
                    },
                  },
                  orderBy: [
                    { studentUser: { lastName: "asc" } },
                    { studentUser: { firstName: "asc" } },
                  ],
                },
              },
            },
            attendances: true,
          },
        });

        if (!session || session.class.academyId !== ctx.academyId) {
          return NextResponse.json(
            { ok: false, error: "جلسه یافت نشد." },
            { status: 404 }
          );
        }

        // If teacher, verify class assignment
        if (
          ctx.role === "ACADEMY_TEACHER" &&
          session.class.teacherUserId !== ctx.userId
        ) {
          return NextResponse.json(
            { ok: false, error: "شما مدرس این کلاس نیستید." },
            { status: 403 }
          );
        }

        // Rule: Only students who joined on or before this sessionNum are eligible
        const eligibleEnrollments = session.class.enrollments.filter(
          (e) => e.joinedAtSessionNum <= session.sessionNum
        );

        // Map existing attendance records
        const attendanceMap = new Map(
          session.attendances.map((a) => [a.studentUserId, a])
        );

        const roster = eligibleEnrollments.map((e) => {
          const rec = attendanceMap.get(e.studentUserId);
          return {
            studentUserId: e.studentUserId,
            fullName: `${e.studentUser.firstName} ${e.studentUser.lastName}`.trim(),
            phoneNumber: e.studentUser.phoneNumber,
            nationalCode: e.studentUser.nationalCode,
            joinedAtSessionNum: e.joinedAtSessionNum,
            status: rec ? rec.status : "PRESENT",
            assignmentDone: rec ? rec.assignmentDone : true,
          };
        });

        return NextResponse.json({
          ok: true,
          session: {
            id: session.id,
            sessionNum: session.sessionNum,
            name: session.name,
            date: session.date.toISOString(),
            classId: session.class.id,
            className: session.class.name,
            teacherName: session.class.teacherUser
              ? `${session.class.teacherUser.firstName} ${session.class.teacherUser.lastName}`.trim()
              : "تعیین نشده",
          },
          roster,
        });
      } catch (err: any) {
        console.error("[GET_ACADEMY_ATTENDANCE_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در دریافت لیست حضور و غیاب." },
          { status: 500 }
        );
      }
    }
  );
}

/**
 * POST /api/v1/academy/attendance
 *
 * Saves attendance & assignment records for a session in bulk.
 */
export async function POST(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT"],
    async (ctx) => {
      let body: z.infer<typeof SaveAttendanceBody>;
      try {
        body = SaveAttendanceBody.parse(await req.json());
      } catch (e: any) {
        return NextResponse.json(
          { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
          { status: 400 }
        );
      }

      try {
        const session = await db.academySession.findUnique({
          where: { id: body.sessionId },
          include: { class: true },
        });

        if (!session || session.class.academyId !== ctx.academyId) {
          return NextResponse.json(
            { ok: false, error: "جلسه یافت نشد." },
            { status: 404 }
          );
        }

        if (
          ctx.role === "ACADEMY_TEACHER" &&
          session.class.teacherUserId !== ctx.userId
        ) {
          return NextResponse.json(
            { ok: false, error: "شما مدرس این کلاس نیستید." },
            { status: 403 }
          );
        }

        // Upsert all records in a transaction
        await db.$transaction(async (tx) => {
          for (const item of body.records) {
            await tx.academyAttendance.upsert({
              where: {
                sessionId_studentUserId: {
                  sessionId: session.id,
                  studentUserId: item.studentUserId,
                },
              },
              create: {
                sessionId: session.id,
                studentUserId: item.studentUserId,
                status: item.status,
                assignmentDone: item.assignmentDone,
              },
              update: {
                status: item.status,
                assignmentDone: item.assignmentDone,
              },
            });
          }
        });

        return NextResponse.json({
          ok: true,
          message: "حضور و غیاب و تکالیف با موفقیت ذخیره شد.",
        });
      } catch (err: any) {
        console.error("[SAVE_ACADEMY_ATTENDANCE_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در ذخیره حضور و غیاب." },
          { status: 500 }
        );
      }
    }
  );
}
