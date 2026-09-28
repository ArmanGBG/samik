"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COMMON_TAGS = [
  "حل پای تخته",
  "بی‌نظمی",
  "همراه نداشتن کتاب",
  "پاسخ سوال",
  "مشارکت فعال",
  "تاخیر",
  "بی‌احترامی",
];

/**
 * Quick Behavioral Point Buttons (Section 7 — "سیستم ثبت سریع امتیاز").
 *
 * Two buttons: [+] (green, positive) and [-] (red, negative).
 * Per the architecture doc:
 *   - Default action: one-tap registration (no tag required).
 *   - Long-press (500ms+): opens a popover with a tag input + quick tags.
 *
 * On tap: immediately calls POST /api/v1/behavioral-points.
 * On long-press release: opens the tag menu (no auto-submit on release).
 */
export function QuickPointButtons({
  studentUserId,
  studentName,
  classSessionId,
  size = "sm",
  onSubmitted,
}: {
  studentUserId: string;
  studentName: string;
  classSessionId?: string;
  size?: "sm" | "md";
  onSubmitted?: (type: "POSITIVE" | "NEGATIVE") => void;
}) {
  const [loading, setLoading] = useState<"POSITIVE" | "NEGATIVE" | null>(null);
  const [tagMenuOpen, setTagMenuOpen] = useState<"POSITIVE" | "NEGATIVE" | null>(null);
  const [tagInput, setTagInput] = useState("");

  // Long-press detection
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const startPress = useCallback((type: "POSITIVE" | "NEGATIVE") => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setTagMenuOpen(type);
    }, 500);
  }, []);

  const endPress = useCallback(
    async (type: "POSITIVE" | "NEGATIVE") => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      // If a long-press happened (tag menu opened), don't submit on release
      if (longPressed.current) return;
      await submit(type);
    },
    []
  );

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  async function submit(
    type: "POSITIVE" | "NEGATIVE",
    reasonTag?: string
  ) {
    setLoading(type);
    try {
      const res = await fetch("/api/v1/behavioral-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUserId,
          pointType: type,
          reasonTag: reasonTag || undefined,
          classSessionId,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? "ثبت امتیاز ناموفق بود.");
        return;
      }
      toast.success(
        type === "POSITIVE"
          ? `امتیاز مثبت برای ${studentName}${reasonTag ? ` (${reasonTag})` : ""} ثبت شد.`
          : `امتیاز منفی برای ${studentName}${reasonTag ? ` (${reasonTag})` : ""} ثبت شد.`
      );
      onSubmitted?.(type);
    } catch (err) {
      toast.error("خطای شبکه — آفلاین هستید؟");
    } finally {
      setLoading(null);
      setTagMenuOpen(null);
      setTagInput("");
    }
  }

  const isSm = size === "sm";

  return (
    <div className="flex items-center gap-1">
      {/* Positive button + long-press popover */}
      <Popover open={tagMenuOpen === "POSITIVE"} onOpenChange={(o) => !o && setTagMenuOpen(null)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={loading !== null}
            onPointerDown={() => startPress("POSITIVE")}
            onPointerUp={() => endPress("POSITIVE")}
            onPointerLeave={cancelPress}
            className={cn(
              "rounded-full flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90",
              "bg-emerald/10 text-emerald hover:bg-emerald hover:text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSm ? "h-7 w-7" : "h-9 w-9"
            )}
            aria-label={`ثبت امتیاز مثبت برای ${studentName}`}
            title="امتیاز مثبت (نگه دارید برای انتخاب علت)"
          >
            {loading === "POSITIVE" ? (
              <Loader2 className={isSm ? "h-3 w-3 animate-spin" : "h-4 w-4 animate-spin"} />
            ) : (
              <Plus className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} />
            )}
          </button>
        </PopoverTrigger>
        {tagMenuOpen === "POSITIVE" && (
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald">ثبت امتیاز مثبت برای {studentName}</p>
              <Input
                autoFocus
                placeholder="علت تشویق (اختیاری)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit("POSITIVE", tagInput || undefined);
                }}
              />
              <div className="flex flex-wrap gap-1">
                {COMMON_TAGS.slice(0, 4).map((t) => (
                  <button
                    key={t}
                    onClick={() => submit("POSITIVE", t)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald/10 text-emerald hover:bg-emerald hover:text-white transition cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => submit("POSITIVE", tagInput || undefined)}
                className="w-full bg-emerald hover:bg-emerald-dark cursor-pointer font-medium"
              >
                تأیید و ثبت امتیاز مثبت
              </Button>
            </div>
          </PopoverContent>
        )}
      </Popover>

      {/* Negative button + long-press popover */}
      <Popover open={tagMenuOpen === "NEGATIVE"} onOpenChange={(o) => !o && setTagMenuOpen(null)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={loading !== null}
            onPointerDown={() => startPress("NEGATIVE")}
            onPointerUp={() => endPress("NEGATIVE")}
            onPointerLeave={cancelPress}
            className={cn(
              "rounded-full flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90",
              "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSm ? "h-7 w-7" : "h-9 w-9"
            )}
            aria-label={`ثبت امتیاز منفی برای ${studentName}`}
            title="امتیاز منفی (نگه دارید برای انتخاب علت)"
          >
            {loading === "NEGATIVE" ? (
              <Loader2 className={isSm ? "h-3 w-3 animate-spin" : "h-4 w-4 animate-spin"} />
            ) : (
              <Minus className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} />
            )}
          </button>
        </PopoverTrigger>
        {tagMenuOpen === "NEGATIVE" && (
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive">ثبت تذکر یا امتیاز منفی برای {studentName}</p>
              <Input
                autoFocus
                placeholder="علت تذکر (اختیاری)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit("NEGATIVE", tagInput || undefined);
                }}
              />
              <div className="flex flex-wrap gap-1">
                {COMMON_TAGS.slice(4).map((t) => (
                  <button
                    key={t}
                    onClick={() => submit("NEGATIVE", t)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => submit("NEGATIVE", tagInput || undefined)}
                className="w-full bg-destructive hover:bg-destructive/90 cursor-pointer font-medium"
              >
                تأیید و ثبت امتیاز منفی
              </Button>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
