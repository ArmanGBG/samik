"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AcademyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ACADEMY_ROUTE_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-2xl p-6 md:p-8 text-center space-y-5 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            خطا در بارگذاری بخش آموزشگاه
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            متأسفانه در پردازش اطلاعات آموزشگاه خطایی رخ داد. می‌توانید مجدداً تلاش کنید یا به صفحه اصلی بازگردید.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/60">
              کد پیگیری خطا: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              بازگشت به داشبورد
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
