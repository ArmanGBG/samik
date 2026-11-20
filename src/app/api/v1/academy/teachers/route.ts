import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAcademyContext } from "@/lib/middleware-helpers/academy-guard";
import { db } from "@/lib/db";
import { toAsciiDigitsOnly, toEnglishDigits } from "@/lib/persian-digits";

const AddTeacherBody = z.object({
  phoneNumber: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است."),
  nationalCode: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  firstName: z.string().min(1, "نام الزامی است."),
  lastName: z.string().min(1, "نام خانوادگی الزامی است."),
  teachingSubject: z.string().optional().nullable(),
  bankCardNo: z.string().optional().nullable(),
  shebaNo: z.string().optional().nullable(),
});

/**
 * GET /api/v1/academy/teachers
 */
export async function GET(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER"],
    async (ctx) => {
      try {
        const staff = await db.academyStaff.findMany({
          where: {
            academyId: ctx.academyId,
            role: { in: ["TEACHER", "ASSISTANT"] },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                nationalCode: true,
                academyClassesTaught: {
                  where: { academyId: ctx.academyId },
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const formatted = staff.map((s) => ({
          id: s.user.id,
          staffId: s.id,
          role: s.role,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          fullName: `${s.user.firstName} ${s.user.lastName}`.trim(),
          phoneNumber: s.user.phoneNumber,
          nationalCode: s.user.nationalCode,
          teachingSubject: s.teachingSubject || "—",
          bankCardNo: s.bankCardNo || "",
          shebaNo: s.shebaNo || "",
          classes: s.user.academyClassesTaught,
          classesCount: s.user.academyClassesTaught.length,
          createdAt: s.createdAt.toISOString(),
        }));

        return NextResponse.json({ ok: true, teachers: formatted });
      } catch (err: any) {
        console.error("[GET_ACADEMY_TEACHERS_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: "خطا در دریافت لیست اساتید." },
          { status: 500 }
        );
      }
    }
  );
}

/**
 * POST /api/v1/academy/teachers
 */
export async function POST(req: NextRequest) {
  return withAcademyContext(
    req,
    ["SUPER_ADMIN", "ACADEMY_MANAGER"],
    async (ctx) => {
      let body: z.infer<typeof AddTeacherBody>;
      try {
        const raw = await req.json();
        body = AddTeacherBody.parse({
          ...raw,
          phoneNumber: toAsciiDigitsOnly(raw.phoneNumber ?? ""),
          nationalCode: toAsciiDigitsOnly(raw.nationalCode ?? ""),
          bankCardNo: raw.bankCardNo ? toAsciiDigitsOnly(raw.bankCardNo) : null,
          shebaNo: raw.shebaNo ? toAsciiDigitsOnly(raw.shebaNo) : null,
        });
      } catch (e: any) {
        return NextResponse.json(
          { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
          { status: 400 }
        );
      }

      try {
        const result = await db.$transaction(async (tx) => {
          // Find or create user
          let user = await tx.user.findFirst({
            where: {
              OR: [
                { phoneNumber: body.phoneNumber },
                { nationalCode: body.nationalCode },
              ],
            },
          });

          if (!user) {
            user = await tx.user.create({
              data: {
                phoneNumber: body.phoneNumber,
                nationalCode: body.nationalCode,
                firstName: body.firstName.trim(),
                lastName: body.lastName.trim(),
              },
            });
          } else {
            if (
              user.phoneNumber !== body.phoneNumber ||
              user.nationalCode !== body.nationalCode
            ) {
              throw new Error(
                "شماره موبایل یا کد ملی وارد شده متعلق به کاربر دیگری در سامانه است."
              );
            }
          }

          // Check if already in academy staff
          const existingStaff = await tx.academyStaff.findUnique({
            where: {
              academyId_userId: {
                academyId: ctx.academyId,
                userId: user.id,
              },
            },
          });

          if (existingStaff) {
            throw new Error("این استاد قبلاً به کادر این آموزشگاه اضافه شده است.");
          }

          const staff = await tx.academyStaff.create({
            data: {
              academyId: ctx.academyId,
              userId: user.id,
              role: "TEACHER",
              teachingSubject: body.teachingSubject?.trim() || null,
              bankCardNo: body.bankCardNo?.trim() || null,
              shebaNo: body.shebaNo?.trim() || null,
            },
          });

          return { user, staff };
        });

        return NextResponse.json({
          ok: true,
          message: "استاد با موفقیت به آموزشگاه اضافه شد.",
          teacher: {
            id: result.user.id,
            fullName: `${result.user.firstName} ${result.user.lastName}`.trim(),
            phoneNumber: result.user.phoneNumber,
          },
        });
      } catch (err: any) {
        console.error("[ADD_ACADEMY_TEACHER_ERROR]", err);
        return NextResponse.json(
          { ok: false, error: err?.message || "خطا در افزودن استاد." },
          { status: 500 }
        );
      }
    }
  );
}
