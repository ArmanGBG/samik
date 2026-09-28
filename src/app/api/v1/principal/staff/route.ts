import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const AddStaffBody = z.object({
  phone: z.string().regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد."),
  nationalCode: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  firstName: z.string().min(1, "نام الزامی است."),
  lastName: z.string().min(1, "نام خانوادگی الزامی است."),
  role: z.enum(["DEPUTY", "TEACHER"], {
    message: "نقش باید ناظم یا معلم باشد.",
  }),
});

/**
 * GET /api/v1/principal/staff
 *
 * List all staff (PRINCIPAL + DEPUTY + TEACHER) in the active school.
 * Includes user details + slot count (for teachers).
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    const employments = await db.staffEmployment.findMany({
      orderBy: [{ role: "asc" }, { user: { firstName: "asc" } }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            nationalCode: true,
          },
        },
      },
    });

    // For teachers, count their timetable slots in this school in a single groupBy query (solves N+1)
    const teacherIds = employments
      .filter((e) => e.role === "TEACHER")
      .map((e) => e.userId);

    const slotCounts =
      teacherIds.length > 0
        ? await db.timetableSlot.groupBy({
            by: ["teacherUserId"],
            where: { teacherUserId: { in: teacherIds } },
            _count: { id: true },
          })
        : [];

    const slotCountMap = new Map(
      slotCounts.map((s) => [s.teacherUserId, s._count.id])
    );

    return NextResponse.json({
      ok: true,
      staff: employments.map((e) => ({
        id: e.id,
        userId: e.user.id,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        fullName: `${e.user.firstName} ${e.user.lastName}`,
        phoneNumber: e.user.phoneNumber,
        nationalCode: e.user.nationalCode,
        role: e.role,
        slotCount: slotCountMap.get(e.userId) ?? 0,
        createdAt: e.createdAt,
      })),
    });
  });
}

/**
 * POST /api/v1/principal/staff
 *
 * Add a new staff member to the active school.
 *
 * Per Section 3 — "National Code vs UUID":
 *   - If the phone number already exists in the global Users table, link
 *     the existing user (no duplicate accounts).
 *   - Otherwise, create a new User record.
 *
 * Per Section 2 — RBAC:
 *   - Principal can only assign DEPUTY or TEACHER roles (not PRINCIPAL
 *     — that's reserved for the SuperAdmin onboarding flow).
 *   - The unique constraint on (schoolId, userId) prevents duplicate
 *     employment of the same user in the same school.
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async (ctx) => {
    let body: z.infer<typeof AddStaffBody>;
    try {
      body = AddStaffBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    // Find or create the user (by phone — global unique)
    let user = await db.user.findUnique({
      where: { phoneNumber: body.phone },
    });
    if (!user) {
      user = await db.user.create({
        data: {
          phoneNumber: body.phone,
          nationalCode: body.nationalCode,
          firstName: body.firstName,
          lastName: body.lastName,
        },
      });
    } else {
      // If user exists but with a different national code → block (identity mismatch)
      if (user.nationalCode !== body.nationalCode) {
        return NextResponse.json(
          {
            ok: false,
            error: "این شماره موبایل قبلاً با کد ملی متفاوتی ثبت شده است.",
          },
          { status: 409 }
        );
      }
    }

    // Check if already employed in this school
    const existing = await db.staffEmployment.findUnique({
      where: { schoolId_userId: { schoolId: ctx.schoolId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: `این کاربر از قبل با نقش ${existing.role} در این مدرسه ثبت شده است.`,
        },
        { status: 409 }
      );
    }

    // Create the employment record
    const employment: any = await db.staffEmployment.create({
      data: {
        userId: user.id,
        role: body.role,
        schoolId: ctx.schoolId,
      } as any,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true, nationalCode: true },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        staff: {
          id: employment.id,
          userId: employment.user.id,
          firstName: employment.user.firstName,
          lastName: employment.user.lastName,
          fullName: `${employment.user.firstName} ${employment.user.lastName}`,
          phoneNumber: employment.user.phoneNumber,
          nationalCode: employment.user.nationalCode,
          role: employment.role,
          slotCount: 0,
          createdAt: employment.createdAt,
        },
      },
      { status: 201 }
    );
  });
}

/**
 * DELETE /api/v1/principal/staff?id=...
 *
 * Remove a staff member from the school (delete the StaffEmployment record).
 * The User record is NOT deleted (it's global — the user may have
 * employments in other schools).
 *
 * Blocked if the teacher has timetable slots assigned (must reassign
 * those first). Also blocked for PRINCIPAL role (can't remove yourself).
 */
