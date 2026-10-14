"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  RotateCcw,
} from "lucide-react";
import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toPersianDateLong, toPersianDate, toIsoDateString } from "@/lib/date-utils";

export const PERSIAN_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const WEEKDAY_NAMES = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

export interface PersianDatePickerProps {
  /**
   * ISO date string "YYYY-MM-DD" or full ISO timestamp.
   */
  value?: string | null;
  /**
   * Callback invoked when a date is selected, returning "YYYY-MM-DD" ISO string.
   */
  onChange?: (isoDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Suggested date (e.g. first Saturday of academic year).
   */
  suggestedDate?: string;
  suggestedLabel?: string;
}

export function PersianDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ شمسی...",
  disabled = false,
  className,
  suggestedDate,
  suggestedLabel,
}: PersianDatePickerProps) {
  const [open, setOpen] = useState(false);

  // Compute currently selected Jalali date (if valid value exists)
  const selectedJalali = useMemo(() => {
    if (!value) return null;
    const d = new Date(value.includes("T") ? value : value + "T00:00:00Z");
    if (isNaN(d.getTime())) return null;
    return toJalaali(d);
  }, [value]);

  // Today in Jalali
  const todayJalali = useMemo(() => toJalaali(new Date()), []);

  // View state: current viewed Jalali Year and Month (1-12)
  const [viewYear, setViewYear] = useState<number>(() => selectedJalali?.jy ?? todayJalali.jy);
  const [viewMonth, setViewMonth] = useState<number>(() => selectedJalali?.jm ?? todayJalali.jm);

  // When value changes from outside, sync view state if popover was closed
  useEffect(() => {
    if (selectedJalali && !open) {
      setViewYear(selectedJalali.jy);
      setViewMonth(selectedJalali.jm);
    }
  }, [selectedJalali, open]);

  // Calculate days in the currently viewed Jalali month
  const daysInMonth = useMemo(
    () => jalaaliMonthLength(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Calculate day-of-week offset for the 1st day of the month
  // In Iran, week starts on Saturday (شنبه).
  // JS getDay(): Sunday=0, Monday=1, ..., Saturday=6
  // Saturday offset = (d.getDay() + 1) % 7
  const startDayOffset = useMemo(() => {
    const g = toGregorian(viewYear, viewMonth, 1);
    const d = new Date(g.gy, g.gm - 1, g.gd);
    return (d.getDay() + 1) % 7;
  }, [viewYear, viewMonth]);

  // Month navigation
  function handlePrevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day: number) {
    const g = toGregorian(viewYear, viewMonth, day);
    const mm = String(g.gm).padStart(2, "0");
    const dd = String(g.gd).padStart(2, "0");
    const isoString = `${g.gy}-${mm}-${dd}`;
    onChange?.(isoString);
    setOpen(false);
  }

  function handleGoToToday() {
    setViewYear(todayJalali.jy);
    setViewMonth(todayJalali.jm);
    handleSelectDay(todayJalali.jd);
  }

  function handleSelectSuggested() {
    if (!suggestedDate) return;
    onChange?.(suggestedDate);
    const d = new Date(suggestedDate + "T00:00:00Z");
    if (!isNaN(d.getTime())) {
      const j = toJalaali(d);
      setViewYear(j.jy);
      setViewMonth(j.jm);
    }
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange?.("");
  }

  // Generate array of selectable years (e.g. 1400 to 1410)
  const availableYears = useMemo(() => {
    const startYear = 1400;
    const endYear = 1410;
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);
    return years;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-right font-normal h-10 px-3 cursor-pointer",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 ml-2 text-navy shrink-0" />
          <span className="flex-1 truncate">
            {value ? (
              <span className="font-medium text-foreground">
                {toPersianDateLong(value)}{" "}
                <span className="text-muted-foreground text-xs font-mono tabular-nums">
                  ({toPersianDate(value)})
                </span>
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          {value && !disabled && (
            <div role="button" tabIndex={0} onClick={handleClear} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1 cursor-pointer" title="پاک کردن"><X className="h-3.5 w-3.5" /></div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[320px] p-3 shadow-lg rounded-xl border border-navy/15 bg-card"
        dir="rtl"
      >
        {/* Header: Month / Year Selectors and Prev / Next */}
        <div className="flex items-center justify-between gap-1 pb-3 mb-2 border-b border-border/60">
          {/* Next month button (in RTL, points right visually for next) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 text-muted-foreground hover:text-navy cursor-pointer"
            title="ماه قبل"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5">
            {/* Month select */}
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="h-8 px-2 rounded-md bg-muted/50 border border-border text-xs font-medium text-navy cursor-pointer focus:outline-none focus:ring-1 focus:ring-navy"
            >
              {PERSIAN_MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            {/* Year select */}
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="h-8 px-2 rounded-md bg-muted/50 border border-border text-xs font-mono font-medium text-navy tabular-nums cursor-pointer focus:outline-none focus:ring-1 focus:ring-navy"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y.toLocaleString("fa-IR", { useGrouping: false })}
                </option>
              ))}
            </select>
          </div>

          {/* Prev month button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 text-muted-foreground hover:text-navy cursor-pointer"
            title="ماه بعد"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div
              key={w}
              className={cn(
                "h-7 flex items-center justify-center text-xs font-medium text-muted-foreground",
                idx === 6 && "text-destructive font-semibold" // Friday (جمعه)
              )}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day numbers grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty spacer slots before 1st of month */}
          {Array.from({ length: startDayOffset }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-8" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const isSelected =
              selectedJalali?.jy === viewYear &&
              selectedJalali?.jm === viewMonth &&
              selectedJalali?.jd === dayNum;
            const isToday =
              todayJalali.jy === viewYear &&
              todayJalali.jm === viewMonth &&
              todayJalali.jd === dayNum;
            const colIndex = (startDayOffset + idx) % 7;
            const isFriday = colIndex === 6;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={cn(
                  "h-8 w-full rounded-md text-xs font-mono tabular-nums transition-all flex items-center justify-center cursor-pointer",
                  isSelected
                    ? "bg-navy text-white font-bold shadow-sm"
                    : isToday
                    ? "border border-navy/40 font-bold text-navy hover:bg-navy/10"
                    : isFriday
                    ? "text-destructive/80 hover:bg-destructive/10"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {dayNum.toLocaleString("fa-IR")}
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts: Today + Suggested date */}
        <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between gap-1 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGoToToday}
            className="h-7 px-2 text-[11px] text-navy hover:bg-navy/10 gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            امروز ({todayJalali.jd.toLocaleString("fa-IR")} {PERSIAN_MONTH_NAMES[todayJalali.jm - 1]})
          </Button>

          {suggestedDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectSuggested}
              className="h-7 px-2 text-[11px] text-emerald hover:bg-emerald/10 border-emerald/30 gap-1 cursor-pointer"
            >
              {suggestedLabel ?? "پیشنهادی (۱ مهر)"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
