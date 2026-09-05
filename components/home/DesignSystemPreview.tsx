"use client";

import { useState } from "react";
import { ScanText, Sparkles, Upload } from "lucide-react";
import {
  Button,
  Icon,
  Tag,
  TextArea,
  ToolBar,
  ToolBarDivider,
  ToolBarItem,
  UiImage,
} from "@/components/ui";

/**
 * 首页局部：展示从 Figma 映射的 Token 与原子组件
 */
export function DesignSystemPreview() {
  const [desc, setDesc] = useState("");

  return (
    <section className="mx-auto w-full max-w-5xl border-t border-stroke-subtle px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="mb-2 text-lg font-semibold text-text-label">
        设计系统原子（Figma Token）
      </h2>
      <p className="mb-8 max-w-2xl text-sm text-text-muted">
        颜色、圆角、描边与字号来自{" "}
        <a
          href="https://www.figma.com/design/x4AId3eQ7MoTehZCB5XpJI/UI-%E6%96%87%E6%A1%88%E4%BC%98%E5%8C%96"
          className="underline decoration-stroke underline-offset-2 hover:text-text-label"
          target="_blank"
          rel="noreferrer"
        >
          UI 文案优化
        </a>{" "}
        中 PrimaryButton、TextTag、TextArea、SecondaryButton、Toolbar 等节点。
      </p>

      <div className="flex flex-col gap-10 rounded-card border border-stroke-subtle bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="primary">一键优化</Button>
          <Button variant="primary" disabled>
            一键优化
          </Button>
          <Button
            variant="secondary"
            leftSlot={
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-text-onPrimary">
                <Sparkles className="size-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            }
          >
            上传图片
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tag>极致精简</Tag>
          <Tag status="active">去专业化</Tag>
          <Tag status="disabled">禁用</Tag>
        </div>

        <div className="flex items-center gap-4">
          <Icon icon={Upload} size="sm" />
          <Icon icon={Upload} size="md" />
          <Icon icon={Upload} size="lg" />
        </div>

        <UiImage
          src="/illustration-placeholder.svg"
          alt="插图占位"
          width={240}
          height={182}
          unoptimized
          rounded="input"
          className="border border-dashed border-stroke-subtle"
        />

        <TextArea
          className="max-w-[368px]"
          label="优化描述"
          placeholder="自定义优化描述（选填）"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onClear={() => setDesc("")}
        />

        <ToolBar className="max-w-md">
          <span className="text-toolbar text-text-body">文案：15</span>
          <ToolBarDivider />
          <div className="flex flex-wrap items-center gap-4">
            <ToolBarItem icon={ScanText}>重新识别</ToolBarItem>
            <ToolBarItem icon={Upload}>上传图片</ToolBarItem>
          </div>
        </ToolBar>
      </div>
    </section>
  );
}