export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "پارامتر id الزامی است." },
        { status: 400 }
      );
    }

    // Find the employment record
    const employment = await db.staffEmployment.findUnique({
      where: { id },
      select: { id: true, role: true, userId: true },
    });
    if (!employment) {
      return NextResponse.json(
        { ok: false, error: "عضویت پرسنلی یافت نشد." },
        { status: 404 }
      );
    }

    // Can't remove a PRINCIPAL
    if (employment.role === "PRINCIPAL") {
      return NextResponse.json(
        { ok: false, error: "امکان حذف مدیر مدرسه وجود ندارد." },
        { status: 403 }
      );
    }

    // For teachers: check if they have timetable slots
    if (employment.role === "TEACHER") {
      const slotCount = await db.timetableSlot.count({
        where: { teacherUserId: employment.userId },
      });
      if (slotCount > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `این معلم ${slotCount} خانه برنامه هفتگی دارد. ابتدا آن‌ها را حذف یا منتقل کنید.`,
          },
          { status: 409 }
        );
      }
    }

    await db.staffEmployment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}

const PatchStaffBody = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().regex(/^09\d{9}$/).optional(),
  nationalCode: z.string().regex(/^\d{10}$/).optional(),
  role: z.enum(["DEPUTY", "TEACHER"]).optional(),
});

/**
 * PATCH /api/v1/principal/staff?id=...
 *
 * Update a staff member's info (name, phone, national code) and/or
 * their role within this school.
 *
 * - Cannot change a PRINCIPAL's role (only the SuperAdmin can do that
 *   during onboarding).
 * - If changing the phone number, the new number must not already
 *   belong to another user (unique constraint).
 * - Uses safeJsonResponse pattern — every return is NextResponse.json().
 */
export async function PATCH(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "پارامتر id الزامی است." },
        { status: 400 }
      );
    }

    let body: z.infer<typeof PatchStaffBody>;
    try {
      body = PatchStaffBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      // Find the employment record
      const employment = await db.staffEmployment.findUnique({
        where: { id },
        select: { id: true, role: true, userId: true },
      });
      if (!employment) {
        return NextResponse.json(
          { ok: false, error: "عضویت پرسنلی یافت نشد." },
          { status: 404 }
        );
      }

      // Cannot change a PRINCIPAL's role
      if (body.role && employment.role === "PRINCIPAL") {
        return NextResponse.json(
          { ok: false, error: "امکان تغییر نقش مدیر مدرسه وجود ندارد." },
          { status: 403 }
        );
      }

      // If phone is changing, check for conflicts
      if (body.phoneNumber) {
        const existingUser = await db.user.findUnique({
          where: { phoneNumber: body.phoneNumber },
          select: { id: true },
        });
        if (existingUser && existingUser.id !== employment.userId) {
          return NextResponse.json(
            { ok: false, error: "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است." },
            { status: 409 }
          );
        }
      }

      // If nationalCode is changing, check for conflicts
      if (body.nationalCode) {
        const existingNc = await db.user.findUnique({
          where: { nationalCode: body.nationalCode },
          select: { id: true },
        });
        if (existingNc && existingNc.id !== employment.userId) {
          return NextResponse.json(
            { ok: false, error: "این کد ملی قبلاً برای کاربر دیگری ثبت شده است." },
            { status: 409 }
          );
        }
      }

      // Update the User record (name, phone, national code)
      const userUpdate: Record<string, unknown> = {};
      if (body.firstName) userUpdate.firstName = body.firstName;
      if (body.lastName) userUpdate.lastName = body.lastName;
      if (body.phoneNumber) userUpdate.phoneNumber = body.phoneNumber;
      if (body.nationalCode) userUpdate.nationalCode = body.nationalCode;

      if (Object.keys(userUpdate).length > 0) {
        await db.user.update({
          where: { id: employment.userId },
          data: userUpdate,
        });
      }

      // Update the employment role (if provided and not PRINCIPAL)
      if (body.role && employment.role !== "PRINCIPAL") {
        await db.staffEmployment.update({
          where: { id },
          data: { role: body.role },
        });
      }

      // Fetch the updated record for response
      const updated = await db.staffEmployment.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, phoneNumber: true, nationalCode: true },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        staff: {
          id: updated!.id,
          userId: updated!.user.id,
          firstName: updated!.user.firstName,
          lastName: updated!.user.lastName,
          fullName: `${updated!.user.firstName} ${updated!.user.lastName}`,
          phoneNumber: updated!.user.phoneNumber,
          nationalCode: updated!.user.nationalCode,
          role: updated!.role,
          slotCount: 0, // recalculated on next GET
          createdAt: updated!.createdAt,
        },
      });
    } catch (err) {
      console.error("[staff PATCH] error:", err);
      return NextResponse.json(
        { ok: false, error: "خطا در ویرایش پرسنل." },
        { status: 500 }
      );
    }
  });
}
