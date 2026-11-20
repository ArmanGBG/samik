import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAcademyContext } from "@/lib/middleware-helpers/academy-guard";
import { db } from "@/lib/db";

const CreateSessionBody = z.object({
  classId: z.string().min(1, "شناسه کلاس الزامی است."),
  name: z.string().optional(),
  date: z.string().optional(), // ISO string or YYYY-MM-DD
});

/**
 * GET /api/v1/academy/sessions?classId=...
 */
export async function GET(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT", "ACADEMY_STUDENT"],
    async (ctx) => {
      const { searchParams } = new URL(req.url);
      const classId = searchParams.get("classId");

      if (!classId) {
        return NextResponse.json(
          { ok: false, error: "پارامتر classId الزامی است." },
          { status: 400 }
        );
      }

      try {
        const cls = await db.academyClass.findFirst({
          where: { id: classId, academyId: ctx.academyId },
          select: { id: true, name: true },
        });

        if (!cls) {
          return NextResponse.json(
            { ok: false, error: "کلاس یافت نشد." },
            { status: 404 }
          );
        }

        const sessions = await db.academySession.findMany({
          where: { classId },
          orderBy: { sessionNum: "desc" },
          include: {
            attendances: {
              select: {
                status: true,
                assignmentDone: true,
              },
            },
          },
        });

        const formatted = sessions.map((s) => {
          const totalRecords = s.attendances.length;
          const presentCount = s.attendances.filter((a) => a.status === "PRESENT").length;
          const lateCount = s.attendances.filter((a) => a.status === "LATE").length;
          const absentCount = s.attendances.filter((a) => a.status === "ABSENT").length;
          const assignmentDoneCount = s.attendances.filter((a) => a.assignmentDone).length;

          return {
            id: s.id,
            sessionNum: s.sessionNum,
            name: s.name,
            date: s.date.toISOString(),
            totalRecords,
            presentCount,
            lateCount,
            absentCount,
            assignmentDoneCount,
          };
        });

        return NextResponse.json({ ok: true, sessions: formatted, className: cls.name });
      } catch (err: any) {
        console.error("[GET_ACADEMY_SESSIONS_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در دریافت لیست جلسات." },
          { status: 500 }
        );
      }
    }
  );
}

/**
 * POST /api/v1/academy/sessions
 */
export async function POST(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT"],
    async (ctx) => {
      let body: z.infer<typeof CreateSessionBody>;
      try {
        body = CreateSessionBody.parse(await req.json());
      } catch (e: any) {
        return NextResponse.json(
          { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
          { status: 400 }
        );
      }

      try {
        // Verify class belongs to this academy
        const cls = await db.academyClass.findFirst({
          where: { id: body.classId, academyId: ctx.academyId },
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              select: { studentUserId: true, joinedAtSessionNum: true },
            },
          },
        });

        if (!cls) {
          return NextResponse.json(
            { ok: false, error: "کلاس یافت نشد." },
            { status: 404 }
          );
        }

        // Teacher permission check: if ACADEMY_TEACHER, must be assigned to this class
        if (ctx.role === "ACADEMY_TEACHER" && cls.teacherUserId !== ctx.userId) {
          return NextResponse.json(
            { ok: false, error: "شما مدرس این کلاس نیستید." },
            { status: 403 }
          );
        }

        // Determine next sessionNum
        const lastSession = await db.academySession.findFirst({
          where: { classId: body.classId },
          orderBy: { sessionNum: "desc" },
          select: { sessionNum: true },
        });

        const nextNum = (lastSession?.sessionNum ?? 0) + 1;
        const sessionName = body.name?.trim() || `جلسه ${nextNum}`;
        const parsedDate = body.date ? new Date(body.date) : new Date();
        const sessionDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        // Create the session (attendance will be recorded when teacher submits roll-call)
        const session = await db.academySession.create({
          data: {
            classId: body.classId,
            sessionNum: nextNum,
            name: sessionName,
            date: sessionDate,
          },
        });

        return NextResponse.json({
          ok: true,
          message: `${session.name} با موفقیت ایجاد شد.`,
          session: {
            id: session.id,
            sessionNum: session.sessionNum,
            name: session.name,
            date: session.date.toISOString(),
          },
        });
      } catch (err: any) {
        console.error("[CREATE_ACADEMY_SESSION_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در ایجاد جلسه جدید." },
          { status: 500 }
        );
      }
    }
  );
}
