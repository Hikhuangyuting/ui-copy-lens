"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { recognizeInterfaceText } from "@/lib/ocr";
import type { TextRegion, WorkspaceStatus } from "./types";

type UploadCanvasProps = {
  status: WorkspaceStatus;
  imageUrl: string | null;
  fileName: string | null;
  regions: TextRegion[];
  errorMessage: string;
  panelCollapsed: boolean;
  onFileSelect: (file: File | null) => void;
  onReRecognize: () => void;
  onRetry: () => void;
  onContinueAnalysis: () => void;
  onFullscreenChange: (fullscreen: boolean) => void;
  onOpenPanel: () => void;
  onRegionsChange: (regions: TextRegion[]) => void;
  onOptimizeOne: (id: string, temporaryRequirement: string) => Promise<void>;
};

type DraftRegion = Pick<TextRegion, "x" | "y" | "width" | "height">;
type ResizeSide = "top" | "right" | "bottom" | "left";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function FigmaIcon({ src, className = "size-4" }: { src: string; className?: string }) {
  return <Image src={src} alt="" width={48} height={48} unoptimized className={cn("block shrink-0", className)} aria-hidden />;
}

function statusLabel(status: WorkspaceStatus, count: number) {
  if (status === "empty") return "请上传图片开始分析";
  if (status === "ready") return "已停止分析，图片已保留";
  if (status === "analyzing") return "正在识别界面文字";
  if (status === "needs-info") return "信息不足，请补充业务信息";
  if (status === "optimizing") return "正在生成优化文案";
  if (status === "completed") return `优化完成，已生成 ${count} 条结果`;
  if (status === "error") return "识别失败，请重新分析";
  return `解析成功，待优化 ${count} 条`;
}

