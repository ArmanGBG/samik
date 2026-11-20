"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ProfileEntry } from "@/stores/auth-store";
import { SamikLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight,
  School,
  UserCog,
  GraduationCap,
  Users,
  LogOut,
  ShieldAlert,
  Check,
  X,
  Building2,
  BookOpen,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JoinClassDialog } from "@/components/academy/join-class-dialog";

const ROLE_STYLES: Record<
  string,
  { icon: any; tint: string; ring: string }
> = {
  SUPER_ADMIN: { icon: UserCog, tint: "text-purple-600 bg-purple-50", ring: "hover:border-purple-400" },
  PRINCIPAL: { icon: School, tint: "text-navy bg-blue-50", ring: "hover:border-navy" },
  DEPUTY: { icon: Users, tint: "text-emerald bg-emerald-50", ring: "hover:border-emerald" },
  TEACHER: { icon: GraduationCap, tint: "text-info bg-sky-50", ring: "hover:border-info" },
  STUDENT: { icon: GraduationCap, tint: "text-warning bg-amber-50", ring: "hover:border-warning" },
  ACADEMY_MANAGER: { icon: Building2, tint: "text-amber-700 bg-amber-50", ring: "hover:border-amber-500" },
  ACADEMY_TEACHER: { icon: BookOpen, tint: "text-teal-700 bg-teal-50", ring: "hover:border-teal-500" },
  ACADEMY_ASSISTANT: { icon: Users, tint: "text-indigo-700 bg-indigo-50", ring: "hover:border-indigo-500" },
  ACADEMY_STUDENT: { icon: GraduationCap, tint: "text-emerald-700 bg-emerald-50", ring: "hover:border-emerald-500" },
};

function getRoleRoute(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "PRINCIPAL":
      return "/principal";
    case "DEPUTY":
      return "/deputy";
    case "TEACHER":
      return "/teacher";
    case "STUDENT":
      return "/student";
    case "ACADEMY_MANAGER":
      return "/academy";
    case "ACADEMY_TEACHER":
      return "/academy/teacher";
    case "ACADEMY_STUDENT":
      return "/academy/student";
    default:
      return `/${role.toLowerCase().replace("_", "-")}`;
  }
}

