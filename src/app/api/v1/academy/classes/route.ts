import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAcademyContext } from "@/lib/middleware-helpers/academy-guard";
import { db } from "@/lib/db";
import { generateAcademyClassId } from "@/lib/academy-ids";

const CreateClassBody = z.object({
  name: z.string().min(2, "نام کلاس یا دوره الزامی است."),
  teacherUserId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  schedule: z.string().optional().nullable(),
});

/**
 * GET /api/v1/academy/classes
 */
export async function GET(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT"],
    async (ctx) => {
      try {
        const whereClause: any = { academyId: ctx.academyId };

        // If teacher, only return classes taught by this teacher
        if (ctx.role === "ACADEMY_TEACHER") {
          whereClause.teacherUserId = ctx.userId;
        }

        const classes = await db.academyClass.findMany({
          where: whereClause,
          include: {
            teacherUser: {
              select: { id: true, firstName: true, lastName: true, phoneNumber: true },
            },
            _count: {
              select: {
                enrollments: { where: { status: "ACTIVE" } },
                sessions: true,
              },
            },
            sessions: {
              orderBy: { sessionNum: "desc" },
              take: 1,
              select: { sessionNum: true, name: true, date: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const formatted = classes.map((c) => ({
          id: c.id,
          name: c.name,
          schedule: c.schedule || "—",
          qrToken: c.qrToken,
          teacher: c.teacherUser
            ? {
                id: c.teacherUser.id,
                fullName: `${c.teacherUser.firstName} ${c.teacherUser.lastName}`.trim(),
                phoneNumber: c.teacherUser.phoneNumber,
              }
            : null,
          studentsCount: c._count.enrollments,
          sessionsCount: c._count.sessions,
          lastSession: c.sessions[0]
            ? {
                sessionNum: c.sessions[0].sessionNum,
                name: c.sessions[0].name,
                date: c.sessions[0].date.toISOString(),
              }
            : null,
          createdAt: c.createdAt.toISOString(),
        }));

        return NextResponse.json({ ok: true, classes: formatted });
      } catch (err: any) {
        console.error("[GET_ACADEMY_CLASSES_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در دریافت لیست کلاس‌ها." },
          { status: 500 }
        );
      }
    }
  );
}

/**
 * POST /api/v1/academy/classes
 */
export async function POST(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER"],
    async (ctx) => {
      let body: z.infer<typeof CreateClassBody>;
      try {
        body = CreateClassBody.parse(await req.json());
      } catch (e: any) {
        return NextResponse.json(
          { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
          { status: 400 }
        );
      }

      try {
        if (body.teacherUserId && ctx.role !== "SUPER_ADMIN") {
          const staff = await db.academyStaff.findUnique({
            where: {
              academyId_userId: {
                academyId: ctx.academyId,
                userId: body.teacherUserId,
              },
            },
          });
          if (!staff) {
            return NextResponse.json(
              { ok: false, error: "استاد انتخاب‌شده عضو کادر این آموزشگاه نیست." },
              { status: 400 }
            );
          }
        }

        // Generate a unique class code: CLS-XXXXXX
        let classId = generateAcademyClassId();
        let exists = await db.academyClass.findUnique({ where: { id: classId } });
        while (exists) {
          classId = generateAcademyClassId();
          exists = await db.academyClass.findUnique({ where: { id: classId } });
        }

        const newClass = await db.academyClass.create({
          data: {
            id: classId,
            name: body.name.trim(),
            academyId: ctx.academyId,
            teacherUserId: body.teacherUserId || null,
            schedule: body.schedule?.trim() || null,
          },
          include: {
            teacherUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        return NextResponse.json({
          ok: true,
          message: "کلاس با موفقیت ایجاد شد.",
          classItem: {
            id: newClass.id,
            name: newClass.name,
            schedule: newClass.schedule,
            qrToken: newClass.qrToken,
            teacherName: newClass.teacherUser
              ? `${newClass.teacherUser.firstName} ${newClass.teacherUser.lastName}`.trim()
              : "تعیین نشده",
          },
        });
      } catch (err: any) {
        console.error("[CREATE_ACADEMY_CLASS_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در ایجاد کلاس." },
          { status: 500 }
        );
      }
    }
  );
}
