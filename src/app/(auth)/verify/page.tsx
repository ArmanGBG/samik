"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SamikLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

const RESEND_COOLDOWN = 120; // seconds

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function VerifyPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [phone, setPhone] = useState(search.get("phone") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const submittedRef = useRef(false);

  // Redirect to login if no phone in URL
  useEffect(() => {
    if (!phone) router.replace("/login");
  }, [phone, router]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !submittedRef.current) {
      submittedRef.current = true;
      // Fire submit via a microtask so the input value settles first
      queueMicrotask(() => {
        const form = document.getElementById(
          "verify-form"
        ) as HTMLFormElement | null;
        form?.requestSubmit();
      });
    }
  }, [code]);

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const r = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "کد نامعتبر است.");
        submittedRef.current = false;
        return;
      }
      toast.success("ورود موفقیت‌آمیز بود.");
      // Always route through the profile-switcher — it self-decides
      // whether to ask the user to pick a profile or auto-route.
      router.replace("/select-profile");
    } catch {
      submittedRef.current = false;
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendIn > 0 || resending) return;
    setResending(true);
    try {
      const r = await fetch("/api/v1/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await r.json();
      if (!data.ok) {
        toast.error(data.error ?? "خطا در ارسال مجدد کد.");
        return;
      }
      if (data.devCode) {
        toast.success(`کد یک‌بار مصرف (محیط توسعه): ${data.devCode}`, {
          duration: 8000,
        });
      } else {
        toast.success("کد جدید ارسال شد.");
      }
      setResendIn(RESEND_COOLDOWN);
      setCode("");
      submittedRef.current = false;
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-offwhite via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        {/* Header — compact p-6 */}
        <CardHeader className="p-6 pb-2 space-y-3 text-center">
          <div className="flex justify-center stagger-item" style={{ animationDelay: "0ms" }}>
            <SamikLogo size={48} />
          </div>
          <div className="stagger-item" style={{ animationDelay: "30ms" }}>
            <CardTitle className="text-xl text-navy">تأیید کد یک‌بار مصرف</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              کد ۶ رقمی ارسال‌شده به شماره{" "}
              <span dir="ltr" className="tabular-nums font-medium text-foreground">
                {phone || "خود"}
              </span>{" "}
              را وارد کنید.
            </CardDescription>
          </div>
        </CardHeader>
        <form id="verify-form" onSubmit={onSubmit}>
          <CardContent className="p-6 pt-4 space-y-4">
            <div
              className="stagger-item flex justify-center py-2"
              style={{ animationDelay: "60ms" }}
            >
              {/* CRITICAL: dir="ltr" on the wrapper forces the OTP slots
                  to render Left-to-Right regardless of the page's RTL.
                  Without this, the browser's RTL flex algorithm reverses
                  the slot order (slot 0 appears rightmost, slot 5 leftmost),
                  causing focus + input to flow in the wrong direction. */}
              <div dir="ltr" className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => setCode(v)}
                  autoFocus
                  inputMode="numeric"
                  pattern="^[0-9]*$"
                  containerClassName="justify-center"
                >
                  <InputOTPGroup className="flex-row" dir="ltr">
                    <InputOTPSlot index={0} className="h-12 w-10 text-lg font-mono tabular-nums" />
                    <InputOTPSlot index={1} className="h-12 w-10 text-lg font-mono tabular-nums" />
                    <InputOTPSlot index={2} className="h-12 w-10 text-lg font-mono tabular-nums" />
                    <InputOTPSlot index={3} className="h-12 w-10 text-lg font-mono tabular-nums" />
                    <InputOTPSlot index={4} className="h-12 w-10 text-lg font-mono tabular-nums" />
                    <InputOTPSlot index={5} className="h-12 w-10 text-lg font-mono tabular-nums" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {/* Resend countdown */}
            <div
              className="stagger-item flex items-center justify-center gap-2 text-xs text-muted-foreground"
              style={{ animationDelay: "90ms" }}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
              <span>کد را دریافت نکرده‌اید؟</span>
              {resendIn > 0 ? (
                <span className="tabular-nums font-medium text-foreground">
                  ارسال مجدد تا {fa(resendIn)} ثانیه
                </span>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-navy cursor-pointer"
                  onClick={onResend}
                  disabled={resending}
                >
                  {resending ? (
                    <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="ml-1 h-3 w-3" />
                  )}
                  ارسال مجدد کد
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-2 flex flex-col gap-3">
            <Button
              type="submit"
              className="stagger-item w-full h-10 bg-emerald hover:bg-emerald-dark cursor-pointer"
              style={{ animationDelay: "120ms" }}
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال بررسی...
                </>
              ) : (
                "ورود به سامیک"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="stagger-item w-full text-muted-foreground hover:text-navy cursor-pointer"
              style={{ animationDelay: "150ms" }}
              onClick={() => router.push("/login")}
            >
              <ArrowRight className="ml-1 h-4 w-4" />
              تغییر شماره موبایل
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
