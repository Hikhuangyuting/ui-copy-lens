"use client";

import confetti from "canvas-confetti";
import type { ComponentPropsWithoutRef } from "react";

type ConfettiButtonProps = ComponentPropsWithoutRef<"button">;

export function ConfettiButton({ children, onClick, ...props }: ConfettiButtonProps) {
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.65 },
        });
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
