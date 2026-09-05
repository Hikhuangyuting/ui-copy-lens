import Image from "next/image";
import { cn } from "@/lib/cn";

export type BrandHeaderProps = {
  className?: string;
};

/**
 * Group/BrandHeader — 与 Figma Page/OptimizerMain 顶栏一致
 */
export function BrandHeader({ className }: BrandHeaderProps) {
  return (
    <header
      className={cn(
        "pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-4 md:left-8 md:top-6",
        className
      )}
    >
      <span className="relative size-10 shrink-0" aria-hidden>
        <Image src="/brand-logo.svg" alt="" fill className="object-contain" sizes="40px" priority />
        <Image src="/figma/brand-mark-color.png" alt="" width={22} height={22} className="absolute left-[9px] top-[9px] size-[22px] object-contain" priority />
      </span>
      <h1 className="pointer-events-none text-2xl font-semibold leading-[1.2] text-text-primary">
        UI文案优化
      </h1>
    </header>
  );
}
