import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAcademyContext } from "@/lib/middleware-helpers/academy-guard";
import { db } from "@/lib/db";

const PatchClassBody = z.object({
  name: z.string().min(2).optional(),
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
 * GET /api/v1/academy/classes/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER", "ACADEMY_TEACHER", "ACADEMY_ASSISTANT", "ACADEMY_STUDENT"],
    async (ctx) => {
      const { id } = await params;

      try {
        const cls = await db.academyClass.findFirst({
          where: {
            id,
            academyId: ctx.academyId,
          },
          include: {
            academy: { select: { id: true, name: true, code: true } },
            teacherUser: {
              select: { id: true, firstName: true, lastName: true, phoneNumber: true },
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
              orderBy: { createdAt: "asc" },
            },
            sessions: {
              orderBy: { sessionNum: "desc" },
              include: {
                _count: {
                  select: { attendances: true },
                },
                attendances: {
                  select: {
                    status: true,
                    assignmentDone: true,
                  },
                },
              },
            },
          },
        });

        if (!cls) {
          return NextResponse.json(
            { ok: false, error: "کلاس مورد نظر یافت نشد." },
            { status: 404 }
          );
        }

        const formattedSessions = cls.sessions.map((s) => {
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

        return NextResponse.json({
          ok: true,
          classItem: {
            id: cls.id,
            name: cls.name,
            schedule: cls.schedule || "—",
            qrToken: cls.qrToken,
            academy: cls.academy,
            teacher: cls.teacherUser
              ? {
                  id: cls.teacherUser.id,
                  fullName: `${cls.teacherUser.firstName} ${cls.teacherUser.lastName}`.trim(),
                  phoneNumber: cls.teacherUser.phoneNumber,
                }
              : null,
            students: cls.enrollments.map((e) => ({
              enrollmentId: e.id,
              studentId: e.studentUser.id,
              fullName: `${e.studentUser.firstName} ${e.studentUser.lastName}`.trim(),
              phoneNumber: e.studentUser.phoneNumber,
              nationalCode: e.studentUser.nationalCode,
              joinedAtSessionNum: e.joinedAtSessionNum,
              joinedAt: e.createdAt.toISOString(),
            })),
            sessions: formattedSessions,
          },
        });
      } catch (err: any) {
        console.error("[GET_ACADEMY_CLASS_DETAIL_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در دریافت اطلاعات کلاس." },
          { status: 500 }
        );
      }
    }
  );
}

/**
 * PATCH /api/v1/academy/classes/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER"],
    async (ctx) => {
      const { id } = await params;
      let body: z.infer<typeof PatchClassBody>;
      try {
        body = PatchClassBody.parse(await req.json());
      } catch (e: any) {
        return NextResponse.json(
          { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
          { status: 400 }
        );
      }

      try {
        const cls = await db.academyClass.findFirst({
          where: {
            id,
            ...(ctx.role !== "SUPER_ADMIN" ? { academyId: ctx.academyId } : {}),
          },
          select: { id: true, academyId: true },
        });

        if (!cls) {
          return NextResponse.json(
            { ok: false, error: "کلاس مورد نظر یافت نشد یا دسترسی ندارید." },
            { status: 404 }
          );
        }

        // Validate teacher belongs to this academy
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

        const updated = await db.academyClass.update({
          where: { id: cls.id },
          data: {
            ...(body.name ? { name: body.name.trim() } : {}),
            ...(body.teacherUserId !== undefined ? { teacherUserId: body.teacherUserId } : {}),
            ...(body.schedule !== undefined ? { schedule: body.schedule?.trim() || null } : {}),
          },
        });

        return NextResponse.json({
          ok: true,
          message: "کلاس با موفقیت ویرایش شد.",
          classItem: updated,
        });
      } catch (err: any) {
        console.error("[PATCH_ACADEMY_CLASS_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در ویرایش کلاس." },
          { status: 500 }
        );
      }
    }
  );
}

/**
 * DELETE /api/v1/academy/classes/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER"],
    async (ctx) => {
      const { id } = await params;
      try {
        const cls = await db.academyClass.findFirst({
          where: {
            id,
            ...(ctx.role !== "SUPER_ADMIN" ? { academyId: ctx.academyId } : {}),
          },
          select: { id: true },
        });

        if (!cls) {
          return NextResponse.json(
            { ok: false, error: "کلاس مورد نظر یافت نشد یا دسترسی ندارید." },
            { status: 404 }
          );
        }

        await db.academyClass.delete({
          where: { id: cls.id },
        });

        return NextResponse.json({
          ok: true,
          message: "کلاس با موفقیت حذف شد.",
        });
      } catch (err: any) {
        console.error("[DELETE_ACADEMY_CLASS_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در حذف کلاس." },
          { status: 500 }
        );
      }
    }
  );
}