export default function SelectProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    auth.fetch();
  }, []);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (auth.state.status === "unauthenticated") {
      router.replace("/login");
      return;
    }
  }, [auth.state, router]);

  const isContextual = auth.state.status === "contextual";
  const contextualState = auth.state.status === "contextual" ? auth.state : null;
  const currentRole = contextualState?.role ?? null;
  const currentSchoolId = contextualState?.schoolId ?? null;
  const currentStudentEnrollmentId = contextualState?.studentEnrollmentId ?? null;

  async function selectProfile(p: ProfileEntry) {
    if (
      isContextual &&
      p.schoolId === currentSchoolId &&
      p.role === currentRole &&
      (p.role === "STUDENT" ? p.studentEnrollmentId === currentStudentEnrollmentId : true)
    ) {
      // Already on this profile — navigate straight to dashboard
      router.replace(getRoleRoute(p.role));
      return;
    }

    setSelecting(`${p.schoolId}:${p.role}${p.studentEnrollmentId ?? ""}`);
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
      toast.success(`ورود به ${data.profile.schoolName} با نقش ${data.profile.label ?? data.profile.role}`);
      await auth.fetch();
      router.replace(getRoleRoute(data.profile.role));
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSelecting(null);
    }
  }

  const [confirming, setConfirming] = useState<string | null>(null);
  async function handleConfirmEnrollment(enrollmentId: string, action: "ACTIVE" | "ARCHIVED") {
    setConfirming(`${enrollmentId}:${action}`);
    try {
      const r = await fetch(`/api/v1/student/enrollments/${enrollmentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!d.ok) {
        toast.error(d.error ?? "عملیات ناموفق بود.");
        return;
      }
      toast.success(action === "ACTIVE" ? "ثبت‌نام تأیید شد." : "دعوتنامه رد شد.");
      auth.fetch();
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور");
    } finally {
      setConfirming(null);
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

  const { firstName, lastName, profiles } = auth.state;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-offwhite via-white to-emerald-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-border/60">
        <CardHeader className="p-6 pb-2 space-y-3 text-center">
          <div className="flex justify-center stagger-item" style={{ animationDelay: "0ms" }}>
            <SamikLogo size={44} />
          </div>
          <div className="stagger-item" style={{ animationDelay: "30ms" }}>
            <CardTitle className="text-xl text-navy">
              {isContextual ? "تغییر نقش یا مدرسه" : "انتخاب پروفایل"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {firstName} {lastName} عزیز، خوش آمدید.
              <br />
              {isContextual
                ? "لطفاً نقش یا مدرسهٔ مورد نظر خود را برای جابه‌جایی انتخاب کنید."
                : "لطفاً پروفایل مورد نظر خود را برای ادامه انتخاب کنید."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-4 space-y-4">
          {isContextual && profiles.length === 1 && (
            <div className="rounded-lg bg-blue-50/70 border border-blue-200/60 p-3 text-xs text-navy leading-relaxed text-right">
              <span className="font-semibold ml-1">اطلاعیه:</span>
              در حال حاضر تنها همین یک نقش برای حساب کاربری شما در سامیک فعال است. در صورت تعریف نقش جدید توسط مدیر مدرسه، در این بخش قابل انتخاب خواهد بود.
            </div>
          )}

          {profiles.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="شما هنوز در هیچ مدرسه یا کلاسی عضو نیستید."
              description="برای دسترسی، باید توسط مدیر مدرسه اضافه شوید یا با داشتن کد کلاس، در یک کلاس کنکور عضو شوید."
              action={
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                  <Button
                    onClick={() => setJoinOpen(true)}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
                  >
                    <PlusCircle className="h-4 w-4" />
                    عضویت در کلاس کنکور با کد
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => auth.logout()}
                    className="cursor-pointer gap-2 text-xs h-9"
                  >
                    <LogOut className="h-4 w-4" />
                    خروج از حساب
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {profiles.map((p, i) => {
                const style = ROLE_STYLES[p.role] ?? ROLE_STYLES.TEACHER;
                const Icon = style.icon;
                const key = `${p.schoolId}:${p.role}${p.studentEnrollmentId ?? ""}`;
                const isPending = p.status === "PENDING_CONFIRMATION";
                const isSelecting = selecting === key;
                const isActive =
                  isContextual &&
                  p.schoolId === currentSchoolId &&
                  p.role === currentRole &&
                  (p.role === "STUDENT" ? p.studentEnrollmentId === currentStudentEnrollmentId : true);

                return (
                  <div
                    key={key + i}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={cn(
                      "stagger-item kpi-card w-full flex items-center gap-3 p-3.5 rounded-xl border-2",
                      "text-right select-none transition-all",
                      isActive
                        ? "border-emerald/50 bg-emerald-50/30 shadow-sm"
                        : "border-border bg-white",
                      isPending
                        ? "bg-warning/5 border-warning/30"
                        : "hover:shadow-md cursor-pointer",
                      !isActive && style.ring
                    )}
                    onClick={isPending ? undefined : () => selectProfile(p)}
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.label}
                        </p>
                        {p.type === "ACADEMY" && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] h-5 px-1.5 shrink-0 font-medium"
                          >
                            آموزشگاه کنکور
                          </Badge>
                        )}
                        {isActive && (
                          <Badge
                            variant="outline"
                            className="bg-emerald text-white border-transparent text-[10px] h-5 px-1.5 gap-1 shrink-0 font-medium"
                          >
                            <Check className="h-3 w-3" />
                            پروفایل فعلی
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5" dir="ltr">
                        {p.schoolSubdomain}.samik.app
                      </p>
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs bg-emerald hover:bg-emerald-600 gap-1 px-2"
                          disabled={confirming !== null}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.studentEnrollmentId) handleConfirmEnrollment(p.studentEnrollmentId, "ACTIVE");
                          }}
                        >
                          <Check className="h-3 w-3" /> تأیید
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 gap-1 px-2"
                          disabled={confirming !== null}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.studentEnrollmentId) handleConfirmEnrollment(p.studentEnrollmentId, "ARCHIVED");
                          }}
                        >
                          <X className="h-3 w-3" /> رد
                        </Button>
                      </div>
                    ) : isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-emerald hover:text-emerald-700 hover:bg-emerald-100/50 font-medium gap-1 px-2 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.replace(getRoleRoute(p.role));
                        }}
                      >
                        ورود به پنل
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:-translate-x-1" />
                    )}
                  </div>
                );
              })}

              <div className="pt-3 mt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {isContextual && currentRole ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        router.push(getRoleRoute(currentRole));
                      }}
                      className="w-full sm:w-auto text-navy cursor-pointer gap-2 text-xs h-9"
                    >
                      <ArrowRight className="h-4 w-4" />
                      بازگشت به پنل فعلی
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => setJoinOpen(true)}
                    className="w-full sm:w-auto text-purple-700 border-purple-300 hover:bg-purple-50 cursor-pointer gap-1.5 text-xs h-9"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    عضویت در کلاس کنکور جدید
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => auth.logout()}
                  className="w-full sm:w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-2 text-xs h-9"
                >
                  <LogOut className="h-4 w-4" />
                  خروج از حساب کاربری
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <JoinClassDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onSuccess={() => auth.fetch()}
      />
    </div>
  );
}
