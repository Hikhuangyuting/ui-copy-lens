"use client";

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import type { TextRegion, WorkspaceStatus } from "./types";

type UploadCanvasProps = {
  status: WorkspaceStatus;
  imageUrl: string | null;
  fileName: string | null;
  regions: TextRegion[];
  errorMessage: string;
  onFileSelect: (file: File | null) => void;
  onReRecognize: () => void;
  onRetry: () => void;
  onContinueAnalysis: () => void;
  onFullscreenChange: (fullscreen: boolean) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function FigmaIcon({ src, className = "size-4" }: { src: string; className?: string }) {
  return <Image src={src} alt="" width={48} height={48} unoptimized className={cn("block shrink-0", className)} aria-hidden />;
}

export function UploadCanvas({ status, imageUrl, fileName, regions, errorMessage, onFileSelect, onReRecognize, onRetry, onContinueAnalysis, onFullscreenChange }: UploadCanvasProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const [scale, setScale] = useState(75);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState(16 / 9);
  const [completionNotice, setCompletionNotice] = useState(false);

  const hasImage = Boolean(imageUrl);
  const showRegions = ["analyzed", "needs-info", "completed"].includes(status);
  const completed = status === "completed";

  const chooseFile = useCallback(() => inputRef.current?.click(), []);
  const setZoom = useCallback((next: number) => setScale(clamp(next, 25, 200)), []);

  useEffect(() => {
    setScale(75);
    setOffset({ x: 0, y: 0 });
    setOriginalId(null);
    setFullscreen(false);
  }, [imageUrl]);

  useEffect(() => {
    onFullscreenChange(fullscreen);
  }, [fullscreen, onFullscreenChange]);

  useEffect(() => {
    if (!completed) {
      setCompletionNotice(false);
      return;
    }
    setCompletionNotice(true);
    const timer = window.setTimeout(() => setCompletionNotice(false), 3200);
    return () => window.clearTimeout(timer);
  }, [completed]);

  useEffect(() => {
    if (status === "analyzing") {
      setOriginalId(null);
      setScale(75);
      setOffset({ x: 0, y: 0 });
    }
  }, [status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        if (originalId) setOriginalId(null);
        else setFullscreen(false);
      }
      if (event.key === "+" || event.key === "=") setZoom(scale + 25);
      if (event.key === "-") setZoom(scale - 25);
      if (event.key === "0") {
        setScale(75);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [originalId, scale, setZoom]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileSelect(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!hasImage) return;
    event.preventDefault();
    setZoom(scale + (event.deltaY > 0 ? -10 : 10));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasImage || (event.target as HTMLElement).closest("button")) return;
    dragOrigin.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({
      x: dragOrigin.current.offsetX + event.clientX - dragOrigin.current.x,
      y: dragOrigin.current.offsetY + event.clientY - dragOrigin.current.y,
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const toolbar = (
    <div className="canvas-toolbar" role="toolbar" aria-label="画布工具">
      <div className="flex items-center gap-4">
        <span className="whitespace-nowrap text-sm text-[#333]">
          {completed ? "已优化" : "待优化"}：<span className="tabular-nums">{regions.length}</span>
        </span>
        {!fullscreen ? <>
          <button type="button" className="toolbar-action" onClick={onReRecognize} title="保留图片和补充要求，重新识别"><FigmaIcon src="/figma/re-recognize.svg" />重新识别</button>
          <button type="button" className="toolbar-action" onClick={chooseFile} title="上传新的图片"><FigmaIcon src="/figma/upload-image.svg" />上传图片</button>
        </> : null}
      </div>
      <span className="toolbar-divider" aria-hidden />
      <button type="button" className="toolbar-icon" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? "退出全屏" : "进入全屏"} title={fullscreen ? "退出全屏" : "进入全屏"}>
        <FigmaIcon src={fullscreen ? "/figma/fullscreen-exit.svg" : "/figma/fullscreen-enter.svg"} />
      </button>
      <span className="toolbar-divider" aria-hidden />
      <div className="flex items-center gap-3">
        <button type="button" className="toolbar-icon" onClick={() => setZoom(scale - 25)} aria-label="缩小" title="缩小"><FigmaIcon src="/figma/zoom-out.svg" /></button>
        <button type="button" className="toolbar-percent" onClick={() => { setScale(75); setOffset({ x: 0, y: 0 }); }} title="适应画布">{Math.round(scale)}%</button>
        <button type="button" className="toolbar-icon" onClick={() => setZoom(scale + 25)} aria-label="放大" title="放大"><FigmaIcon src="/figma/zoom-in.svg" /></button>
      </div>
      <span className="toolbar-divider" aria-hidden />
      <button type="button" className="toolbar-percent" onClick={() => setScale(100)} title="恢复到原始大小">100%</button>
    </div>
  );

  const canvasContent = hasImage ? (
    <div className={cn("relative origin-center select-none overflow-visible", fullscreen ? "shadow-none" : "shadow-[0_12px_35px_rgba(0,0,0,0.08)]")} style={{ width: fullscreen ? "calc(100vw - 200px)" : "calc(100% - 64px)", maxWidth: fullscreen ? undefined : "1396px", maxHeight: fullscreen ? "calc(100vh - 113px)" : undefined, aspectRatio: imageAspect, transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale / 75})` }}>
      <Image src={imageUrl!} alt={fileName ? `已上传图片：${fileName}` : "已上传界面截图"} fill unoptimized className="pointer-events-none object-contain" sizes="1080px" onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setImageAspect(image.naturalWidth / image.naturalHeight); }} />
      {showRegions ? regions.map((region) => {
        const showOriginal = originalId === region.id;
        return (
          <button
            type="button"
            key={region.id}
            className={cn("absolute flex min-h-8 min-w-8 items-center justify-center overflow-visible border border-dashed border-[#486bf9] text-left text-[clamp(9px,0.8vw,14px)] leading-tight transition-colors focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600", completed ? "bg-[#D6DDFA]" : "bg-transparent")}
            style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}
            onClick={() => { if (completed) setOriginalId(showOriginal ? null : region.id); }}
            onDoubleClick={() => setZoom(Math.max(scale, 125))}
            aria-pressed={completed ? showOriginal : undefined}
            aria-label={completed ? `${showOriginal ? "隐藏" : "查看"}原文：${region.original}` : `待优化文案：${region.original}`}
          >
            {completed ? <span className="line-clamp-3 px-1 text-[#486bf9]">{showOriginal ? region.original : region.optimized}</span> : null}
            {showOriginal ? <span className="absolute -top-7 left-0 rounded bg-black px-2 py-1 text-[10px] text-white">原文</span> : null}
          </button>
        );
      }) : null}
    </div>
  ) : null;

  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden", fullscreen ? "fixed inset-0 z-[60] h-dvh w-dvw bg-[rgba(19,24,31,0.9)] p-0" : "relative min-h-[720px] flex-1 bg-page pt-24 lg:min-h-dvh lg:pt-20") } aria-label="截图画布">
      <input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={onChange} />
      {fullscreen ? <button type="button" onClick={() => setFullscreen(false)} className="absolute right-8 top-8 z-30 size-12 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="退出全屏（右上角）"><FigmaIcon src="/figma/fullscreen-exit.svg" className="size-12" /></button> : null}

      <div
        ref={canvasRef}
        className={cn("relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden", fullscreen ? "px-[100px] pb-[89px] pt-6" : "px-8 pb-28", dragOver && "ring-inset ring-2 ring-blue-500", dragging && "cursor-grabbing", hasImage && !dragging && "cursor-grab")}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false); }}
        onDrop={(event) => { event.preventDefault(); setDragOver(false); onFileSelect(event.dataTransfer.files?.[0] ?? null); }}
      >
        {status === "error" && hasImage ? (
          <div className="absolute left-1/2 top-5 z-40 flex max-w-[620px] -translate-x-1/2 items-center gap-4 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg">
            <span>{errorMessage || "图片分析失败，请重试；图片和已填写内容仍为你保留。"}</span>
            <button type="button" onClick={onRetry} className="shrink-0 rounded-lg bg-red-50 px-3 py-2 font-medium hover:bg-red-100">重新分析</button>
          </div>
        ) : null}
        {completionNotice ? (
          <div className="absolute left-1/2 top-5 z-40 -translate-x-1/2 rounded-xl bg-[#17233f] px-5 py-3 text-sm text-white shadow-lg" role="status" aria-live="polite">
            已优化 {regions.length} 条文案，点击蓝色高亮块可临时查看原文
          </div>
        ) : null}
        {status === "ready" && hasImage ? (
          <div className="absolute left-1/2 top-5 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black/70 shadow-lg">
            <span>已停止分析，图片已保留</span>
            <button type="button" onClick={onContinueAnalysis} className="rounded-lg bg-black px-3 py-2 font-medium text-white hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">继续分析</button>
            <button type="button" onClick={chooseFile} className="rounded-lg border border-black/10 px-3 py-2 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">重新上传</button>
          </div>
        ) : null}
        {hasImage ? canvasContent : status === "error" ? (
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500"><X className="size-6" /></div>
            <h2 className="mt-5 text-2xl">无法读取这张图片</h2>
            <p className="mt-3 text-sm leading-6 text-black/50">{errorMessage || "请上传不超过 10 MB 的 JPG、JPEG 或 PNG 图片。"}</p>
            <div className="mt-6 flex gap-3"><button type="button" onClick={onRetry} className="rounded-xl border border-black/15 px-5 py-3 text-sm hover:bg-white">重新分析</button><button type="button" onClick={chooseFile} className="rounded-xl bg-black px-5 py-3 text-sm text-white hover:bg-black/85">上传其他图片</button></div>
          </div>
        ) : (
          <button type="button" onClick={chooseFile} className="group flex max-w-[420px] flex-col items-center rounded-3xl px-10 py-12 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
            <div className="relative h-[182px] w-[240px] overflow-hidden rounded-2xl">
              <Image src="/upload-illustration.png" alt="" fill className="object-contain opacity-90 transition group-hover:opacity-100" sizes="240px" priority unoptimized />
            </div>
            <h2 className="mt-5 text-2xl font-normal">上传图片，自动识别并优化文案</h2>
            <p className="mt-3 text-base text-black/45">支持 jpg、jpeg、png，单张不超过 10 MB</p>
            <p className="mt-2 text-sm text-black/45">图片将发送至模型服务分析，仅用于当前会话，不生成历史记录</p>
            <span className="mt-12 inline-flex h-14 min-w-60 items-center justify-center gap-[10px] rounded-xl border border-[#b8b8b8] bg-page px-4 text-lg transition group-hover:bg-white"><FigmaIcon src="/figma/upload-button.svg" className="size-6" />上传图片</span>
          </button>
        )}
      </div>
      {hasImage && showRegions ? <div className={cn("absolute left-1/2 z-30 -translate-x-1/2", fullscreen ? "bottom-6" : "bottom-6")}>{toolbar}</div> : null}
    </section>
  );
}
