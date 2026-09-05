import type { OcrBlock } from "../components/optimizer/types";

export type FocusRegion = {
  type: "page" | "modal" | "drawer" | "popover";
  bounds: { x: number; y: number; width: number; height: number } | null;
};

const center = (block: OcrBlock) => ({ x: block.x + block.width / 2, y: block.y + block.height / 2 });
const horizontalGap = (a: OcrBlock, b: OcrBlock) => Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
const verticalGap = (a: OcrBlock, b: OcrBlock) => Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
const overlap = (startA: number, endA: number, startB: number, endB: number) =>
  Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));

function areSpatialNeighbors(a: OcrBlock, b: OcrBlock) {
  const height = Math.max(a.height, b.height, 0.006);
  const sameLine = Math.abs(center(a).y - center(b).y) <= height * 0.8
    && horizontalGap(a, b) <= Math.max(0.018, height * 2.2);
  const horizontalOverlap = overlap(a.x, a.x + a.width, b.x, b.x + b.width);
  const minWidth = Math.max(0.001, Math.min(a.width, b.width));
  const aligned = Math.abs(a.x - b.x) <= Math.max(0.025, height * 2);
  const adjacentLine = verticalGap(a, b) <= height * 1.15
    && (horizontalOverlap / minWidth >= 0.25 || aligned);
  return sameLine || adjacentLine;
}

function connectedComponents(blocks: OcrBlock[]) {
  const remaining = new Set(blocks.map((_, index) => index));
  const components: OcrBlock[][] = [];
  while (remaining.size) {
    const first = remaining.values().next().value as number;
    remaining.delete(first);
    const queue = [first];
    const component: OcrBlock[] = [];
    while (queue.length) {
      const index = queue.shift()!;
      component.push(blocks[index]);
      for (const candidate of [...remaining]) {
        if (areSpatialNeighbors(blocks[index], blocks[candidate])) {
          remaining.delete(candidate);
          queue.push(candidate);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function insideFocus(block: OcrBlock, focus: FocusRegion) {
  if (!focus.bounds || focus.type === "page") return true;
  const point = center(block);
  const padding = 0.012;
  return point.x >= focus.bounds.x - padding
    && point.x <= focus.bounds.x + focus.bounds.width + padding
    && point.y >= focus.bounds.y - padding
    && point.y <= focus.bounds.y + focus.bounds.height + padding;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function componentScore(blocks: OcrBlock[], targetText: string) {
  const normalizedTarget = normalizeText(targetText);
  const matchingLength = blocks.reduce((sum, block) => {
    const text = normalizeText(block.original);
    return sum + (text && normalizedTarget.includes(text) ? text.length : 0);
  }, 0);
  const x0 = Math.min(...blocks.map((block) => block.x));
  const y0 = Math.min(...blocks.map((block) => block.y));
  const x1 = Math.max(...blocks.map((block) => block.x + block.width));
  const y1 = Math.max(...blocks.map((block) => block.y + block.height));
  const bboxArea = Math.max(0.0001, (x1 - x0) * (y1 - y0));
  const textArea = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
  const density = Math.min(1, textArea / bboxArea);
  return matchingLength * 10 + blocks.length + density * 5 - bboxArea * 8;
}

export function validateRegionBlocks(selected: OcrBlock[], targetText: string, focus: FocusRegion) {
  const focusBlocks = selected.filter((block) => insideFocus(block, focus));
  const eligible = focusBlocks.length ? focusBlocks : focus.type === "page" ? selected : [];
  if (!eligible.length) return [];
  const components = connectedComponents(eligible);
  const best = components.sort((a, b) => componentScore(b, targetText) - componentScore(a, targetText))[0] ?? [];
  if (!best.length) return [];

  const x0 = Math.min(...best.map((block) => block.x));
  const y0 = Math.min(...best.map((block) => block.y));
  const x1 = Math.max(...best.map((block) => block.x + block.width));
  const y1 = Math.max(...best.map((block) => block.y + block.height));
  const bboxArea = (x1 - x0) * (y1 - y0);
  const textArea = best.reduce((sum, block) => sum + block.width * block.height, 0);
  if (bboxArea > 0.22 || (bboxArea > 0.035 && textArea / bboxArea < 0.045)) return [];
  return best;
}
