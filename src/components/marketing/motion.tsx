"use client";

import { motion, type Variants } from "framer-motion";

/**
 * Shared Framer Motion variants + reusable Reveal wrapper for the
 * Samik landing page.
 *
 * Design philosophy: subtle, professional, enterprise EdTech.
 * No flashy spring physics — just smooth ease-out fades and slide-ups.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const; // expo-out

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE_OUT } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Use "fadeUp" (default) or "fadeIn" or "scaleIn". */
  variant?: "fadeUp" | "fadeIn" | "scaleIn";
  /** When true, animation runs once on mount (no scroll trigger). */
  immediate?: boolean;
}

/**
 * Scroll-reveal wrapper. Uses viewport-based triggering so animations
 * fire when the element scrolls into view.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "fadeUp",
  immediate = false,
}: RevealProps) {
  const variants =
    variant === "fadeIn" ? fadeIn : variant === "scaleIn" ? scaleIn : fadeUp;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial={immediate ? "visible" : "hidden"}
      animate={immediate ? "visible" : undefined}
      whileInView={immediate ? undefined : "visible"}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
