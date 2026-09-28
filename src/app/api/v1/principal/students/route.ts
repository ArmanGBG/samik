import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const CreateBody = z.object({
  firstName: z.string().min(1, "نام الزامی است."),
  lastName: z.string().min(1, "نام خانوادگی الزامی است."),
  nationalCode: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد."),
  phoneNumber: z.string().regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد."),
  classRoomId: z.string().uuid("کلاس انتخاب نشده است."),
  guardianPhone1: z.string().regex(/^09\d{9}$/, "شماره ولی الزامی است."),
  guardianPhone2: z.string().regex(/^09\d{9}$/).optional().or(z.literal("")),
  academicYear: z.string().default("1404-1405"),
});

/**
 * GET /api/v1/principal/students?classroomId=...
 *
 * List students enrolled in the active school. If classroomId is provided,
 * filter by that classroom. Returns ACTIVE enrollments only by default.
 */
export async function GET(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    try {
      const classroomId = req.nextUrl.searchParams.get("classroomId");
      const where: Record<string, unknown> = { status: { in: ["ACTIVE", "PENDING_CONFIRMATION"] } };
      if (classroomId) where.classRoomId = classroomId;

      const enrollments = await db.schoolEnrollment.findMany({
        where,
        orderBy: [{ student: { lastName: "asc" } }],
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, phoneNumber: true, nationalCode: true },
          },
          classRoom: { select: { id: true, name: true, gradeLevel: true } },
        },
      });

      return NextResponse.json({
        ok: true,
        students: enrollments.map((e) => ({
          enrollmentId: e.id,
          studentId: e.student.id,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
          fullName: `${e.student.firstName} ${e.student.lastName}`,
          phoneNumber: e.student.phoneNumber,
          nationalCode: e.student.nationalCode,
          classRoomId: e.classRoomId,
          classRoomName: `${e.classRoom.gradeLevel} ${e.classRoom.name}`,
          gradeLevel: e.classRoom.gradeLevel,
          guardianPhone1: e.guardianPhone1,
          guardianPhone2: e.guardianPhone2,
          academicYear: e.academicYear,
          status: e.status,
          createdAt: e.createdAt,
        })),
      });
    } catch (err) {
      console.error("[students GET] error:", err);
      return NextResponse.json(
        { ok: false, error: "خطا در دریافت لیست دانش‌آموزان." },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/v1/principal/students
 *
 * Register a new student (Section 4 of the architecture doc).
 *
 * Per Section 4 — "تفکیک هویت از عضویت":
 *   1. Search for the nationalCode in the global Users table.
 *   2. If found → link the existing user (no duplicate accounts).
 *   3. If not found → create a new User record.
 *   4. Create a SchoolEnrollment record linking the user to this school + classroom.
 *
 * Per Section 4 — "حلقه تایید امنیتی":
 *   If the user already exists (from another school), the enrollment is
 *   created with status PENDING_CONFIRMATION (the guardian must approve
 *   via SMS). For new users, the enrollment is ACTIVE immediately.
 *
 * Uses db.$transaction for atomicity. Returns clean 409 errors for
 * duplicate enrollments (same student already enrolled in this school).
 */
export async function POST(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async (ctx) => {
    let body: z.infer<typeof CreateBody>;
    try {
      body = CreateBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      // Verify the classroom exists in this school
      const classroom = await db.classRoom.findFirst({
        where: { id: body.classRoomId },
        select: { id: true, gradeLevel: true, name: true },
      });
      if (!classroom) {
        return NextResponse.json(
          { ok: false, error: "کلاس انتخاب‌شده یافت نشد." },
          { status: 404 }
        );
      }

      const result = await db.$transaction(async (tx) => {
        // Step 1: Find or create the User by nationalCode
        let user = await tx.user.findUnique({
          where: { nationalCode: body.nationalCode },
        });

        let isNewUser = false;
        if (!user) {
          // Create new user
          user = await tx.user.create({
            data: {
              nationalCode: body.nationalCode,
              phoneNumber: body.phoneNumber,
              firstName: body.firstName,
              lastName: body.lastName,
            },
          });
          isNewUser = true;
        } else {
          // If user exists with a different phone → update the phone
          // (the student's own phone may have changed)
          if (user.phoneNumber !== body.phoneNumber) {
            // Check if the new phone is taken by another user
            const phoneOwner = await tx.user.findUnique({
              where: { phoneNumber: body.phoneNumber },
              select: { id: true },
            });
            if (phoneOwner && phoneOwner.id !== user.id) {
              throw new Error("PHONE_CONFLICT");
            }
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                phoneNumber: body.phoneNumber,
                firstName: body.firstName,
                lastName: body.lastName,
              },
            });
          }
        }

        // Step 2: Check if already enrolled in THIS school + classroom
        const existingEnrollment = await tx.schoolEnrollment.findFirst({
          where: {
            schoolId: ctx.schoolId,
            studentUserId: user.id,
            classRoomId: body.classRoomId,
            academicYear: body.academicYear,
          },
          select: { id: true, status: true },
        });

        if (existingEnrollment) {
          throw new Error("ALREADY_ENROLLED");
        }

        // Step 3: Create the enrollment
        // Per Section 4: new users get ACTIVE; existing users (from other
        // schools) get PENDING_CONFIRMATION (guardian must approve)
        const enrollment = await tx.schoolEnrollment.create({
          data: {
            studentUserId: user.id,
            classRoomId: body.classRoomId,
            academicYear: body.academicYear,
            guardianPhone1: body.guardianPhone1,
            guardianPhone2: body.guardianPhone2 || null,
            status: isNewUser ? "ACTIVE" : "PENDING_CONFIRMATION",
            schoolId: ctx.schoolId,
          } as any,
        });

        return { enrollment, user, isNewUser, classroom };
      });

      const statusLabel = result.isNewUser ? "فعال" : "در انتظار تأیید ولی";

      return NextResponse.json(
        {
          ok: true,
          student: {
            enrollmentId: result.enrollment.id,
            studentId: result.user.id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            fullName: `${result.user.firstName} ${result.user.lastName}`,
            phoneNumber: result.user.phoneNumber,
            nationalCode: result.user.nationalCode,
            classRoomId: body.classRoomId,
            classRoomName: `${result.classroom.gradeLevel} ${result.classroom.name}`,
            guardianPhone1: result.enrollment.guardianPhone1,
            guardianPhone2: result.enrollment.guardianPhone2,
            status: result.enrollment.status,
            statusLabel,
          },
        },
        { status: 201 }
      );
    } catch (err) {
      // Handle known business-logic errors with clean messages
      const errMsg = (err as Error).message;
      if (errMsg === "ALREADY_ENROLLED") {
        return NextResponse.json(
          { ok: false, error: "این دانش‌آموز از قبل در این کلاس ثبت‌نام شده است." },
          { status: 409 }
        );
      }
      if (errMsg === "PHONE_CONFLICT") {
        return NextResponse.json(
          { ok: false, error: "شماره موبایل وارد شده برای کاربر دیگری ثبت شده است." },
          { status: 409 }
        );
      }
      // Prisma P2002 (unique constraint) — likely duplicate nationalCode
      if ((err as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { ok: false, error: "کد ملی از قبل در سیستم وجود دارد." },
          { status: 409 }
        );
      }
      console.error("[students POST] error:", err);
      return NextResponse.json(
        { ok: false, error: "خطا در ثبت‌نام دانش‌آموز." },
        { status: 500 }
      );
    }
  });
}