export function UploadCanvas({ status, imageUrl, fileName, regions, errorMessage, panelCollapsed, onFileSelect, onReRecognize, onRetry, onContinueAnalysis, onFullscreenChange, onOpenPanel, onRegionsChange, onOptimizeOne }: UploadCanvasProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const resizeRef = useRef<{ id: string; side: ResizeSide; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(75);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [imageAspect, setImageAspect] = useState(16 / 9);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRecognitionId, setPendingRecognitionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRegion | null>(null);
  const [draftOrigin, setDraftOrigin] = useState<{ x: number; y: number } | null>(null);
  const [pendingDraft, setPendingDraft] = useState<TextRegion | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingKind, setProcessingKind] = useState<"ocr" | "optimize" | null>(null);
  const [inputOpen, setInputOpen] = useState(false);
  const [temporaryRequirement, setTemporaryRequirement] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [regionFeedback, setRegionFeedback] = useState<{ message: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const hasImage = Boolean(imageUrl);
  const showRegions = ["analyzed", "needs-info", "completed", "error"].includes(status);
  const completed = status === "completed";
  const selected = useMemo(() => regions.find((region) => region.id === selectedId) ?? null, [regions, selectedId]);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? null : current), 2200);
  }, []);
  const removeSelectedRegion = useCallback(() => {
    if (!selectedId) return;
    const region = regions.find((item) => item.id === selectedId);
    if (region) {
      const feedback = { message: "已删除该文案框", x: region.x + region.width / 2, y: region.y };
      setRegionFeedback(feedback);
      window.setTimeout(() => setRegionFeedback((current) => current === feedback ? null : current), 2200);
    }
    onRegionsChange(regions.filter((region) => region.id !== selectedId));
    setSelectedId(null); setActionMenuOpen(false); setEditingId(null); setInputOpen(false); setActionFeedback(null);
  }, [onRegionsChange, regions, selectedId]);
  const showActionFeedback = useCallback((message: string) => {
    setActionFeedback(message);
    window.setTimeout(() => setActionFeedback((current) => current === message ? null : current), 2200);
  }, []);
  const chooseFile = useCallback(() => inputRef.current?.click(), []);
  const setZoom = useCallback((next: number) => setScale(clamp(next, 25, 200)), []);

  useEffect(() => {
    setScale(75); setOffset({ x: 0, y: 0 }); setSelectedId(null); setActionMenuOpen(false); setEditingId(null);
    setPendingRecognitionId(null); setDraft(null); setPendingDraft(null); setRegionFeedback(null); setFullscreen(false);
  }, [imageUrl]);
  useEffect(() => onFullscreenChange(fullscreen), [fullscreen, onFullscreenChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === " ") setSpaceHeld(true);
      if (event.key === "Escape") {
        setInputOpen(false); setTemporaryRequirement(""); setSelectedId(null); setActionMenuOpen(false); setEditingId(null); setFullscreen(false);
      }
      if ((event.key === "Enter" || event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        event.stopPropagation();
        removeSelectedRegion();
      }
      if (event.key === "+" || event.key === "=") setZoom(scale + 25);
      if (event.key === "-") setZoom(scale - 25);
      if (event.key === "0") { setScale(75); setOffset({ x: 0, y: 0 }); }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === " ") setSpaceHeld(false); };
    window.addEventListener("keydown", onKey, true); window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("keyup", onKeyUp); };
  }, [removeSelectedRegion, scale, selectedId, setZoom]);

  const imagePoint = useCallback((clientX: number, clientY: number) => {
    const rect = imageFrameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clamp((clientX - rect.left) / rect.width, 0, 1), y: clamp((clientY - rect.top) / rect.height, 0, 1) };
  }, []);

  const cropToFile = useCallback(async (region: DraftRegion) => {
    if (!imageUrl) throw new Error("图片不存在");
    const source = new window.Image();
    source.src = imageUrl;
    await new Promise<void>((resolve, reject) => { source.onload = () => resolve(); source.onerror = () => reject(new Error("图片读取失败")); });
    const width = Math.max(1, Math.round(source.naturalWidth * region.width));
    const height = Math.max(1, Math.round(source.naturalHeight * region.height));
    if (width < 12 || height < 12) throw new Error("框选区域过小");
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d")?.drawImage(source, Math.round(source.naturalWidth * region.x), Math.round(source.naturalHeight * region.y), width, height, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("无法创建局部识别图片");
    return new File([blob], "local-ocr.png", { type: "image/png" });
  }, [imageUrl]);

  const runLocalOcr = useCallback(async (region: TextRegion, isNew = false) => {
    setProcessingId(region.id);
    setProcessingKind("ocr");
    try {
      const blocks = await recognizeInterfaceText(await cropToFile(region));
      const text = blocks.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y).map((block) => block.original).join("").trim();
      if (text.length < 2) throw new Error("空白区域");
      if (isNew) onRegionsChange([...regions, { ...region, original: text, optimized: "" }]);
      else onRegionsChange(regions.map((item) => item.id === region.id ? { ...item, original: text, optimized: "", failed: false } : item));
      setPendingRecognitionId(null); setEditingId(null); notify("局部识别完成");
    } catch {
      if (!isNew) onRegionsChange(regions.map((item) => item.id === region.id ? { ...item, failed: true } : item));
      notify("识别失败，请重新框选");
    } finally {
      if (isNew) setPendingDraft(null);
      setProcessingId(null); setProcessingKind(null);
    }
  }, [cropToFile, notify, onRegionsChange, regions]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const resize = resizeRef.current;
      const rect = imageFrameRef.current?.getBoundingClientRect();
      if (!resize || !rect) return;
      const dx = (event.clientX - resize.x) / rect.width;
      const dy = (event.clientY - resize.y) / rect.height;
      resizeRef.current = { ...resize, x: event.clientX, y: event.clientY };
      onRegionsChange(regions.map((region) => {
        if (region.id !== resize.id) return region;
        if (resize.side === "left") {
          const x = clamp(region.x + dx, 0, region.x + region.width - 0.01);
          return { ...region, x, width: region.width + region.x - x };
        }
        if (resize.side === "right") return { ...region, width: clamp(region.width + dx, 0.01, 1 - region.x) };
        if (resize.side === "top") {
          const y = clamp(region.y + dy, 0, region.y + region.height - 0.01);
          return { ...region, y, height: region.height + region.y - y };
        }
        return { ...region, height: clamp(region.height + dy, 0.01, 1 - region.y) };
      }));
    };
    const onUp = () => {
      if (resizeRef.current) { setPendingRecognitionId(resizeRef.current.id); resizeRef.current = null; }
    };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [onRegionsChange, regions]);

  const startResize = (event: ReactPointerEvent, id: string, side: ResizeSide) => {
    event.preventDefault(); event.stopPropagation();
    resizeRef.current = { id, side, x: event.clientX, y: event.clientY };
    setSelectedId(id); setEditingId(id);
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => { onFileSelect(event.target.files?.[0] ?? null); event.target.value = ""; };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!hasImage) return;
    event.preventDefault(); setZoom(scale + (event.deltaY > 0 ? -10 : 10));
  };
  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasImage || (event.target as HTMLElement).closest("[data-canvas-control], .region-action")) return;
    if (inputOpen) {
      setActionMenuOpen(false); setInputOpen(false); setTemporaryRequirement(""); setActionFeedback(null); setSelectedId(null);
      return;
    }
    if (actionMenuOpen || actionFeedback) {
      setActionMenuOpen(false); setSelectedId(null); setInputOpen(false); setTemporaryRequirement("");
      setActionFeedback(null);
      return;
    }
    if (pendingRecognitionId) {
      const region = regions.find((item) => item.id === pendingRecognitionId);
      if (region) void runLocalOcr(region);
      return;
    }
    if (editingId && !spaceHeld) {
      const point = imagePoint(event.clientX, event.clientY);
      if (!point) return;
      setDraftOrigin(point); setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    dragOrigin.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
    setDragging(true); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft && draftOrigin) {
      const point = imagePoint(event.clientX, event.clientY);
      if (!point) return;
      setDraft({ x: Math.min(draftOrigin.x, point.x), y: Math.min(draftOrigin.y, point.y), width: Math.abs(point.x - draftOrigin.x), height: Math.abs(point.y - draftOrigin.y) });
      return;
    }
    if (!dragging) return;
    setOffset({ x: dragOrigin.current.offsetX + event.clientX - dragOrigin.current.x, y: dragOrigin.current.offsetY + event.clientY - dragOrigin.current.y });
  };
  const onCanvasPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draft) {
      const created = draft;
      setDraft(null); setDraftOrigin(null);
      if (created.width >= 0.015 && created.height >= 0.015) {
        const region = { ...created, id: `region-local-${Date.now()}`, original: "", optimized: "" };
        setPendingDraft(region);
        void runLocalOcr(region, true);
      }
    }
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const copySelected = async () => {
    if (!selected?.optimized) { showActionFeedback("尚未生成优化文案"); return; }
    setActionMenuOpen(false); setInputOpen(false);
    try { await navigator.clipboard.writeText(selected.optimized); showActionFeedback("复制成功"); } catch { showActionFeedback("复制失败，请重试"); }
  };
  const optimizeSelected = async () => {
    if (!selected || !temporaryRequirement.trim()) return;
    setProcessingId(selected.id); setProcessingKind("optimize"); setInputOpen(false); setActionMenuOpen(false);
    try {
      await onOptimizeOne(selected.id, temporaryRequirement.trim());
      setTemporaryRequirement(""); showActionFeedback("优化成功");
    } catch (error) {
      onRegionsChange(regions.map((region) => region.id === selected.id ? { ...region, failed: true } : region));
      showActionFeedback(error instanceof Error ? error.message : "优化失败，请重试");
    } finally { setProcessingId(null); setProcessingKind(null); }
  };

  const toolbar = (
    <div className="canvas-toolbar" role="toolbar" aria-label="画布工具" data-canvas-control>
      <span className="whitespace-nowrap text-sm text-[#333]">{completed ? "已优化" : "待优化"}：<span className="tabular-nums">{regions.length}</span></span>
      <span className="toolbar-divider" aria-hidden />
      <button type="button" className="toolbar-icon" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? "退出全屏" : "进入全屏"}><FigmaIcon src={fullscreen ? "/figma/fullscreen-exit.svg" : "/figma/fullscreen-enter.svg"} /></button>
      <span className="toolbar-divider" aria-hidden />
      <button type="button" className="toolbar-icon" onClick={() => setZoom(scale - 25)} aria-label="缩小"><FigmaIcon src="/figma/zoom-out.svg" /></button>
      <button type="button" className="toolbar-percent" onClick={() => { setScale(75); setOffset({ x: 0, y: 0 }); }}>{Math.round(scale)}%</button>
      <button type="button" className="toolbar-icon" onClick={() => setZoom(scale + 25)} aria-label="放大"><FigmaIcon src="/figma/zoom-in.svg" /></button>
      <span className="toolbar-divider" aria-hidden />
      <button type="button" className="toolbar-percent" onClick={() => setScale(100)}>100%</button>
      <span className="toolbar-divider" aria-hidden />
      {!fullscreen ? <><button type="button" className="toolbar-action" onClick={onReRecognize}><FigmaIcon src="/figma/re-recognize.svg" />重新识别</button><button type="button" className="toolbar-action" onClick={chooseFile}><FigmaIcon src="/figma/upload-image.svg" />上传图片</button></> : null}
    </div>
  );

  const selectionTools = selected && (actionMenuOpen || inputOpen || actionFeedback) ? (
    <div className="absolute z-30 -translate-x-1/2" data-canvas-control style={{ left: `${(selected.x + selected.width / 2) * 100}%`, top: `calc(${selected.y * 100}% - 46px)` }}>
      {actionFeedback ? <div className="flex h-8 items-center rounded-lg bg-[rgba(0,0,0,0.9)] px-4 text-xs text-white shadow-[0_0_6px_rgba(0,0,0,0.12)]" role="status">{actionFeedback}</div> : inputOpen ? <div className="flex h-9 w-[min(391px,76vw)] items-center rounded-lg border border-black/10 bg-white pl-4 pr-0.5 shadow-[0_2px_4px_rgba(0,0,0,0.12)]">
        <input autoFocus value={temporaryRequirement} onChange={(event) => setTemporaryRequirement(event.target.value)} placeholder="输入本次优化要求" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35" onKeyDown={(event) => { if (event.key === "Enter") void optimizeSelected(); if (event.key === "Escape") { setInputOpen(false); setTemporaryRequirement(""); } }} />
        <button type="button" className="region-action flex size-8 items-center justify-center rounded-md bg-black text-xs text-white disabled:bg-black/15" disabled={!temporaryRequirement.trim() || processingId === selected.id} onClick={() => void optimizeSelected()} aria-label="发送优化要求">发送</button>
      </div> : <div className="flex items-center gap-5 rounded-lg bg-white px-4 py-2.5 text-sm text-[#333] shadow-[0_0_6px_rgba(0,0,0,0.12)]">
        <button type="button" className="region-action group flex items-center gap-1 transition hover:text-[#486bf9] disabled:cursor-not-allowed disabled:opacity-35" onClick={copySelected} disabled={!selected.optimized}><FigmaIcon src="/figma/copy.svg" className="figma-action-icon size-4 transition" />复制</button>
        <button type="button" className="region-action group flex items-center gap-1 transition hover:text-[#486bf9]" onClick={() => { setActionMenuOpen(false); setInputOpen(true); }}><FigmaIcon src="/figma/edit.svg" className="figma-action-icon size-4 transition" />编辑</button>
      </div>}
    </div>
  ) : null;

  const canvasContent = hasImage ? (
    <div ref={imageFrameRef} className={cn("relative origin-center select-none overflow-visible", fullscreen ? "shadow-none" : "shadow-[0_12px_35px_rgba(0,0,0,0.08)]")} style={{ width: fullscreen ? "calc(100vw - 200px)" : "calc(100% - 64px)", maxWidth: fullscreen ? undefined : "1396px", maxHeight: fullscreen ? "calc(100vh - 113px)" : undefined, aspectRatio: imageAspect, transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale / 75})` }}>
      <Image src={imageUrl!} alt={fileName ? `已上传图片：${fileName}` : "已上传界面截图"} fill unoptimized className="pointer-events-none object-contain" sizes="1080px" onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setImageAspect(image.naturalWidth / image.naturalHeight); }} />
      {showRegions ? regions.map((region) => {
        const selectedRegion = region.id === selectedId;
        const editingRegion = region.id === editingId;
        const isProcessing = region.id === processingId;
        return <div key={region.id} className={cn("absolute min-h-8 min-w-8", selectedRegion ? "z-20" : "z-10")} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}>
          <button type="button" className={cn("region-action absolute inset-0 w-full border text-left text-[clamp(9px,0.8vw,14px)] leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", selectedRegion ? "border-[#ebbc20] bg-[rgba(235,188,32,0.2)]" : region.failed ? "border-red-500 bg-transparent" : completed ? "border-dashed border-[#486bf9] bg-[#D6DDFA]" : "border-dashed border-[#486bf9] bg-transparent")} onClick={(event) => { event.stopPropagation(); setSelectedId(region.id); setActionMenuOpen(false); setEditingId(region.id); setInputOpen(false); setActionFeedback(null); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); event.stopPropagation(); removeSelectedRegion(); } }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedId(region.id); setActionMenuOpen(true); setEditingId(null); setInputOpen(false); setActionFeedback(null); }} aria-label={`文案：${region.original}`}>
            {completed && !selectedRegion ? <span className="line-clamp-3 px-1 text-[#486bf9]">{region.optimized}</span> : null}
            {isProcessing ? <span className="absolute left-1/2 top-[-32px] flex h-6 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-lg bg-[rgba(0,0,0,0.8)] px-2 text-xs text-white"><span className="size-3 animate-spin rounded-full border border-white/40 border-t-white" />{processingKind === "optimize" ? "正在重新优化…" : "正在识别文字…"}</span> : null}
          </button>
          {editingRegion ? (["top", "right", "bottom", "left"] as ResizeSide[]).map((side) => <button key={side} type="button" className={cn("region-action absolute z-30 flex size-7 items-center justify-center bg-transparent", side === "top" && "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", side === "right" && "right-0 top-1/2 -translate-y-1/2 translate-x-1/2", side === "bottom" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", side === "left" && "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2")} onPointerDown={(event) => startResize(event, region.id, side)} aria-label={`调整${side === "top" ? "上" : side === "right" ? "右" : side === "bottom" ? "下" : "左"}边界`}><span className={cn("block rounded-[2px] bg-[#ebbc20]", (side === "top" || side === "bottom") ? "h-[5px] w-4" : "h-4 w-[5px]")} /></button>) : null}
        </div>;
      }) : null}
      {draft ? <div className="pointer-events-none absolute z-20 border-2 border-[#486bf9] bg-[#486bf9]/15" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.width * 100}%`, height: `${draft.height * 100}%` }} /> : null}
      {pendingDraft ? <div className="pointer-events-none absolute z-20 border-2 border-[#486bf9] bg-[#486bf9]/15" style={{ left: `${pendingDraft.x * 100}%`, top: `${pendingDraft.y * 100}%`, width: `${pendingDraft.width * 100}%`, height: `${pendingDraft.height * 100}%` }}><span className="absolute left-1/2 top-[-32px] flex h-6 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-lg bg-[rgba(0,0,0,0.8)] px-2 text-xs text-white"><span className="size-3 animate-spin rounded-full border border-white/40 border-t-white" />正在识别文字…</span></div> : null}
      {selectionTools}
      {regionFeedback ? <div className="absolute z-30 -translate-x-1/2" data-canvas-control style={{ left: `${regionFeedback.x * 100}%`, top: `calc(${regionFeedback.y * 100}% - 46px)` }}><div className="flex h-8 items-center rounded-lg bg-[rgba(0,0,0,0.9)] px-4 text-xs text-white shadow-[0_0_6px_rgba(0,0,0,0.12)]" role="status">{regionFeedback.message}</div></div> : null}
    </div>
  ) : null;

  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden", fullscreen ? "fixed inset-0 z-[60] h-dvh w-dvw bg-[rgba(19,24,31,0.9)] p-0" : "relative min-h-[720px] flex-1 bg-page pt-24 lg:min-h-dvh lg:pt-20")} aria-label="截图画布">
      <input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={onChange} />
      {fullscreen ? <button type="button" onClick={() => setFullscreen(false)} className="absolute right-8 top-8 z-30 size-12" aria-label="退出全屏"><FigmaIcon src="/figma/fullscreen-exit.svg" className="size-12" /></button> : null}
      {panelCollapsed && !fullscreen ? <><div className={cn("absolute left-1/2 top-7 z-40 -translate-x-1/2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/65 shadow-sm", status === "empty" && "hidden")} role="status">{statusLabel(status, regions.length)}</div><button type="button" onClick={onOpenPanel} className="absolute right-6 top-7 z-40 flex size-8 items-center justify-center rounded-md hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="展开优化设置" title="展开优化设置"><span className="relative block size-4" aria-hidden><Image src="/figma/panel-expand-line.svg" alt="" width={11} height={2} unoptimized className="absolute left-[2px] top-[2px]" /><Image src="/figma/panel-expand-line.svg" alt="" width={11} height={2} unoptimized className="absolute left-[2px] top-[12px]" /><Image src="/figma/panel-expand-arrow.svg" alt="" width={8} height={2} unoptimized className="absolute left-[2px] top-[7px]" /><Image src="/figma/panel-expand-mark.svg" alt="" width={9} height={9} unoptimized className="absolute left-[11px] top-[4px] rotate-[135deg] -scale-x-100" /></span></button></> : null}
      {toast ? <div className="absolute left-1/2 top-7 z-50 -translate-x-1/2 rounded-lg bg-[#17233f] px-4 py-2 text-sm text-white shadow-lg" role="status">{toast}</div> : null}
      <div className={cn("relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden", fullscreen ? "px-[100px] pb-[89px] pt-6" : "px-8 pb-28", dragOver && "ring-inset ring-2 ring-blue-500", dragging && "cursor-grabbing", hasImage && !dragging && (editingId && !spaceHeld ? "cursor-crosshair" : "cursor-grab"))} onWheel={onWheel} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp} onPointerCancel={onCanvasPointerUp} onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false); }} onDrop={(event) => { event.preventDefault(); setDragOver(false); onFileSelect(event.dataTransfer.files?.[0] ?? null); }}>
        {status === "error" && hasImage ? <div className="absolute left-1/2 top-5 z-40 flex max-w-[620px] -translate-x-1/2 items-center gap-4 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg"><span>{errorMessage || "图片分析失败，请重试；图片和已填写内容仍为你保留。"}</span><button type="button" onClick={onRetry} className="shrink-0 rounded-lg bg-red-50 px-3 py-2 font-medium hover:bg-red-100">重新分析</button></div> : null}
        {status === "ready" && hasImage ? <div className="absolute left-1/2 top-5 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black/70 shadow-lg"><span>已停止分析，图片已保留</span><button type="button" onClick={onContinueAnalysis} className="rounded-lg bg-black px-3 py-2 font-medium text-white">继续分析</button><button type="button" onClick={chooseFile} className="rounded-lg border border-black/10 px-3 py-2">重新上传</button></div> : null}
        {hasImage ? canvasContent : status === "error" ? <div className="flex max-w-md flex-col items-center text-center"><h2 className="text-2xl">无法读取这张图片</h2><p className="mt-3 text-sm leading-6 text-black/50">{errorMessage || "请上传不超过 10 MB 的 JPG、JPEG 或 PNG 图片。"}</p><div className="mt-6 flex gap-3"><button type="button" onClick={onRetry} className="rounded-xl border border-black/15 px-5 py-3 text-sm">重新分析</button><button type="button" onClick={chooseFile} className="rounded-xl bg-black px-5 py-3 text-sm text-white">上传其他图片</button></div></div> : <button type="button" onClick={chooseFile} className="group flex max-w-[420px] flex-col items-center rounded-3xl px-10 py-12 text-center"><div className="relative h-[182px] w-[240px] overflow-hidden rounded-2xl"><Image src="/upload-illustration.png" alt="" fill className="object-contain opacity-90" sizes="240px" priority unoptimized /></div><h2 className="mt-5 text-2xl font-normal">上传图片，自动识别并优化文案</h2><p className="mt-3 text-base text-black/45">支持 jpg、jpeg、png，单张不超过 10 MB</p><p className="mt-2 text-sm text-black/45">图片将发送至模型服务分析，仅用于当前会话，不生成历史记录</p><span className="mt-12 inline-flex h-14 min-w-60 items-center justify-center gap-[10px] rounded-xl border border-[#b8b8b8] bg-page px-4 text-lg"><FigmaIcon src="/figma/upload-button.svg" className="size-6" />上传图片</span></button>}
      </div>
      {hasImage && showRegions ? <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2">{toolbar}</div> : null}
    </section>
  );
}
