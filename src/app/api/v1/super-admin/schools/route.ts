import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const CreateSchoolBody = z.object({
  name: z.string().min(2, "نام مدرسه الزامی است."),
  subdomain: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "زیردامنه فقط شامل حروف انگلیسی کوچک، اعداد و خط‌تیره باشد."),
  principalPhone: z.string().regex(/^09\d{9}$/, "شماره موبایل مدیر نامعتبر است."),
  principalNationalCode: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  principalFirstName: z.string().min(1),
  principalLastName: z.string().min(1),
});

/**
 * POST /api/v1/super-admin/schools
 *
 * Onboard a new school + its first Principal in one atomic transaction.
 * Per Section 2: Super Admin is responsible for "ثبت مدرسه جدید، تخصیص نام
 * کاربری و رمز عبور اولیه برای مدیر مدرسه". Since auth is OTP-based
 * (no passwords), the principal is auto-linked by phone number.
 */
export async function POST(req: NextRequest) {
  return withSuperAdmin(req, async () => {
    let body: z.infer<typeof CreateSchoolBody>;
    try {
      body = CreateSchoolBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    // Check subdomain uniqueness
    const existing = await db.school.findUnique({
      where: { subdomain: body.subdomain },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "این زیردامنه قبلاً ثبت شده است." },
        { status: 409 }
      );
    }

    // Atomic transaction: create School + find-or-create Principal User + StaffEmployment
    const result = await db.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: body.name,
          subdomain: body.subdomain,
          status: "ACTIVE",
          smsBalance: 100, // gift balance for dev
        },
      });

      // Find or create principal user (Section 3 — no duplicate accounts)
      let principal = await tx.user.findUnique({
        where: { phoneNumber: body.principalPhone },
      });
      if (!principal) {
        principal = await tx.user.create({
          data: {
            phoneNumber: body.principalPhone,
            nationalCode: body.principalNationalCode,
            firstName: body.principalFirstName,
            lastName: body.principalLastName,
          },
        });
      } else if (principal.nationalCode !== body.principalNationalCode) {
        // Phone exists but with a different national code — block to prevent
        // identity hijacking.
        throw new Error("شماره موبایل قبلاً با کد ملی متفاوتی ثبت شده است.");
      }

      // Create staff employment
      await tx.staffEmployment.create({
        data: {
          schoolId: school.id,
          userId: principal.id,
          role: "PRINCIPAL",
        },
      });

      return { school, principal };
    });

    return NextResponse.json({
      ok: true,
      school: {
        id: result.school.id,
        name: result.school.name,
        subdomain: result.school.subdomain,
        status: result.school.status,
      },
      principal: {
        id: result.principal.id,
        firstName: result.principal.firstName,
        lastName: result.principal.lastName,
        phoneNumber: result.principal.phoneNumber,
      },
    });
  });
}

/**
 * GET /api/v1/super-admin/schools
 *
 * List all schools on the platform (cross-tenant read — SuperAdmin only).
 */
export async function GET(req: NextRequest) {
  return withSuperAdmin(req, async () => {
    const schools = await db.school.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        smsBalance: true,
        createdAt: true,
        _count: {
          select: {
            staffEmployments: true,
            enrollments: true,
            classrooms: true,
          },
        },
      },
    });
    return NextResponse.json({ ok: true, schools });
  });
}

const PatchSchoolBody = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  smsBalance: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/v1/super-admin/schools?id=...
 *
 * Update school status (ACTIVE / SUSPENDED) or details.
 */
export async function PATCH(req: NextRequest) {
  return withSuperAdmin(req, async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ ok: false, error: "شناسه مدرسه نامعتبر است." }, { status: 400 });
    }

    let body: z.infer<typeof PatchSchoolBody>;
    try {
      body = PatchSchoolBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      const updated = await db.school.update({
        where: { id },
        data: body,
      });
      return NextResponse.json({ ok: true, school: updated });
    } catch (err) {
      console.error("[SUPER_ADMIN_PATCH_SCHOOL_ERROR]", err);
      return NextResponse.json({ ok: false, error: "خطا در ویرایش اطلاعات مدرسه." }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/v1/super-admin/schools?id=...
 *
 * Suspends the school (Soft-deactivation to preserve academic records per Section 9).
 */
export async function DELETE(req: NextRequest) {
  return withSuperAdmin(req, async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ ok: false, error: "شناسه مدرسه نامعتبر است." }, { status: 400 });
    }

    try {
      const updated = await db.school.update({
        where: { id },
        data: { status: "SUSPENDED" },
      });
      return NextResponse.json({
        ok: true,
        message: "مدرسه با موفقیت غیرفعال (تعلیق) شد.",
        school: updated,
      });
    } catch (err) {
      console.error("[SUPER_ADMIN_DELETE_SCHOOL_ERROR]", err);
      return NextResponse.json({ ok: false, error: "خطا در غیرفعال‌سازی مدرسه." }, { status: 500 });
    }
  });
}
