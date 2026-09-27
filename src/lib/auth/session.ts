import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/prisma/tenant-context";

/**
 * Build the user's `roles` map (schoolId → role[]) for the JWT payload.
 * Used right after OTP verification to mint a Root Token.
 *
 * Per Section 2: a user may hold multiple roles across multiple schools
 * (e.g. TEACHER in school_A, PARENT in school_B). This map drives the
 * Profile Switcher UI.
 *
 * The query bypasses the tenant filter (we want cross-tenant memberships).
 */
export interface ProfileEntry {
  schoolId: string;
  schoolName: string;
  schoolSubdomain: string;
  role: string;
  /** For STUDENT/PARENT profiles, identifies which enrollment this is. */
  studentEnrollmentId?: string;
  /** Display label for the switcher (e.g. "ولیِ علی — مدرسه الف"). */
  label: string;
}

export async function buildUserProfiles(userId: string): Promise<ProfileEntry[]> {
  return runWithTenant({ bypassTenantFilter: true }, async () => {
    const profiles: ProfileEntry[] = [];

    // === SuperAdmin (Global Scope) ===
    // Per Section 2: SuperAdmin is a global role, not tied to any school.
    // For dev: any user whose phone is in SAMIK_SUPER_ADMIN_PHONES env var
    // (comma-separated) gets the SUPER_ADMIN profile. In prod, this list
    // lives in a managed config table.
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      const superAdminPhones = (process.env.SAMIK_SUPER_ADMIN_PHONES ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (superAdminPhones.includes(user.phoneNumber)) {
        profiles.push({
          schoolId: "__global__", // sentinel — the SuperAdmin has no school
          schoolName: "پلتفرم سامیک",
          schoolSubdomain: "platform",
          role: "SUPER_ADMIN",
          label: "مدیر سامانه — پلتفرم سامیک",
        });
      }
    }

    // === Staff roles (PRINCIPAL / DEPUTY / TEACHER) ===
    const employments = await db.staffEmployment.findMany({
      where: { userId },
      include: { school: true },
    });

    for (const e of employments) {
      profiles.push({
        schoolId: e.schoolId,
        schoolName: e.school.name,
        schoolSubdomain: e.school.subdomain,
        role: e.role,
        label: `${roleToPersian(e.role)} — ${e.school.name}`,
      });
    }

    // === Student/Guardian profiles ===
    if (user) {
      const enrollments = await db.schoolEnrollment.findMany({
        where: {
          OR: [{ guardianPhone1: user.phoneNumber }, { guardianPhone2: user.phoneNumber }],
          status: { in: ["ACTIVE", "PENDING_CONFIRMATION"] },
        },
        include: { school: true, student: true },
      });
      for (const en of enrollments) {
        profiles.push({
          schoolId: en.schoolId,
          schoolName: en.school.name,
          schoolSubdomain: en.school.subdomain,
          role: "STUDENT",
          studentEnrollmentId: en.id,
          label: `دانش‌آموز/ولی ${en.student.firstName} ${en.student.lastName} — ${en.school.name}`,
        });
      }
    }

    return profiles;
  });
}

export function roleToPersian(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "مدیر سامانه",
    PRINCIPAL: "مدیر مدرسه",
    DEPUTY: "ناظم / معاون",
    TEACHER: "معلم",
    STUDENT: "دانش‌آموز / ولی",
  };
  return map[role] ?? role;
}

/**
 * Convenience: look up a single user by phone, return the lean record
 * for JWT minting (no PII leaks past this boundary).
 */
export async function findUserByPhone(phone: string) {
  return db.user.findUnique({
    where: { phoneNumber: phone },
    select: { id: true, phoneNumber: true, firstName: true, lastName: true },
  });
}

export async function findUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, phoneNumber: true, firstName: true, lastName: true },
  });
}
