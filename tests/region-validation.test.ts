import assert from "node:assert/strict";
import test from "node:test";
import { validateRegionBlocks, type FocusRegion } from "../lib/region-validation";
import type { OcrBlock } from "../components/optimizer/types";

const pageFocus: FocusRegion = { type: "page", bounds: null };
const block = (id: string, x: number, y: number, width: number, original: string): OcrBlock => ({
  id, x, y, width, height: 0.02, original, confidence: 0.95,
});

test("相邻多行正文保留为同一段落", () => {
  const input = [
    block("a", 0.2, 0.2, 0.2, "删除后可在回收站查看"),
    block("b", 0.2, 0.225, 0.18, "但同一宝贝只能恢复一次"),
  ];
  assert.deepEqual(validateRegionBlocks(input, "删除后可在回收站查看，但同一宝贝只能恢复一次", pageFocus).map(({ id }) => id), ["a", "b"]);
});

test("相距很远的不同模块不得合并", () => {
  const input = [
    block("target", 0.2, 0.2, 0.22, "安装播放控件才能正常播放实况"),
    block("other", 0.68, 0.72, 0.2, "智能编码开启后部分能力失效"),
  ];
  assert.deepEqual(validateRegionBlocks(input, "安装播放控件才能正常播放实况", pageFocus).map(({ id }) => id), ["target"]);
});

test("模态框存在时排除框外背景文字", () => {
  const input = [
    block("background", 0.1, 0.15, 0.25, "页面顶部背景通知"),
    block("modal-title", 0.34, 0.42, 0.1, "批量删除"),
    block("modal-body", 0.34, 0.45, 0.3, "删除后可到回收站查看并恢复"),
  ];
  const modal: FocusRegion = { type: "modal", bounds: { x: 0.3, y: 0.35, width: 0.4, height: 0.3 } };
  const result = validateRegionBlocks(input, "删除后可到回收站查看并恢复", modal).map(({ id }) => id);
  assert.equal(result.includes("background"), false);
  assert.equal(result.includes("modal-body"), true);
});

test("跨越大面积页面的稀疏框不会被合并", () => {
  const input = [
    block("top", 0.02, 0.04, 0.08, "顶部提示"),
    block("bottom", 0.86, 0.88, 0.1, "底部说明"),
  ];
  assert.equal(validateRegionBlocks(input, "顶部提示底部说明", pageFocus).length, 1);
});
