"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToolBarProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 底部工具条 — 对齐 Figma Toolbar（白底、8px 圆角、内边距与分组间距）
 */
export function ToolBar({ children, className }: ToolBarProps) {
  return (
    <div
      role="toolbar"
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-toolbar bg-surface px-toolbar-x py-toolbar-y shadow-toolbar",
        className
      )}
    >
      {children}
    </div>
  );
}

export type ToolBarDividerProps = { className?: string };

export function ToolBarDivider({ className }: ToolBarDividerProps) {
  return (
    <div
      className={cn("h-3 w-px shrink-0 bg-stroke", className)}
      aria-hidden
    />
  );
}

export type ToolBarItemProps = {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export function ToolBarItem({
  icon: Lucide,
  children,
  onClick,
  className,
}: ToolBarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[5px] text-toolbar text-text-body transition-opacity hover:opacity-80",
        className
      )}
    >
      <Lucide className="size-4 shrink-0 text-icon" strokeWidth={1.5} />
      {children}
    </button>
  );
}
