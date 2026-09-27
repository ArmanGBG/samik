"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Page title in Persian */
  title: string;
  /** Optional subtitle/description (string or JSX for inline rich content) */
  subtitle?: React.ReactNode;
  /** Optional Lucide icon */
  icon?: LucideIcon;
  /** Optional right-side actions (buttons, badges, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — unified page header for all dashboard pages.
 *
 * Per UI/UX Pro Max (Data-Dense Dashboard style):
 *   - Compact: title (text-xl font-bold) + subtitle (text-sm muted)
 *   - Icon in a tinted container (optional)
 *   - Actions aligned to the left (RTL: visually right)
 *   - Sticky-safe (doesn't overlap topbar)
 *
 * `subtitle` accepts ReactNode so callers can mix text with inline tabular-nums
 * spans or LTR spans for times (used by teacher roll-call + gradebook headers).
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 flex-wrap mb-6",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-navy tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
