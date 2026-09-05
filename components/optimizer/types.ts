export type WorkspaceStatus =
  | "empty"
  | "ready"
  | "analyzing"
  | "analyzed"
  | "needs-info"
  | "optimizing"
  | "completed"
  | "error";

export type CopyStyle =
  | "自动匹配"
  | "极致精简"
  | "去专业化"
  | "严谨说明"
  | "友好引导";

export type TextRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  original: string;
  optimized: string;
  confidence?: number;
};

export type OcrBlock = Omit<TextRegion, "optimized"> & {
  optimized?: string;
};

export type FollowUpQuestion = {
  id: string;
  label: string;
  reason: string;
  required: boolean;
  inputType: "text" | "single-choice";
  placeholder?: string;
  options?: string[];
};

export type AnalysisResult = {
  pageUnderstanding: string;
  optimizationBasis: string;
  suggestedStyle: CopyStyle;
  needsMoreInfo: boolean;
  questions: FollowUpQuestion[];
  targetRegions: OcrBlock[];
  focusType?: "page" | "modal" | "drawer" | "popover";
  focusBounds?: { x: number; y: number; width: number; height: number } | null;
};
