"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "./scroll-reveal";

type TrendDirection = "up" | "down" | "neutral";

interface KpiCardProps {
  /** Label in Persian (e.g. "کل جلسات") */
  label: string;
  /** Numeric value — will be rendered with Persian numerals */
  value: number | string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Color tint: navy | emerald | destructive | warning | info */
  tint?: "navy" | "emerald" | "destructive" | "warning" | "info";
  /** Optional trend indicator */
  trend?: {
    direction: TrendDirection;
    value: string;
  };
  /** Optional sub-label (e.g. "از ماه گذشته") */
  sublabel?: string;
  /** Stagger delay for scroll reveal (ms) */
  delay?: number;
}

const TINTS: Record<string, { bg: string; text: string; iconBg: string; iconText: string }> = {
  navy: {
    bg: "bg-navy/5 border-navy/20",
    text: "text-navy",
    iconBg: "bg-navy/10",
    iconText: "text-navy",
  },
  emerald: {
    bg: "bg-emerald/5 border-emerald/20",
    text: "text-emerald",
    iconBg: "bg-emerald/10",
    iconText: "text-emerald",
  },
  destructive: {
    bg: "bg-destructive/5 border-destructive/20",
    text: "text-destructive",
    iconBg: "bg-destructive/10",
    iconText: "text-destructive",
  },
  warning: {
    bg: "bg-warning/5 border-warning/20",
    text: "text-warning",
    iconBg: "bg-warning/10",
    iconText: "text-warning",
  },
  info: {
    bg: "bg-info/5 border-info/20",
    text: "text-info",
    iconBg: "bg-info/10",
    iconText: "text-info",
  },
};

const TREND_ICONS: Record<TrendDirection, string> = {
  up: "↗",
  down: "↘",
  neutral: "→",
};

/**
 * KPI Card — unified stat display for all dashboards.
 *
 * Per UI/UX Pro Max skill (Data-Dense Dashboard style):
 *   - Compact padding (p-4 = 16px)
 *   - Tabular numbers for aligned digits
 *   - Hover lift animation (y: -2px, 250ms expo-out)
 *   - Color-coded by metric type
 *   - Icon container with tinted background
 *   - Optional trend indicator with directional arrow
 *
 * Used across: SuperAdmin, Principal, Deputy, Teacher, Student dashboards.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tint = "navy",
  trend,
  sublabel,
  delay = 0,
}: KpiCardProps) {
  const t = TINTS[tint];

  return (
    <ScrollReveal delay={delay}>
      <div
        className={cn(
          "kpi-card rounded-xl border p-4 flex items-center gap-3",
          t.bg
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            t.iconBg,
            t.iconText
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={cn(
                "text-2xl font-bold tabular-nums leading-none",
                t.text
              )}
            >
              {typeof value === "number"
                ? value.toLocaleString("fa-IR")
                : value}
            </span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  trend.direction === "up" && "text-emerald",
                  trend.direction === "down" && "text-destructive",
                  trend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                {TREND_ICONS[trend.direction]} {trend.value}
              </span>
            )}
          </div>
          {sublabel && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}

/**
 * KPI Card Grid — renders a responsive row of KPI cards with stagger.
 * Used at the top of every dashboard.
 */
export function KpiCardGrid({
  cards,
}: {
  cards: Omit<KpiCardProps, "delay">[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <KpiCard key={i} {...card} delay={i * 60} />
      ))}
    </div>
  );
}
