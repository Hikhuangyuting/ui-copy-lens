import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:text-left sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          无需登录 · 响应式布局 · Next.js
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          © {new Date().getFullYear()} Web 工具
        </p>
      </div>
    </footer>
  );
}
