import NextImage, { type ImageProps as NextImageProps } from "next/image";
import { cn } from "@/lib/cn";

export type UiImageProps = NextImageProps & {
  /** 与 Figma 卡片圆角一致 */
  rounded?: "card" | "input" | "tag" | "none";
};

const ROUNDED = {
  card: "rounded-card",
  input: "rounded-input",
  tag: "rounded-tag",
  none: "",
} as const;

/**
 * 图片原子 — Next/Image + 设计圆角 Token
 */
export function UiImage({
  className,
  rounded = "input",
  alt,
  ...props
}: UiImageProps) {
  return (
    <NextImage
      alt={alt}
      className={cn("object-cover", ROUNDED[rounded], className)}
      {...props}
    />
  );
}
