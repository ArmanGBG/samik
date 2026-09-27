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
import { toast } from "sonner";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/v1/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
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
        toast.success("کد یک‌بار مصرف ارسال شد.");
      }
      // Pass phone via URL search to prefill the verify page
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-offwhite via-white to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        {/* Header — compact p-6 (was p-8) */}
        <CardHeader className="p-6 pb-2 space-y-3 text-center">
          <div className="flex justify-center stagger-item" style={{ animationDelay: "0ms" }}>
            <SamikLogo size={48} />
          </div>
          <div className="stagger-item" style={{ animationDelay: "30ms" }}>
            <CardTitle className="text-xl text-navy">سامیک</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              سامانه مدیریت یکپارچه کلاس
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="p-6 pt-4 space-y-4">
            <div className="stagger-item space-y-1.5" style={{ animationDelay: "60ms" }}>
              <Label htmlFor="phone" className="text-xs font-medium text-foreground">
                شماره موبایل
              </Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="09123456789"
                  className="pr-10 pl-3 text-right tabular-nums h-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  pattern="09\d{9}"
                  maxLength={11}
                  autoComplete="tel"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                کد یک‌بار مصرف به این شماره پیامک می‌شود.
              </p>
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-2 flex flex-col gap-3">
            <Button
              type="submit"
              className="stagger-item w-full h-10 bg-navy hover:bg-navy-dark cursor-pointer"
              style={{ animationDelay: "90ms" }}
              disabled={loading || !/^09\d{9}$/.test(phone)}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ارسال...
                </>
              ) : (
                "ارسال کد یک‌بار مصرف"
              )}
            </Button>

            {/* Demo mode hint — shown in development */}
            {process.env.NODE_ENV === "development" && (
              <p className="stagger-item text-[11px] text-muted-foreground/80 leading-relaxed text-center mt-1 flex items-start gap-1.5 justify-center" style={{ animationDelay: "120ms" }}>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald" />
                <span>
                  کد یک‌بار مصرف در محیط توسعه در نوتیفیکیشن نمایش داده می‌شود.
                </span>
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
