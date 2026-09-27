import { cn } from "@/lib/utils";

/**
 * Samik brand mark — a stylised "س" (first letter of سامیک) inside a navy
 * hexagonal badge. Used in the sidebar header and the auth screen.
 */
export function SamikLogo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="samik-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#1E2F73" />
        </linearGradient>
      </defs>
      <path
        d="M24 2 L42 12 V36 L24 46 L6 36 V12 Z"
        fill="url(#samik-navy)"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M30 18 C30 22 27 24 22 24 C18 24 16 26 16 30"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="22" cy="24" r="2.5" fill="#10B981" />
    </svg>
  );
}
