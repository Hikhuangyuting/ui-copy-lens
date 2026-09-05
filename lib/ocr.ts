import type { OcrBlock } from "@/components/optimizer/types";

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
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("chi_sim+eng", 1, {
    logger: (message) => onProgress?.({
      status: message.status,
      progress: message.progress ?? 0,
    }),
  });
  const abortWorker = () => { void worker.terminate(); };
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
    try {
      await worker.terminate();
    } catch {
      // 取消分析时 worker 可能已经被终止；此处无需覆盖取消状态。
    }
  }
}
