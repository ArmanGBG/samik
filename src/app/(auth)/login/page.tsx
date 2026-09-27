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
import { Loader2, Phone } from "lucide-react";

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
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <SamikLogo size={56} />
          </div>
          <div>
            <CardTitle className="text-2xl text-navy">سامیک</CardTitle>
            <CardDescription className="text-sm">
              سامانه مدیریت یکپارچه کلاس
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">شماره موبایل</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="09123456789"
                  className="pr-10 text-right font-mono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  pattern="09\d{9}"
                  maxLength={11}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                کد یک‌بار مصرف به این شماره پیامک می‌شود.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-navy hover:bg-navy-dark"
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
