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
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  School,
  UserCog,
  GraduationCap,
  Users,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<
  string,
  { icon: any; tint: string; ring: string }
> = {
  SUPER_ADMIN: { icon: UserCog, tint: "text-purple-600 bg-purple-50", ring: "hover:border-purple-400" },
  PRINCIPAL: { icon: School, tint: "text-navy bg-blue-50", ring: "hover:border-navy" },
  DEPUTY: { icon: Users, tint: "text-emerald bg-emerald-50", ring: "hover:border-emerald" },
  TEACHER: { icon: GraduationCap, tint: "text-info bg-sky-50", ring: "hover:border-info" },
  STUDENT: { icon: GraduationCap, tint: "text-warning bg-amber-50", ring: "hover:border-warning" },
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
      <Card className="w-full max-w-2xl shadow-xl border-border/60">
        <CardHeader className="p-6 pb-2 space-y-3 text-center">
          <div className="flex justify-center stagger-item" style={{ animationDelay: "0ms" }}>
            <SamikLogo size={44} />
          </div>
          <div className="stagger-item" style={{ animationDelay: "30ms" }}>
            <CardTitle className="text-xl text-navy">انتخاب پروفایل</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {firstName} {lastName} عزیز، خوش آمدید.
              <br />
              لطفاً پروفایل مورد نظر خود را برای ادامه انتخاب کنید.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          {profiles.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="شما هنوز در هیچ مدرسه‌ای ثبت نشده‌اید."
              description="برای دسترسی به سامانه، باید توسط مدیر مدرسه‌ای به پلتفرم دعوت شوید. اگر فکر می‌کنید این خطا است، با پشتیبانی تماس بگیرید."
              action={
                <Button
                  variant="outline"
                  onClick={() => auth.logout()}
                  className="cursor-pointer"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  خروج از حساب
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
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
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={cn(
                      "stagger-item kpi-card w-full flex items-center gap-3 p-3 rounded-lg border-2",
                      "border-border bg-white text-right cursor-pointer",
                      "hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
                      style.ring
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
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
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums" dir="ltr">
                        {p.schoolSubdomain}.samik.app
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
              <div className="pt-3 mt-2 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => auth.logout()}
                  className="w-full text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <LogOut className="ml-2 h-4 w-4" />
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
