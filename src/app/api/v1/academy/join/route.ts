import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";

import { checkRateLimit } from "@/lib/auth/rate-limiter";

const JoinBody = z.object({
  codeOrToken: z.string().min(1, "کد کلاس یا اطلاعات بارکد الزامی است."),
});

/**
 * POST /api/v1/academy/join
 *
 * Allows a student to join a Konkur Academy class via class code (CLS-XXXXXX)
 * or scanned QR token.
 */
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-samik-user-id");
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "احراز هویت نشده‌اید. لطفاً وارد شوید." },
      { status: 401 }
    );
  }

  // Rate limiting: max 10 join attempts per minute per user
  const rl = checkRateLimit(`join:${userId}`, {
    max: 10,
    windowMs: 60 * 1000,
  });
  if (rl.limited) {
    const waitSeconds = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      {
        ok: false,
        error: `تعداد تلاش‌ها بیش از حد مجاز است. لطفاً ${waitSeconds} ثانیه صبر کنید.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(waitSeconds) },
      }
    );
  }

  let body: z.infer<typeof JoinBody>;
  try {
    body = JoinBody.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.issues?.[0]?.message ?? "ورودی نامعتبر است." },
      { status: 400 }
    );
  }

  const input = body.codeOrToken.trim();

  try {
    return await runWithTenant({ bypassTenantFilter: true }, async () => {
      // Find class by ID (CLS-XXXXXX) or by qrToken
      const cls = await db.academyClass.findFirst({
        where: {
          OR: [
            { id: input.toUpperCase() },
            { qrToken: input },
          ],
        },
        include: {
          academy: { select: { id: true, name: true, status: true } },
          teacherUser: { select: { firstName: true, lastName: true } },
          sessions: {
            orderBy: { sessionNum: "desc" },
            take: 1,
            select: { sessionNum: true },
          },
        },
      });

      if (!cls || cls.academy.status !== "ACTIVE") {
        return NextResponse.json(
          { ok: false, error: "کلاس یا دوره مورد نظر یافت نشد یا معلق است." },
          { status: 404 }
        );
      }

      // Check existing enrollment
      const existing = await db.academyEnrollment.findUnique({
        where: {
          classId_studentUserId: {
            classId: cls.id,
            studentUserId: userId,
          },
        },
      });

      if (existing) {
        if (existing.status === "ACTIVE") {
          return NextResponse.json({
            ok: true,
            message: `شما در حال حاضر عضو کلاس «${cls.name}» هستید.`,
            alreadyMember: true,
            classItem: {
              id: cls.id,
              name: cls.name,
              academyName: cls.academy.name,
            },
          });
        } else {
          // Re-activate previously left student
          const currentMax = cls.sessions[0]?.sessionNum ?? 0;
          await db.academyEnrollment.update({
            where: { id: existing.id },
            data: {
              status: "ACTIVE",
              joinedAtSessionNum: currentMax + 1,
            },
          });

          return NextResponse.json({
            ok: true,
            message: `عضویت مجدد شما در کلاس «${cls.name}» با موفقیت فعال شد.`,
            classItem: {
              id: cls.id,
              name: cls.name,
              academyName: cls.academy.name,
            },
          });
        }
      }

      // Enrollment history rule:
      // joinedAtSessionNum = currentMaxSession + 1 so past sessions won't mark them absent!
      const currentMax = cls.sessions[0]?.sessionNum ?? 0;
      const joinedSessionNum = currentMax + 1;

      let enrollment;
      try {
        enrollment = await db.academyEnrollment.create({
          data: {
            classId: cls.id,
            studentUserId: userId,
            joinedAtSessionNum: joinedSessionNum,
            status: "ACTIVE",
          },
        });
      } catch (createErr: any) {
        if (createErr?.code === "P2002") {
          return NextResponse.json({
            ok: true,
            message: `شما در حال حاضر عضو کلاس «${cls.name}» هستید.`,
            alreadyMember: true,
            classItem: {
              id: cls.id,
              name: cls.name,
              academyName: cls.academy.name,
            },
          });
        }
        throw createErr;
      }

      return NextResponse.json({
        ok: true,
        message: `با موفقیت به کلاس «${cls.name}» پیوستید.`,
        classItem: {
          id: cls.id,
          name: cls.name,
          academyName: cls.academy.name,
          teacherName: cls.teacherUser
            ? `${cls.teacherUser.firstName} ${cls.teacherUser.lastName}`.trim()
            : "تعیین نشده",
          joinedAtSessionNum: joinedSessionNum,
        },
      });
    });
  } catch (err: any) {
    console.error("[JOIN_ACADEMY_CLASS_ERROR]", err);
    return NextResponse.json(
      { ok: false, error: "خطا در پیوستن به کلاس." },
      { status: 500 }
    );
  }
}
