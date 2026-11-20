import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";
import { toAsciiDigitsOnly, toEnglishDigits } from "@/lib/persian-digits";

const CreateAcademyBody = z.object({
  name: z.string().min(2, "نام آموزشگاه الزامی است."),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "کد آموزشگاه فقط شامل حروف انگلیسی، اعداد و خط‌تیره باشد."),
  managerPhone: z.string().regex(/^09\d{9}$/, "شماره موبایل مدیر نامعتبر است."),
  managerNationalCode: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  managerFirstName: z.string().min(1, "نام مدیر الزامی است."),
  managerLastName: z.string().min(1, "نام خانوادگی مدیر الزامی است."),
  province: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

/**
 * GET /api/v1/super-admin/academies
 *
 * Returns list of all Konkur Academies / Institutes with counts.
 */
export async function GET(req: NextRequest) {
  return withSuperAdmin(req, async () => {
    try {
      const academies = await db.academy.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          managerUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              nationalCode: true,
            },
          },
          _count: {
            select: {
              classes: true,
              staff: true,
            },
          },
          classes: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  enrollments: {
                    where: { status: "ACTIVE" },
                  },
                },
              },
            },
          },
        },
      });

      const formatted = academies.map((a) => {
        const totalStudents = a.classes.reduce(
          (sum, c) => sum + c._count.enrollments,
          0
        );

        return {
          id: a.id,
          name: a.name,
          code: a.code,
          status: a.status,
          province: a.province,
          city: a.city,
          phone: a.phone,
          address: a.address,
          createdAt: a.createdAt.toISOString(),
          manager: a.managerUser
            ? {
                id: a.managerUser.id,
                fullName: `${a.managerUser.firstName} ${a.managerUser.lastName}`.trim(),
                phoneNumber: a.managerUser.phoneNumber,
                nationalCode: a.managerUser.nationalCode,
              }
            : null,
          classesCount: a._count.classes,
          staffCount: a._count.staff,
          studentsCount: totalStudents,
        };
      });

      return NextResponse.json({ ok: true, academies: formatted });
    } catch (err: any) {
      console.error("[GET_ACADEMIES_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: "خطا در دریافت لیست آموزشگاه‌ها." },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/v1/super-admin/academies
 *
 * Creates a new Konkur Academy + its manager user + staff employment atomically.
 */
export async function POST(req: NextRequest) {
  return withSuperAdmin(req, async () => {
    let body: z.infer<typeof CreateAcademyBody>;
    try {
      const raw = await req.json();
      body = CreateAcademyBody.parse({
        ...raw,
        managerPhone: toAsciiDigitsOnly(raw.managerPhone ?? ""),
        managerNationalCode: toAsciiDigitsOnly(raw.managerNationalCode ?? ""),
        code: toEnglishDigits(raw.code ?? "").toLowerCase().trim(),
      });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existing = await db.academy.findUnique({
      where: { code: body.code },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "این کد/شناسه آموزشگاه قبلاً ثبت شده است." },
        { status: 409 }
      );
    }

    try {
      const result = await db.$transaction(async (tx) => {
        // Find or create manager user
        let manager = await tx.user.findFirst({
          where: {
            OR: [
              { phoneNumber: body.managerPhone },
              { nationalCode: body.managerNationalCode },
            ],
          },
        });

        if (!manager) {
          manager = await tx.user.create({
            data: {
              phoneNumber: body.managerPhone,
              nationalCode: body.managerNationalCode,
              firstName: body.managerFirstName.trim(),
              lastName: body.managerLastName.trim(),
            },
          });
        } else {
          // If user exists, ensure phone and national code match
          if (
            manager.phoneNumber !== body.managerPhone ||
            manager.nationalCode !== body.managerNationalCode
          ) {
            throw new Error(
              "شماره موبایل یا کد ملی وارد شده متعلق به کاربر دیگری در سامانه است."
            );
          }
        }

        // Create the Academy
        const academy = await tx.academy.create({
          data: {
            name: body.name.trim(),
            code: body.code,
            managerUserId: manager.id,
            status: "ACTIVE",
            province: body.province?.trim() || null,
            city: body.city?.trim() || null,
            phone: body.phone?.trim() || null,
            address: body.address?.trim() || null,
          },
        });

        // Add manager to AcademyStaff
        await tx.academyStaff.create({
          data: {
            academyId: academy.id,
            userId: manager.id,
            role: "MANAGER",
          },
        });

        return { academy, manager };
      });

      return NextResponse.json({
        ok: true,
        message: "آموزشگاه جدید با موفقیت ثبت شد.",
        academy: {
          id: result.academy.id,
          name: result.academy.name,
          code: result.academy.code,
        },
      });
    } catch (err: any) {
      console.error("[CREATE_ACADEMY_ERROR]", err);
      return NextResponse.json(
        { ok: false, error: err?.message || "خطا در ثبت آموزشگاه جدید." },
        { status: 500 }
      );
    }
  });
}
