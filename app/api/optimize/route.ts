import { NextResponse } from "next/server";
import type { AnalysisResult, CopyStyle } from "@/components/optimizer/types";
import { createKimiStructuredResponse } from "@/lib/kimi";

const optimizeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["regions"],
  properties: {
    regions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "optimized"],
        properties: { id: { type: "string" }, optimized: { type: "string" } },
      },
    },
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      analysis: AnalysisResult;
      answers: Record<string, string>;
      requirement: string;
      style: CopyStyle;
    };
    const targets = body.analysis.targetRegions;
    if (!targets.length) {
      return NextResponse.json({ error: "当前没有可优化的文案，请重新识别或更换截图。" }, { status: 422 });
    }
    const missingRequired = body.analysis.questions.some((question) => question.required && !body.answers[question.id]?.trim());
    if (body.analysis.needsMoreInfo && missingRequired) {
      return NextResponse.json({ error: "请先完成必填的业务信息。" }, { status: 422 });
    }
    const result = await createKimiStructuredResponse<{ regions: Array<{ id: string; optimized: string }> }>({
      schema: optimizeSchema,
      prompt: `你是一名专业 UX 文案设计师。请基于以下页面理解、目标文案和业务补充信息生成优化结果。

页面理解：${body.analysis.pageUnderstanding}
优化依据：${body.analysis.optimizationBasis}
风格：${body.style}
补充要求：${body.requirement || "无"}
结构化业务答案：${JSON.stringify(body.answers)}
待优化文字：${JSON.stringify(targets.map(({ id, original }) => ({ id, original })))}

要求：保留业务事实，不编造未提供的系统行为；表达简洁、用户可理解；每个 id 必须原样返回且只返回一次。`,
    });

    const validIds = new Set(targets.map((target) => target.id));
    return NextResponse.json({ regions: result.regions.filter((region) => validIds.has(region.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文案优化失败";
    const notConfigured = message === "MODEL_NOT_CONFIGURED";
    const serviceBusy = /429|rate|limit|timeout|超时/i.test(message);
    return NextResponse.json({ error: notConfigured ? "尚未配置 Kimi 模型服务，请在 .env.local 中设置 MOONSHOT_API_KEY" : serviceBusy ? "模型服务当前繁忙，请稍后重新优化。" : "文案优化没有完成，请重试；图片和已填写内容不会丢失。" }, { status: notConfigured ? 503 : 500 });
  }
}
