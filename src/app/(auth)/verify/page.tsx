"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Loader2, ShieldCheck } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [phone, setPhone] = useState(search.get("phone") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) router.replace("/login");
  }, [phone, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
        return;
      }
      toast.success("ورود موفقیت‌آمیز بود.");
      // Always route through the profile-switcher — it self-decides
      // whether to ask the user to pick a profile or auto-route.
      router.replace("/select-profile");
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
            <CardTitle className="text-2xl text-navy">تأیید کد</CardTitle>
            <CardDescription className="text-sm">
              کد ۶ رقمی ارسال‌شده به شماره {phone || "خود"} را وارد کنید.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">کد یک‌بار مصرف</Label>
              <div className="relative">
                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="123456"
                  className="pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-emerald hover:bg-emerald-dark"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال بررسی...
                </>
              ) : (
                "ورود"
              )}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-sm text-muted-foreground hover:text-navy transition"
            >
              ← تغییر شماره موبایل
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
