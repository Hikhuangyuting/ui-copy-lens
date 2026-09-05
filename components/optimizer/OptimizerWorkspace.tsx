"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrandHeader } from "./BrandHeader";
import { RulesPanel } from "./RulesPanel";
import { UploadCanvas } from "./UploadCanvas";
import { recognizeInterfaceText } from "@/lib/ocr";
import type { AnalysisResult, CopyStyle, TextRegion, WorkspaceStatus } from "./types";

export function OptimizerWorkspace() {
  const [status, setStatus] = useState<WorkspaceStatus>("empty");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [requirement, setRequirement] = useState("");
  const [style, setStyle] = useState<CopyStyle>("自动匹配");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [progressText, setProgressText] = useState("正在识别界面文字");
  const [errorMessage, setErrorMessage] = useState("");
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const runId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const analyzeImage = useCallback(async (file: File, requestRequirement = requirement, retainedRegions: TextRegion[] = []) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const currentRun = ++runId.current;
    setStatus("analyzing");
    setErrorMessage("");
    setAnalysis(null);
    setRegions([]);
    setAnswers({});
    setProgressText("正在识别界面文字");

    try {
      const blocks = await recognizeInterfaceText(file, ({ status: ocrStatus, progress }) => {
        if (currentRun !== runId.current) return;
        if (ocrStatus.includes("recognizing")) setProgressText(`正在识别界面文字 ${Math.round(progress * 100)}%`);
        else if (ocrStatus.includes("loading")) setProgressText("正在加载文字识别模型");
      }, controller.signal);
      if (currentRun !== runId.current) return;
      setProgressText("正在理解页面、筛选待优化文案并判断信息是否充分");

      const form = new FormData();
      form.append("image", file);
      form.append("ocrBlocks", JSON.stringify(blocks));
      form.append("requirement", requestRequirement);
      const response = await fetch("/api/analyze", { method: "POST", body: form, signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "图片分析失败");
      if (currentRun !== runId.current) return;

      const result = payload as AnalysisResult;
      if (retainedRegions.length) {
        const overlaps = (a: Pick<TextRegion, "x" | "y" | "width" | "height">, b: Pick<TextRegion, "x" | "y" | "width" | "height">) => {
          const overlapWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
          const overlapHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
          const intersection = overlapWidth * overlapHeight;
          const union = a.width * a.height + b.width * b.height - intersection;
          return union > 0 && intersection / union >= 0.45;
        };
        const merged = [...result.targetRegions];
        for (const retained of retainedRegions) {
          if (!merged.some((current) => overlaps(current, retained))) {
            merged.push({ ...retained, optimized: undefined });
          }
        }
        result.targetRegions = merged.map((region, index) => ({ ...region, id: `region-${index}` }));
        if (result.targetRegions.length) {
          result.optimizationBasis = `${result.optimizationBasis.replace(/[。.]$/, "")}；再次识别已保留上一轮位置稳定的有效候选。`;
        }
      }
      setAnalysis(result);
      setRegions(result.targetRegions.map((region) => ({ ...region, optimized: "" })));
      setStatus(result.needsMoreInfo ? "needs-info" : "analyzed");
    } catch (error) {
      if (currentRun !== runId.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setErrorMessage(error instanceof Error ? error.message : "图片分析失败，请重试");
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [requirement]);

  const selectFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      setErrorMessage("请上传不超过 10 MB 的 JPG、JPEG 或 PNG 图片");
      setStatus("error");
      return;
    }
    const replacingTask = Boolean(uploadedFile && (analysis || requirement.trim() || Object.keys(answers).length > 0));
    if (replacingTask) {
      const confirmed = window.confirm("上传新图片将清空当前页面理解、补充信息和优化结果，是否继续？");
      if (!confirmed) return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setUploadedFile(file);
    setImageUrl(URL.createObjectURL(file));
    if (replacingTask) {
      setRequirement("");
      setStyle("自动匹配");
    }
    void analyzeImage(file, replacingTask ? "" : requirement);
  }, [analysis, analyzeImage, answers, imageUrl, requirement, uploadedFile]);

  const optimize = useCallback(async () => {
    if (!analysis) return;
    setStatus("optimizing");
    setProgressText("正在生成优化文案");
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, answers, requirement, style }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "文案优化失败");
      const optimizedById = new Map<string, string>(payload.regions.map((region: { id: string; optimized: string }) => [region.id, region.optimized]));
      setRegions((current) => current.map((region) => ({ ...region, optimized: optimizedById.get(region.id) ?? region.original })));
      setStatus("completed");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "文案优化失败，请重试");
      setStatus("error");
    }
  }, [analysis, answers, requirement, style]);

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runId.current += 1;
    setProgressText("已停止分析，图片已保留");
    setStatus(uploadedFile ? "ready" : "empty");
  }, [uploadedFile]);

  const reRecognize = useCallback(() => {
    if (uploadedFile) void analyzeImage(uploadedFile, requirement, regions);
  }, [analyzeImage, regions, requirement, uploadedFile]);

  const isBusy = status === "analyzing" || status === "optimizing";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-page">
      {!canvasFullscreen ? <BrandHeader /> : null}
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <UploadCanvas status={status} imageUrl={imageUrl} fileName={uploadedFile?.name ?? null} regions={regions} errorMessage={errorMessage} onFileSelect={selectFile} onReRecognize={reRecognize} onRetry={reRecognize} onContinueAnalysis={reRecognize} onFullscreenChange={setCanvasFullscreen} />
        {!canvasFullscreen ? <RulesPanel status={status} analysis={analysis} requirement={requirement} onRequirementChange={setRequirement} style={style} onStyleChange={setStyle} answers={answers} onAnswerChange={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))} onOptimize={() => void optimize()} /> : null}
      </div>

      {isBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-[2px]" role="status" aria-live="polite" aria-label={progressText}>
          <div className="flex min-w-[340px] flex-col items-center rounded-2xl bg-white px-10 py-9 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <span className="analysis-loader" aria-hidden />
            <p className="mt-6 text-lg font-medium text-black">{progressText}</p>
            <p className="mt-2 text-sm text-black/45">复杂截图的首次识别可能需要一些时间</p>
            <button type="button" className="mt-6 rounded-lg px-4 py-2 text-sm text-black/65 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" onClick={cancelAnalysis}>取消</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
