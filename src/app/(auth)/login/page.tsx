"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth-store";
import { SamikLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toAsciiDigitsOnly, toEnglishDigits } from "@/lib/persian-digits";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();

  // ── Password Login State ──
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── OTP Login State ──
  const [otpPhone, setOtpPhone] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // ── Forgot Password Dialog State ──
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (auth.state.status === "loading") return;
    if (auth.state.status === "unauthenticated") return;
    if (auth.state.status === "root") {
      router.replace("/select-profile");
    } else if (auth.state.status === "contextual") {
      const r = auth.state.role.toLowerCase().replace("_", "-");
      router.replace(`/${r}`);
    }
  }, [auth.state, router]);

  // Bootstrap session on mount
  useEffect(() => {
    auth.fetch();
  }, []);

  // ── 1. Submit Password Login ──
  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      const r = await fetch("/api/v1/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          rememberMe,
        }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "ورود ناموفق بود.");
        return;
      }

      toast.success(`خوش آمدید، ${data.user.firstName} ${data.user.lastName}`);
      await auth.fetch();

      if (data.profiles && data.profiles.length === 1) {
        // Auto-select single profile
        const p = data.profiles[0];
        const selRes = await fetch("/api/v1/auth/select-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: p.schoolId,
            role: p.role,
            studentEnrollmentId: p.studentEnrollmentId,
          }),
        });
        const selData = await selRes.json();
        if (selData.ok) {
          await auth.fetch();
          const slug = p.role.toLowerCase().replace("_", "-");
          router.replace(`/${slug}`);
          return;
        }
      }

      router.replace("/select-profile");
    } catch {
      toast.error("خطای شبکه در برقراری ارتباط با سرور.");
    } finally {
      setPasswordLoading(false);
    }
  }

  // ── 2. Submit OTP Login ──
  async function onOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const r = await fetch("/api/v1/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "خطا در ارسال کد.");
        return;
      }
      if (data.devCode) {
        toast.success(`کد یک‌بار مصرف (محیط توسعه): ${data.devCode}`, {
          duration: 8000,
        });
      } else {
        toast.success("کد تایید پیامک شد.");
      }
      router.push(`/verify?phone=${encodeURIComponent(otpPhone)}`);
    } catch {
      toast.error("خطای شبکه در برقراری ارتباط با سرور.");
    } finally {
      setOtpLoading(false);
    }
  }

  // ── 3. Forgot Password Request ──
  async function onForgotRequest(e: FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const r = await fetch("/api/v1/auth/password/forgot-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "خطا در ارسال کد تایید.");
        return;
      }
      setForgotMaskedPhone(data.maskedPhone);
      setForgotStep("reset");
      toast.success(data.message ?? "کد تایید ارسال شد.");
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setForgotLoading(false);
    }
  }

  // ── 4. Forgot Password Reset ──
  async function onForgotReset(e: FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const r = await fetch("/api/v1/auth/password/forgot-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          code: forgotCode,
          newPassword: forgotNewPass,
        }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "خطا در ثبت رمز عبور جدید.");
        return;
      }
      toast.success(data.message ?? "رمز عبور جدید ثبت شد.");
      setForgotOpen(false);
      setForgotStep("request");
      setIdentifier(forgotIdentifier);
      setPassword(forgotNewPass);
    } catch {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-offwhite via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="p-6 pb-2 space-y-3 text-center">
          <div className="flex justify-center stagger-item" style={{ animationDelay: "0ms" }}>
            <SamikLogo size={48} />
          </div>
          <div className="stagger-item" style={{ animationDelay: "30ms" }}>
            <CardTitle className="text-xl text-navy">سامیک</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              سامانه مدیریت هوشمند و یکپارچه مدارس
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <Tabs defaultValue="password" dir="rtl" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="password" className="text-xs cursor-pointer">
                ورود با رمز عبور
              </TabsTrigger>
              <TabsTrigger value="otp" className="text-xs cursor-pointer">
                ورود با پیامک (OTP)
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Password Login ── */}
            <TabsContent value="password">
              <form onSubmit={onPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-xs font-medium text-foreground">
                    نام کاربری (کد ملی یا شماره موبایل)
                  </Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="identifier"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="کد ملی ۱۰ رقمی یا شماره موبایل"
                      className="pr-10 pl-3 text-left font-mono tabular-nums h-10"
                      value={identifier}
                      onChange={(e) => setIdentifier(toAsciiDigitsOnly(e.target.value))}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground">
                      رمز عبور
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(identifier);
                        setForgotStep("request");
                        setForgotOpen(true);
                      }}
                      className="text-[11px] text-navy hover:text-navy/80 hover:underline cursor-pointer"
                    >
                      فراموشی رمز؟
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      placeholder="رمز عبور (پیش‌فرض: ۱۲۳۴۵۶)"
                      className="pr-10 pl-10 text-left font-mono h-10"
                      value={password}
                      onChange={(e) => setPassword(toEnglishDigits(e.target.value))}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse pt-1">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    مرا به خاطر بسپار (ورود ۳۰ روزه بدون نیاز به رمز مجدد)
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={passwordLoading || !identifier || !password}
                  className="w-full h-10 bg-navy hover:bg-navy-dark text-white font-medium cursor-pointer gap-2 mt-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>در حال بررسی...</span>
                    </>
                  ) : (
                    <>
                      <span>ورود به سامانه</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground pt-1">
                  💡 رمز عبور پیش‌فرض برای تمام دانش‌آموزان <span className="font-mono font-bold text-navy">123456</span> است.
                </p>
              </form>
            </TabsContent>

            {/* ── Tab 2: OTP Login ── */}
            <TabsContent value="otp">
              <form onSubmit={onOtpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otpPhone" className="text-xs font-medium text-foreground">
                    شماره موبایل
                  </Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="otpPhone"
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="09123456789"
                      className="pr-10 pl-3 text-left font-mono tabular-nums h-10"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(toAsciiDigitsOnly(e.target.value))}
                      required
                      pattern="09\d{9}"
                      maxLength={11}
                      autoComplete="tel"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    کد تایید ورود به این شماره پیامک می‌شود.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={otpLoading || !otpPhone}
                  className="w-full h-10 bg-emerald hover:bg-emerald-dark text-white font-medium cursor-pointer gap-2"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>در حال ارسال پیامک...</span>
                    </>
                  ) : (
                    <>
                      <span>دریافت کد پیامکی</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="p-6 pt-0 flex justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
            <span>سامانه احراز هویت امن و رمزنگاری‌شده</span>
          </div>
        </CardFooter>
      </Card>

      {/* ── Dialog: Forgot Password Self-Service ── */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base text-navy flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald" />
              <span>بازیابی رمز عبور</span>
            </DialogTitle>
            <DialogDescription>
              {forgotStep === "request"
                ? "کد ملی یا شماره موبایل خود را وارد کنید تا کد تایید پیامک شود."
                : `کد پیامک‌شده به شماره ${forgotMaskedPhone} را وارد کنید.`}
            </DialogDescription>
          </DialogHeader>

          {forgotStep === "request" ? (
            <form onSubmit={onForgotRequest} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-id" className="text-xs">کد ملی یا شماره موبایل</Label>
                <Input
                  id="f-id"
                  dir="ltr"
                  className="text-left font-mono h-9"
                  placeholder="09123456789 یا کد ملی ۱۰ رقمی"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(toAsciiDigitsOnly(e.target.value))}
                  required
                />
              </div>

              <DialogFooter className="pt-2 sm:justify-start gap-2">
                <Button
                  type="submit"
                  disabled={forgotLoading || !forgotIdentifier}
                  className="bg-navy hover:bg-navy-dark text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ارسال کد پیامکی"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotOpen(false)}
                  className="text-xs h-9 cursor-pointer"
                >
                  انصراف
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={onForgotReset} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-code" className="text-xs">کد ۶ رقمی پیامک‌شده</Label>
                <Input
                  id="f-code"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  className="text-center font-mono tracking-widest text-base h-10 font-bold"
                  placeholder="------"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(toAsciiDigitsOnly(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-new" className="text-xs">رمز عبور جدید</Label>
                <Input
                  id="f-new"
                  type="password"
                  dir="ltr"
                  placeholder="حداقل ۴ کاراکتر"
                  className="text-left font-mono h-9"
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(toEnglishDigits(e.target.value))}
                  required
                  minLength={4}
                />
              </div>

              <DialogFooter className="pt-2 sm:justify-start gap-2">
                <Button
                  type="submit"
                  disabled={forgotLoading || forgotCode.length !== 6 || forgotNewPass.length < 4}
                  className="bg-emerald hover:bg-emerald-dark text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت رمز جدید و بازگشت"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotStep("request")}
                  className="text-xs h-9 cursor-pointer"
                >
                  بازگشت
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
