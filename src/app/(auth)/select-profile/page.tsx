"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ProfileEntry } from "@/stores/auth-store";
import { SamikLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, School, UserCog, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<string, { icon: any; tint: string }> = {
  SUPER_ADMIN: { icon: UserCog, tint: "text-purple-600 bg-purple-50" },
  PRINCIPAL: { icon: School, tint: "text-navy bg-blue-50" },
  DEPUTY: { icon: Users, tint: "text-emerald bg-emerald-50" },
  TEACHER: { icon: GraduationCap, tint: "text-info bg-sky-50" },
  STUDENT: { icon: GraduationCap, tint: "text-warning bg-amber-50" },
};

export default function SelectProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    auth.fetch();
  }, []);

  // Bootstrap effect: if only ONE profile, auto-select it.
  useEffect(() => {
    if (auth.state.status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (auth.state.status !== "root") return;
    if (auth.state.profiles.length === 0) {
      // No profiles — show "access denied" state
      return;
    }
    // Note: do NOT auto-select even when there's only one profile — the
    // explicit click is intentional (Section 3: "انتخاب کانتکست").
  }, [auth.state, router]);

  async function selectProfile(p: ProfileEntry) {
    setSelecting(`${p.schoolId}:${p.role}`);
    try {
      const r = await fetch("/api/v1/auth/select-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: p.schoolId,
          role: p.role,
          studentEnrollmentId: p.studentEnrollmentId,
        }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "انتخاب پروفایل ناموفق بود.");
        return;
      }
      toast.success(`ورود به ${data.profile.schoolName} با نقش ${data.profile.role}`);
      const slug = data.profile.role.toLowerCase().replace("_", "-");
      router.replace(`/${slug}`);
    } finally {
      setSelecting(null);
    }
  }

  if (auth.state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  if (auth.state.status === "unauthenticated") {
    return null; // effect will redirect
  }

  if (auth.state.status === "contextual") {
    // Already contextual — bounce to dashboard
    const slug = auth.state.role.toLowerCase().replace("_", "-");
    router.replace(`/${slug}`);
    return null;
  }

  // Root state
  const { firstName, lastName, profiles } = auth.state;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-offwhite via-white to-emerald-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <SamikLogo size={48} />
          </div>
          <div>
            <CardTitle className="text-2xl text-navy">
              انتخاب پروفایل
            </CardTitle>
            <CardDescription>
              {firstName} {lastName} عزیز، خوش آمدید.
              <br />
              لطفاً پروفایل مورد نظر خود را برای ادامه انتخاب کنید.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="text-5xl">🔒</div>
              <p className="text-lg font-medium text-foreground">
                شما هنوز در هیچ مدرسه‌ای ثبت نشده‌اید.
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                برای دسترسی به سامانه، باید توسط مدیر مدرسه‌ای به پلتفرم دعوت
                شوید. اگر فکر می‌کنید این خطا است، با پشتیبانی تماس بگیرید.
              </p>
              <Button
                variant="outline"
                onClick={() => auth.logout()}
                className="mt-4"
              >
                خروج از حساب
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((p, i) => {
                const style = ROLE_STYLES[p.role] ?? ROLE_STYLES.TEACHER;
                const Icon = style.icon;
                const key = `${p.schoolId}:${p.role}${p.studentEnrollmentId ?? ""}`;
                const isSelecting = selecting === key;
                return (
                  <button
                    key={key + i}
                    onClick={() => selectProfile(p)}
                    disabled={isSelecting}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                      "hover:border-navy hover:bg-navy/5 hover:shadow-md",
                      "border-border bg-white text-right",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                        style.tint
                      )}
                    >
                      {isSelecting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {p.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        زیردامنه: {p.schoolSubdomain}
                      </p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
              <div className="pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => auth.logout()}
                  className="w-full"
                >
                  خروج از حساب
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
