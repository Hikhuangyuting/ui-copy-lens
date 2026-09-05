"use client";

import {
  forwardRef,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  maxLength?: number;
  showCount?: boolean;
  onClear?: () => void;
};

/**
 * 多行输入 — 对齐 Figma TextArea（标签 + 浅底圆角区 + 右下角计数与清除）
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      label,
      className,
      maxLength = 1500,
      showCount = true,
      onClear,
      value,
      defaultValue,
      id,
      ...props
    },
    ref
  ) {
    const uid = useId();
    const fieldId = id ?? `textarea-${uid}`;
    const len =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
          ? defaultValue.length
          : 0;

    return (
      <div className={cn("flex w-full flex-col gap-4", className)}>
        {label ? (
          <label
            htmlFor={fieldId}
            className="text-panel-section font-normal text-text-label"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          <textarea
            ref={ref}
            id={fieldId}
            value={value}
            defaultValue={defaultValue}
            maxLength={maxLength}
            className={cn(
              "min-h-[160px] w-full resize-y rounded-input bg-surface-muted px-4 pb-10 pt-3 text-sm leading-normal text-text-primary placeholder:text-text-muted",
              "border-0 outline-none ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/10"
            )}
            {...props}
          />
          <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2">
            {showCount ? (
              <span className="pointer-events-auto text-toolbar text-text-muted">
                {len}/{maxLength}
              </span>
            ) : null}
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="pointer-events-auto rounded p-0.5 text-icon-muted hover:bg-black/5 hover:text-icon"
                aria-label="清空"
              >
                <Trash2 className="size-4" strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
