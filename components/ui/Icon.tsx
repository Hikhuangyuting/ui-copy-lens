"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: 16,
  md: 24,
  lg: 40,
} as const;

export type IconProps = {
  /** Lucide 图标组件 */
  icon: LucideIcon;
  size?: keyof typeof SIZES;
  className?: string;
  strokeWidth?: number;
  "aria-label"?: string;
};

/**
 * 图标原子 — 统一 16 / 24 / 40 与描边色（对应 Figma Icon/16px、IconPlus、BrandLogo）
 */
export function Icon({
  icon: Lucide,
  size = "sm",
  className,
  strokeWidth = 1.5,
  "aria-label": ariaLabel,
}: IconProps) {
  const px = SIZES[size];
  return (
    <Lucide
      width={px}
      height={px}
      className={cn("shrink-0 text-icon", className)}
      strokeWidth={strokeWidth}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
