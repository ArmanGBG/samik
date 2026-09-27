"use client";

import { cn } from "@/lib/utils";
import { Check, X, Clock, FileText } from "lucide-react";

export type AttendanceState = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const STATES: Array<{
  value: AttendanceState;
  label: string;
  icon: typeof Check;
  activeClass: string;
  inactiveClass: string;
}> = [
  {
    value: "PRESENT",
    label: "حاضر",
    icon: Check,
    activeClass: "bg-emerald text-white shadow-emerald/30",
    inactiveClass: "bg-muted text-muted-foreground hover:bg-emerald/10",
  },
  {
    value: "ABSENT",
    label: "غایب",
    icon: X,
    activeClass: "bg-destructive text-white shadow-destructive/30",
    inactiveClass: "bg-muted text-muted-foreground hover:bg-destructive/10",
  },
  {
    value: "LATE",
    label: "تاخیر",
    icon: Clock,
    activeClass: "bg-warning text-white shadow-warning/30",
    inactiveClass: "bg-muted text-muted-foreground hover:bg-warning/10",
  },
  {
    value: "EXCUSED",
    label: "موجه",
    icon: FileText,
    activeClass: "bg-info text-white shadow-info/30",
    inactiveClass: "bg-muted text-muted-foreground hover:bg-info/10",
  },
];

/**
 * iOS-style 4-state toggle for attendance (Section 6 of architecture doc).
 *
 * Per Section 6 — "پیش‌فرض حاضر بودن همه":
 *   > "وقتی معلم کلاس را باز می‌کند، لیست تمام دانش‌آموزان با یک سوییچ
 *   >  شبیه iOS نمایش داده می‌شود که همه روی رنگ سبز (حاضر) هستند."
 *
 * Design: a pill-shaped segmented control. The active segment is colored
 * (emerald for present, red for absent, amber for late, blue for excused).
 * Tapping a segment sets the state. Tapping the active segment again does
 * nothing (no "off" state — every student must have a status).
 *
 * Default state is PRESENT (per the architecture doc).
 */
export function AttendanceToggle({
  value,
  onChange,
  size = "md",
}: {
  value: AttendanceState;
  onChange: (next: AttendanceState) => void;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-full bg-muted/50 border border-border",
        isSm ? "text-[10px]" : "text-xs"
      )}
      role="group"
    >
      {STATES.map((s) => {
        const Icon = s.icon;
        const isActive = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={cn(
              "flex items-center gap-1 rounded-full font-medium transition-all",
              isSm ? "px-2 py-0.5" : "px-3 py-1",
              isActive
                ? cn(s.activeClass, "shadow-md")
                : s.inactiveClass
            )}
            aria-pressed={isActive}
            title={s.label}
          >
            <Icon className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
