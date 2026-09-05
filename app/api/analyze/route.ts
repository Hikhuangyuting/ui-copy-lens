import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AnalysisResult, OcrBlock } from "@/components/optimizer/types";
import { createKimiStructuredResponse, fileToDataUrl } from "@/lib/kimi";
import { validateRegionBlocks, type FocusRegion } from "@/lib/region-validation";

export const runtime = "nodejs";

const OCR_GUIDELINES_PATH = path.join(process.cwd(), "docs", "ocr-recognition-guidelines.md");

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["pageUnderstanding", "optimizationBasis", "suggestedStyle", "needsMoreInfo", "questions", "focusType", "focusBounds", "regions"],
  properties: {
    pageUnderstanding: { type: "string" },
    optimizationBasis: { type: "string" },
    suggestedStyle: { type: "string", enum: ["自动匹配", "极致精简", "去专业化", "严谨说明", "友好引导"] },
    needsMoreInfo: { type: "boolean" },
    focusType: { type: "string", enum: ["page", "modal", "drawer", "popover"] },
    focusBounds: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["x", "y", "width", "height"],
          properties: {
            x: { type: "number" }, y: { type: "number" },
            width: { type: "number" }, height: { type: "number" },
          },
        },
      ],
    },
    questions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "reason", "required", "inputType", "placeholder", "options"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          reason: { type: "string" },
          required: { type: "boolean" },
          inputType: { type: "string", enum: ["text", "single-choice"] },
          placeholder: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
      },
    },
    regions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceBlockIds", "text", "uiType", "reason"],
        properties: {
          sourceBlockIds: { type: "array", minItems: 1, items: { type: "string" } },
          text: { type: "string" },
          uiType: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

type ModelAnalysisResult = Omit<AnalysisResult, "targetRegions"> & {
  regions: Array<{
    sourceBlockIds: string[];
    text: string;
    uiType: string;
    reason: string;
  }>;
};

function compactLength(text: string) {
  return text.replace(/[\s\p{P}\p{S}]/gu, "").length;
}

function composeOriginal(blocks: OcrBlock[]) {
  const ordered = [...blocks].sort((a, b) => {
    const sameLine = Math.abs(a.y - b.y) <= Math.max(a.height, b.height) * 0.65;
    return sameLine ? a.x - b.x : a.y - b.y;
  });
  return ordered.reduce((text, block) => {
    if (!text) return block.original.trim();
    const next = block.original.trim();
    const joiner = /[\u3400-\u9fff，。！？；：、）】]$/.test(text) || /^[\u3400-\u9fff，。！？；：、（【]/.test(next) ? "" : " ";
    return `${text}${joiner}${next}`;
  }, "");
}

function sanitizeModelText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.some((line) => compactLength(line) >= 12)) return text.trim();
  const narrativeLines = lines.filter((line) => compactLength(line) > 8 || /[，。！？；：,.!?]/.test(line));
  return narrativeLines.join("\n") || text.trim();
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    const blocksRaw = form.get("ocrBlocks");
    const requirement = String(form.get("requirement") ?? "");
    if (!(image instanceof File) || typeof blocksRaw !== "string") {
      return NextResponse.json({ error: "缺少图片或 OCR 结果" }, { status: 400 });
    }

    const blocks = JSON.parse(blocksRaw) as OcrBlock[];
    if (!blocks.length) {
      return NextResponse.json({ error: "未识别到可分析的界面文字，请上传更清晰的截图" }, { status: 422 });
    }

    // 每次分析均从磁盘实时读取，不使用模块级缓存；修改准则后，下一次重新识别立即生效。
    const ocrGuidelines = await readFile(OCR_GUIDELINES_PATH, "utf8");
    const guidelineVersion = createHash("sha256").update(ocrGuidelines).digest("hex").slice(0, 12);

    const prompt = `你是一名熟悉复杂 B 端产品的 UX 文案专家。请结合界面截图和 OCR 文字完成页面分析。

以下是本项目当前生效的《OCR 段落文案识别准则》。你必须严格依据准则判断页面分区、段落边界、强制断段条件和待优化文案类型；当 OCR 坐标结果与截图视觉结构冲突时，以截图中的容器、分栏和实际语义为准。

<ocr_recognition_guidelines version="${guidelineVersion}">
${ocrGuidelines}
</ocr_recognition_guidelines>

OCR 原子文字单元（坐标为归一化坐标）：
${JSON.stringify(blocks)}

用户预先补充的要求：${requirement || "无"}

任务要求：
1. 理解页面所属系统、当前页面核心功能和用户任务；不要仅复述文字。
2. 先判断当前焦点层级。focusType 为 page、modal、drawer 或 popover；存在前景焦点容器时，focusBounds 返回其归一化外接矩形，否则返回 null。
3. 根据截图视觉结构把属于同一自然段落的原子文字单元组合成 regions；每个 region 的 sourceBlockIds 必须按自然阅读顺序列出。
4. 只输出真正需要优化的业务说明、状态提示、弹窗提示、功能说明、风险说明或免责声明。按钮短词、导航、字段标签、动态数据和专有名称通常不参与优化。必须检查表单区的括号注释、功能联动限制和失效条件，这类文字即使字号较小也属于高优先级候选，不能遗漏。
5. sourceBlockIds 只能使用上方 OCR 原子单元中真实存在的 id。不同页面分区、容器、表单项或模态层级的单元不得组成同一个 region。
6. 检测到模态框或带蒙层的抽屉时，regions 只能包含焦点容器内部的文字，必须完全忽略背景页面。
7. 在本次分析阶段就判断业务信息是否充分。若不充分，needsMoreInfo=true，并根据截图中的具体业务最多提出 3 个结构化问题；问题必须与当前业务直接相关，不能使用固定模板。若充分，questions 返回空数组。
8. text 必须是该段落在截图中的完整原文，不得优化、改写或补充。
9. optimizationBasis 必须与最终 regions 数量和类型一致；没有需要优化的文案时明确说明未发现候选。
10. optimizationBasis 用一句话说明筛选和表达策略。`;

    const modelResult = await createKimiStructuredResponse<ModelAnalysisResult>({
      schema: analysisSchema,
      prompt,
      imageDataUrl: await fileToDataUrl(image),
    });

    const blocksById = new Map(blocks.map((block) => [block.id, block]));
    const usedIds = new Set<string>();
    let targetRegions: OcrBlock[] = [];
    const focus: FocusRegion = {
      type: modelResult.focusType ?? "page",
      bounds: modelResult.focusBounds ?? null,
    };

    for (const region of modelResult.regions) {
      const selectedBlocks = region.sourceBlockIds
        .filter((id) => blocksById.has(id) && !usedIds.has(id))
        .map((id) => blocksById.get(id)!);
      let sourceBlocks = validateRegionBlocks(selectedBlocks, region.text, focus);
      const containsNarrative = sourceBlocks.some((block) => compactLength(block.original) >= 12);
      if (containsNarrative) {
        const withoutShortLabels = sourceBlocks.filter((block) => compactLength(block.original) > 8 || /[，。！？；：,.!?]/.test(block.original));
        if (withoutShortLabels.length) sourceBlocks = withoutShortLabels;
      }
      if (!sourceBlocks.length || !region.text.trim()) continue;
      sourceBlocks.forEach((block) => usedIds.add(block.id));
      const x0 = Math.min(...sourceBlocks.map((block) => block.x));
      const y0 = Math.min(...sourceBlocks.map((block) => block.y));
      const x1 = Math.max(...sourceBlocks.map((block) => block.x + block.width));
      const y1 = Math.max(...sourceBlocks.map((block) => block.y + block.height));
      targetRegions.push({
        id: `region-${targetRegions.length}`,
        x: x0,
        y: y0,
        width: x1 - x0,
        height: y1 - y0,
        // 文案正文优先采用视觉模型对原图的转写，避免低对比度、小字号 OCR 错字；
        // 坐标仍完全来自本地 OCR，模型不能虚构框选位置。
        original: sanitizeModelText(region.text) || composeOriginal(sourceBlocks),
        confidence: sourceBlocks.reduce((sum, block) => sum + (block.confidence ?? 0), 0) / sourceBlocks.length,
      });
    }


    // 同一焦点容器已有完整说明正文时，移除模型偶发单列出的短标题、空状态词或操作词。
    if (targetRegions.some((region) => compactLength(region.original) >= 15)) {
      targetRegions = targetRegions.filter((region) => compactLength(region.original) > 8 || /[，。！？；：,.!?]/.test(region.original));
    }

    if (/无需优化|无须优化|不需要优化|未发现.*优化/.test(modelResult.optimizationBasis)) {
      targetRegions.length = 0;
    }

    const result: AnalysisResult = {
      ...modelResult,
      targetRegions,
      focusType: focus.type,
      focusBounds: focus.bounds,
      optimizationBasis: targetRegions.length
        ? modelResult.optimizationBasis
        : "当前页面未发现明确需要优化的业务说明型文案，可重新识别或更换截图。",
    };
    delete (result as AnalysisResult & { regions?: unknown }).regions;
    if (!result.needsMoreInfo) result.questions = [];
    return NextResponse.json(result, {
      headers: {
        "X-OCR-Guidelines-Version": guidelineVersion,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片分析失败";
    const notConfigured = message === "MODEL_NOT_CONFIGURED";
    const serviceBusy = /429|rate|limit|timeout|超时/i.test(message);
    return NextResponse.json({
      error: notConfigured
        ? "尚未配置 Kimi 模型服务，请在 .env.local 中设置 MOONSHOT_API_KEY"
        : serviceBusy
          ? "模型服务当前繁忙，请稍后重新分析。"
          : "页面分析没有完成，请重新分析；图片和已填写内容不会丢失。",
      code: notConfigured ? "MODEL_NOT_CONFIGURED" : "ANALYSIS_FAILED",
    }, { status: notConfigured ? 503 : 500 });
  }
}
