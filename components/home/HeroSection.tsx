"use client";

import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { ConfettiButton } from "@/components/ui/ConfettiButton";

export function HeroSection() {
  return (
    <section className="space-y-8 text-center sm:text-left">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-4"
      >
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          开箱即用
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl lg:text-5xl">
          Web 端工具起点
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-base text-neutral-600 dark:text-neutral-300 sm:mx-0 sm:text-lg">
          Next.js、Tailwind CSS、Lucide、Framer Motion 与彩纸特效已就绪。在此之上扩展你的工具页即可。
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="flex flex-col items-center gap-3 sm:flex-row sm:items-start"
      >
        <ConfettiButton className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white">
          <PartyPopper className="h-4 w-4" aria-hidden />
          庆祝一下
        </ConfettiButton>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 sm:self-center">
          点击触发 canvas-confetti
        </span>
      </motion.div>

      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          "响应式布局与移动端导航",
          "组件集中在 /components",
          "无登录、纯前端体验",
        ].map((text) => (
          <li
            key={text}
            className="rounded-2xl border border-neutral-200 bg-white p-4 text-left text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          >
            {text}
          </li>
        ))}
      </motion.ul>
    </section>
  );
}
