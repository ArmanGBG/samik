import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

const BodySchema = z.object({
  action: z.enum(["ACTIVE", "ARCHIVED"]), // ACTIVE = Accept, ARCHIVED = Reject
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "احراز هویت الزامی است." }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.kind !== "root") {
    // Only allow root tokens (user hasn't selected a profile yet) or maybe contextual if they are switching
    if (!payload || payload.role !== "STUDENT" && payload.kind !== "root") {
        return NextResponse.json({ ok: false, error: "توکن نامعتبر است." }, { status: 401 });
    }
  }

  const userId = payload.userId;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: "ورودی نامعتبر" }, { status: 400 });
  }

  const { id } = await params;

  try {
    // Find the enrollment
    const enrollment = await db.schoolEnrollment.findUnique({
      where: { id },
      include: { student: { select: { phoneNumber: true } } },
    });

    if (!enrollment) {
      return NextResponse.json({ ok: false, error: "ثبت‌نام یافت نشد." }, { status: 404 });
    }

    // Ensure the logged-in user is actually the guardian (checking phone number)
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
    }

    const isGuardian =
      enrollment.guardianPhone1 === user.phoneNumber ||
      enrollment.guardianPhone2 === user.phoneNumber ||
      enrollment.student.phoneNumber === user.phoneNumber; // Student themselves if they use their own phone

    if (!isGuardian) {
      return NextResponse.json(
        { ok: false, error: "شما مجوز تأیید این دعوتنامه را ندارید." },
        { status: 403 }
      );
    }

    if (enrollment.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { ok: false, error: "این دعوتنامه قبلاً تعیین وضعیت شده است." },
        { status: 400 }
      );
    }

    // Update the enrollment status
    await db.schoolEnrollment.update({
      where: { id },
      data: { status: body.action },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CONFIRM_ENROLLMENT_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطای سرور در ذخیره اطلاعات." },
      { status: 500 }
    );
  }
}
