"use client";

import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type TagStatus = "normal" | "active" | "disabled" | "hover";

export type TagProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  status?: TagStatus;
};

/**
 * 文本标签 — 对齐 Figma TextTag（normal / active 等状态）
 */
export function Tag({
  className,
  status = "normal",
  disabled,
  type = "button",
  ...props
}: TagProps) {
  const isDisabled = disabled || status === "disabled";

  const statusClass: Record<TagStatus, string> = {
    normal: "bg-tag-bg text-tag-text",
    active: "bg-tag-bg-active text-tag-text",
    disabled: "cursor-not-allowed bg-page text-text-muted opacity-60",
    hover: "bg-[#e8eaed] text-tag-text",
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "inline-flex h-[31px] items-center justify-center rounded-tag px-tag-x py-tag-y text-tag font-normal transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/15",
        statusClass[status],
        className
      )}
      {...props}
    />
  );
}
