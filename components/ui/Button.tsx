"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** 是否铺满父级宽度（不超过 Figma 主按钮 368px / 次按钮 240px） */
  constrained?: boolean;
  leftSlot?: ReactNode;
};

/**
 * 原子按钮 — 对齐 Figma PrimaryButton / SecondaryButton
 * @see https://www.figma.com/design/x4AId3eQ7MoTehZCB5XpJI/UI-%E6%96%87%E6%A1%88%E4%BC%98%E5%8C%96
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      constrained = true,
      leftSlot,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const base =
      "inline-flex h-14 min-h-[56px] shrink-0 items-center justify-center gap-2.5 rounded-button px-4 py-2 text-button font-normal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/20 disabled:cursor-not-allowed";

    const variants: Record<ButtonVariant, string> = {
      primary: cn(
        "bg-primary text-text-onPrimary hover:bg-primary-hover disabled:bg-primary-disabled",
        constrained && "w-full max-w-button-primary"
      ),
      secondary: cn(
        "border border-solid border-stroke bg-page text-text-primary hover:bg-[#e8eaed] disabled:opacity-50",
        constrained && "w-full max-w-button-secondary"
      ),
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(base, variants[variant], className)}
        {...props}
      >
        {leftSlot}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
