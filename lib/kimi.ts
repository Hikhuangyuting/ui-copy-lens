type StructuredResponseOptions = {
  schema: Record<string, unknown>;
  prompt: string;
  imageDataUrl?: string;
};

type KimiPayload = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function requestKimi(url: string, init: RequestInit): Promise<Response> {
  let lastNetworkError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
      if (response.status !== 429 || attempt === 2) return response;

      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 1_200 * (attempt + 1));
    } catch (error) {
      lastNetworkError = error;
      if (attempt === 2) break;
      await wait(800 * (attempt + 1));
    }
  }

  const cause = lastNetworkError instanceof Error ? lastNetworkError.message : "未知网络错误";
  throw new Error(`无法连接 Kimi 模型服务：${cause}`);
}

function parseJsonContent<T>(content: string): T {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(normalized) as T;
  } catch {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(normalized.slice(start, end + 1)) as T;
    throw new Error("Kimi 没有返回可解析的 JSON 结果");
  }
}

export async function createKimiStructuredResponse<T>({ schema, prompt, imageDataUrl }: StructuredResponseOptions): Promise<T> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) throw new Error("MODEL_NOT_CONFIGURED");

  const baseUrl = (process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.cn/v1").replace(/\/$/, "");
  const content: Array<Record<string, unknown>> = [];
  if (imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }
  content.push({
    type: "text",
    text: `${prompt}\n\n请只返回一个合法 JSON 对象，不要使用 Markdown 代码块。返回结果必须符合以下 JSON Schema：\n${JSON.stringify(schema)}`,
  });

  const response = await requestKimi(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MOONSHOT_VISION_MODEL ?? "kimi-k2.6",
      messages: [
        {
          role: "system",
          content: "你是熟悉复杂 B 端系统的 UX 文案专家。必须严格输出 JSON，并保持事实准确。",
        },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
    }),
  });

  const payload = await response.json() as KimiPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Kimi 模型服务请求失败（${response.status}）`);
  }

  const outputText = payload.choices?.[0]?.message?.content;
  if (!outputText) throw new Error("Kimi 没有返回可解析的结构化结果");
  return parseJsonContent<T>(outputText);
}

export async function fileToDataUrl(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}
