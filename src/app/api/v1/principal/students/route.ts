// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withTenantContext } from "@/lib/middleware-helpers/tenant-guard";
import { db } from "@/lib/db";

const CreateBody = z.object({
  firstName: z.string().min(1, "نام الزامی است."),
  lastName: z.string().min(1, "نام خانوادگی الزامی است."),
  nationalCode: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{10}$/.test(val) || val.startsWith("TEMP-"), {
      message: "کد ملی باید ۱۰ رقم باشد.",
    })
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string().regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد."),
  classRoomId: z.string().uuid("فرمت کلاس نامعتبر است.").optional().or(z.literal("")),
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
          classRoomName: e.classRoom ? `${e.classRoom.gradeLevel} ${e.classRoom.name}` : "بدون کلاس",
          gradeLevel: e.classRoom?.gradeLevel,
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
      // Verify the classroom exists in this school (if provided)
      let classroom = null;
      const classId = body.classRoomId?.trim() || null;
      if (classId) {
        classroom = await db.classRoom.findFirst({
          where: { id: classId },
          select: { id: true, gradeLevel: true, name: true },
        });
        if (!classroom) {
          return NextResponse.json(
            { ok: false, error: "کلاس انتخاب‌شده یافت نشد." },
            { status: 404 }
          );
        }
      }

      const rawNc = body.nationalCode?.trim();
      const finalNationalCode = rawNc && rawNc.length > 0
        ? rawNc
        : `TEMP-S-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

      const result = await db.$transaction(async (tx) => {
        // Step 1: Find or create the User
        let user = null;
        if (rawNc && !rawNc.startsWith("TEMP-")) {
          user = await tx.user.findUnique({
            where: { nationalCode: rawNc },
          });
        }

        let isNewUser = false;
        if (!user) {
          // Check if phone number already exists
          const phoneOwner = await tx.user.findUnique({
            where: { phoneNumber: body.phoneNumber },
            select: { id: true },
          });
          if (phoneOwner) {
            throw new Error("PHONE_CONFLICT");
          }

          // Create new user
          user = await tx.user.create({
            data: {
              nationalCode: finalNationalCode,
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
        const existingWhere: any = {
          schoolId: ctx.schoolId,
          studentUserId: user.id,
          academicYear: body.academicYear,
        };
        if (classId) {
          existingWhere.classRoomId = classId;
        }

        const existingEnrollment = await tx.schoolEnrollment.findFirst({
          where: existingWhere,
          select: { id: true, status: true },
        });

        if (existingEnrollment) {
          throw new Error("ALREADY_ENROLLED");
        }

        console.log("CREATING ENROLLMENT:", {
          studentUserId: user.id,
          classRoomId: classId,
          academicYear: body.academicYear,
          guardianPhone1: body.guardianPhone1,
          guardianPhone2: body.guardianPhone2 || null,
          status: isNewUser ? "ACTIVE" : "PENDING_CONFIRMATION",
          schoolId: ctx.schoolId,
        });

        const data: any = {
          student: { connect: { id: user.id } },
          academicYear: body.academicYear,
          guardianPhone1: body.guardianPhone1,
          guardianPhone2: body.guardianPhone2 || null,
          status: isNewUser ? "ACTIVE" : "PENDING_CONFIRMATION",
          school: { connect: { id: ctx.schoolId } },
        };

        if (classId) {
          data.classRoom = { connect: { id: classId } };
        }

        const enrollment = await tx.schoolEnrollment.create({
          data,
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
            classRoomId: classId,
            classRoomName: result.classroom ? `${result.classroom.gradeLevel} ${result.classroom.name}` : "بدون کلاس",
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

const PatchStudentBody = z.object({
  firstName: z.string().min(1, "نام الزامی است.").optional(),
  lastName: z.string().min(1, "نام خانوادگی الزامی است.").optional(),
  nationalCode: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{10}$/.test(val) || val.startsWith("TEMP-"), {
      message: "کد ملی باید ۱۰ رقم باشد.",
    })
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string().regex(/^09\d{9}$/, "شماره موبایل نامعتبر است.").optional(),
  classRoomId: z.string().uuid("کلاس انتخاب‌شده نامعتبر است.").optional().or(z.literal("")).nullable(),
  guardianPhone1: z.string().regex(/^09\d{9}$/, "شماره ولی الزامی است.").optional(),
  guardianPhone2: z.string().regex(/^09\d{9}$/).optional().or(z.literal("")).nullable(),
  status: z.enum(["ACTIVE", "PENDING_CONFIRMATION", "ARCHIVED"]).optional(),
});

/**
 * PATCH /api/v1/principal/students?id=...
 *
 * Update student info (name, phone, national code) and enrollment details (class, guardian phones, status).
 */
export async function PATCH(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async (ctx) => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "شناسه ثبت‌نام (id) الزامی است." }, { status: 400 });
    }

    let body: z.infer<typeof PatchStudentBody>;
    try {
      body = PatchStudentBody.parse(await req.json());
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.issues?.[0]?.message ?? e?.errors?.[0]?.message ?? "ورودی نامعتبر" },
        { status: 400 }
      );
    }

    try {
      const enrollment = await db.schoolEnrollment.findUnique({
        where: { id },
        include: {
          student: true,
          classRoom: true,
        },
      });

      if (!enrollment) {
        return NextResponse.json({ ok: false, error: "پرونده ثبت‌نام دانش‌آموز یافت نشد." }, { status: 404 });
      }

      // Check conflict if nationalCode is being updated
      const patchNc = body.nationalCode?.trim();
      if (patchNc && patchNc !== enrollment.student.nationalCode) {
        const existingNc = await db.user.findUnique({
          where: { nationalCode: patchNc },
          select: { id: true },
        });
        if (existingNc && existingNc.id !== enrollment.studentUserId) {
          return NextResponse.json(
            { ok: false, error: "این کد ملی قبلاً برای کاربر دیگری در سیستم ثبت شده است." },
            { status: 409 }
          );
        }
      }

      // Check conflict if phoneNumber is being updated
      if (body.phoneNumber && body.phoneNumber !== enrollment.student.phoneNumber) {
        const existingPhone = await db.user.findUnique({
          where: { phoneNumber: body.phoneNumber },
          select: { id: true },
        });
        if (existingPhone && existingPhone.id !== enrollment.studentUserId) {
          return NextResponse.json(
            { ok: false, error: "این شماره موبایل قبلاً برای کاربر دیگری ثبت شده است." },
            { status: 409 }
          );
        }
      }

      // Check classroom exists if classRoomId is being updated
      if (body.classRoomId && body.classRoomId.trim() !== "" && body.classRoomId !== enrollment.classRoomId) {
        const classroom = await db.classRoom.findFirst({
          where: { id: body.classRoomId, schoolId: enrollment.schoolId },
        });
        if (!classroom) {
          return NextResponse.json({ ok: false, error: "کلاس درس مورد نظر یافت نشد." }, { status: 404 });
        }
      }

      // Execute update in transaction
      const updated = await db.$transaction(async (tx) => {
        // Update User
        const userUpdate: Record<string, unknown> = {};
        if (body.firstName) userUpdate.firstName = body.firstName;
        if (body.lastName) userUpdate.lastName = body.lastName;
        if (patchNc) userUpdate.nationalCode = patchNc;
        if (body.phoneNumber) userUpdate.phoneNumber = body.phoneNumber;

        if (Object.keys(userUpdate).length > 0) {
          await tx.user.update({
            where: { id: enrollment.studentUserId },
            data: userUpdate,
          });
        }

        // Update SchoolEnrollment
        const enrollmentUpdate: any = {};
        if (body.classRoomId !== undefined) {
          const cId = body.classRoomId?.trim() || null;
          if (cId) {
            enrollmentUpdate.classRoom = { connect: { id: cId } };
          } else {
            enrollmentUpdate.classRoom = { disconnect: true };
          }
        }
        if (body.guardianPhone1) enrollmentUpdate.guardianPhone1 = body.guardianPhone1;
        if (body.guardianPhone2 !== undefined) {
          enrollmentUpdate.guardianPhone2 = body.guardianPhone2 ? body.guardianPhone2 : null;
        }
        if (body.status) enrollmentUpdate.status = body.status;

        if (Object.keys(enrollmentUpdate).length > 0) {
          await tx.schoolEnrollment.update({
            where: { id },
            data: enrollmentUpdate,
          });
        }

        return tx.schoolEnrollment.findUnique({
          where: { id },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, phoneNumber: true, nationalCode: true },
            },
            classRoom: { select: { id: true, name: true, gradeLevel: true } },
          },
        });
      });

      return NextResponse.json({
        ok: true,
        student: {
          enrollmentId: updated!.id,
          studentId: updated!.student.id,
          firstName: updated!.student.firstName,
          lastName: updated!.student.lastName,
          fullName: `${updated!.student.firstName} ${updated!.student.lastName}`,
          phoneNumber: updated!.student.phoneNumber,
          nationalCode: updated!.student.nationalCode,
          classRoomId: updated!.classRoomId,
          classRoomName: updated!.classRoom ? `${updated!.classRoom.gradeLevel} ${updated!.classRoom.name}` : "بدون کلاس",
          gradeLevel: updated!.classRoom?.gradeLevel,
          guardianPhone1: updated!.guardianPhone1,
          guardianPhone2: updated!.guardianPhone2,
          academicYear: updated!.academicYear,
          status: updated!.status,
          createdAt: updated!.createdAt,
        },
      });
    } catch (err) {
      console.error("[students PATCH] error:", err);
      return NextResponse.json({ ok: false, error: "خطا در ویرایش اطلاعات دانش‌آموز." }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/v1/principal/students?id=...
 *
 * Remove a student enrollment from this school.
 */
export async function DELETE(req: NextRequest) {
  return withTenantContext(req, ["PRINCIPAL", "DEPUTY"], async () => {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "شناسه ثبت‌نام (id) الزامی است." }, { status: 400 });
    }

    try {
      const enrollment = await db.schoolEnrollment.findUnique({
        where: { id },
        select: { id: true, studentUserId: true, schoolId: true },
      });
      if (!enrollment) {
        return NextResponse.json({ ok: false, error: "پرونده ثبت‌نام دانش‌آموز یافت نشد." }, { status: 404 });
      }

      await db.schoolEnrollment.delete({
        where: { id },
      });

      return NextResponse.json({ ok: true, message: "عضویت دانش‌آموز در این مدرسه با موفقیت لغو شد." });
    } catch (err) {
      console.error("[students DELETE] error:", err);
      return NextResponse.json({ ok: false, error: "خطا در حذف دانش‌آموز از مدرسه." }, { status: 500 });
    }
  });
}
