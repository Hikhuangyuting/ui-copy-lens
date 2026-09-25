import type { OcrBlock } from "@/components/optimizer/types";

type OcrWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;
let workerPromise: Promise<OcrWorker> | null = null;
let progressListener: ((progress: OcrProgress) => void) | undefined;

async function getWorker(onProgress?: (progress: OcrProgress) => void) {
  progressListener = onProgress;
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    workerPromise = createWorker("chi_sim+eng", 1, {
      // 语言包随应用发布，避免浏览器运行时依赖 jsDelivr/CDN。
      langPath: "/tessdata",
      logger: (message) => progressListener?.({ status: message.status, progress: message.progress ?? 0 }),
    });
  }
  return workerPromise;
}

export type OcrProgress = {
  status: string;
  progress: number;
};

export async function recognizeInterfaceText(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
  signal?: AbortSignal
): Promise<OcrBlock[]> {
  if (signal?.aborted) throw new DOMException("分析已取消", "AbortError");
  const bitmap = await createImageBitmap(file);
  const imageWidth = bitmap.width;
  const imageHeight = bitmap.height;
  bitmap.close();
  const worker = await getWorker(onProgress);
  const abortWorker = () => {
    workerPromise = null;
    void worker.terminate();
  };
  signal?.addEventListener("abort", abortWorker, { once: true });

  try {
    const result = await worker.recognize(file, {}, { blocks: true });
    if (signal?.aborted) throw new DOMException("分析已取消", "AbortError");
    const words = result.data.blocks?.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.flatMap((line) => line.words)
      )
    ).filter((word) => word.text.trim().length > 0 && word.confidence >= 30) ?? [];

    // 只输出原子文字单元，不在本地提前猜测段落。段落组合交由视觉模型依据截图与准则完成。
    return words.map((word, index) => ({
      id: `word-${index}`,
      x: word.bbox.x0 / imageWidth,
      y: word.bbox.y0 / imageHeight,
      width: (word.bbox.x1 - word.bbox.x0) / imageWidth,
      height: (word.bbox.y1 - word.bbox.y0) / imageHeight,
      original: word.text.trim(),
      confidence: word.confidence / 100,
    }));
  } finally {
    signal?.removeEventListener("abort", abortWorker);
    // Worker 跨请求复用，避免每次重新加载中英文识别模型。
  }
}
