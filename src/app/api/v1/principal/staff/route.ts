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
    errorMap: () => ({ message: "نقش باید ناظم یا معلم باشد." }),
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

    // For teachers, count their timetable slots in this school
    const teacherSlotCounts = await Promise.all(
      employments
        .filter((e) => e.role === "TEACHER")
        .map(async (e) => ({
          userId: e.userId,
          count: await db.timetableSlot.count({
            where: { teacherUserId: e.userId },
          }),
        }))
    );
    const slotCountMap = new Map(
      teacherSlotCounts.map((t) => [t.userId, t.count])
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
  return withTenantContext(req, ["PRINCIPAL"], async () => {
    let body: z.infer<typeof AddStaffBody>;
    try {
      body = AddStaffBody.parse(await req.json());
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: (e as z.ZodError).errors?.[0]?.message ?? "ورودی نامعتبر" },
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
      where: { schoolId_userId: { schoolId: req.headers.get("x-samik-school-id")!, userId: user.id } },
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
    const employment = await db.staffEmployment.create({
      data: {
        userId: user.id,
        role: body.role,
      },
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
