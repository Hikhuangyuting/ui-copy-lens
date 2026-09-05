"use client";

import { useEffect, useState } from "react";
import { Check, PanelRightClose, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AnalysisResult, CopyStyle, FollowUpQuestion, WorkspaceStatus } from "./types";

const STYLES: CopyStyle[] = ["自动匹配", "极致精简", "去专业化", "严谨说明", "友好引导"];

type RulesPanelProps = {
  status: WorkspaceStatus;
  analysis: AnalysisResult | null;
  requirement: string;
  onRequirementChange: (value: string) => void;
  style: CopyStyle;
  onStyleChange: (value: CopyStyle) => void;
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
  onOptimize: () => void;
};

function RequirementField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label htmlFor="requirement" className="block text-base font-medium text-black/80">补充要求</label>
      <div className="relative">
        <textarea id="requirement" value={value} maxLength={1500} onChange={(event) => onChange(event.target.value)} placeholder="补充截图中无法体现的业务背景或文案要求（选填）" className="min-h-[160px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 pb-10 pt-3 text-sm leading-6 text-black outline-none placeholder:text-black/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-sm text-black/35">
          <span>{value.length}/1500</span>
          <button type="button" onClick={() => onChange("")} className="rounded p-1 hover:bg-black/5 hover:text-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="清空补充要求"><Trash2 className="size-4" strokeWidth={1.7} /></button>
        </div>
      </div>
    </div>
  );
}

function QuestionField({ question, value, onChange, touched, onTouched }: { question: FollowUpQuestion; value: string; onChange: (value: string) => void; touched: boolean; onTouched: () => void }) {
  const invalid = Boolean(question.required && touched && !value.trim());
  const errorId = `question-${question.id}-error`;
  return (
    <div>
      <label id={`question-${question.id}-label`} htmlFor={`question-${question.id}`} className="text-sm font-medium leading-5 text-black/80">
        {question.label} {question.required ? <span className="text-red-500">*</span> : null}
      </label>
      {question.reason ? <p className="mt-1 text-xs leading-5 text-black/45">{question.reason}</p> : null}
      {question.inputType === "single-choice" ? (
        <fieldset className="mt-3 flex flex-wrap gap-x-5 gap-y-3" aria-labelledby={`question-${question.id}-label`} aria-describedby={invalid ? errorId : undefined}>
          {[...(question.options ?? []), ...(question.options?.includes("暂不确定") ? [] : ["暂不确定"])].map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 text-sm text-black/70">
              <input id={option === (question.options?.[0] ?? "") ? `question-${question.id}` : undefined} type="radio" name={`question-${question.id}`} value={option} checked={value === option} onChange={(event) => { onTouched(); onChange(event.target.value); }} required={question.required} className="size-4 accent-blue-600" />
              {option}
            </label>
          ))}
        </fieldset>
      ) : (
        <textarea id={`question-${question.id}`} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onTouched} placeholder={question.placeholder || "请补充实际业务规则"} required={question.required} aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined} className={cn("mt-3 min-h-[76px] w-full resize-none rounded-xl border bg-[#fafafa] px-3 py-3 text-sm leading-5 outline-none placeholder:text-black/35 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10", invalid ? "border-red-400" : "border-black/10")} />
      )}
      {invalid ? <p id={errorId} className="mt-2 text-xs text-red-600" role="alert">请完成此项后继续优化</p> : null}
    </div>
  );
}

function UnderstandingCard({ analysis }: { analysis: AnalysisResult }) {
  return (
    <section className="rounded-2xl bg-[#f8f8f8] p-4 text-sm leading-5 text-black/70">
      <h3 className="font-medium text-black/75">页面理解</h3>
      <p className="mt-2">{analysis.pageUnderstanding}</p>
      <h3 className="mt-5 font-medium text-black/75">优化依据</h3>
      <p className="mt-2">{analysis.optimizationBasis}</p>
    </section>
  );
}

export function RulesPanel({ status, analysis, requirement, onRequirementChange, style, onStyleChange, answers, onAnswerChange, onOptimize }: RulesPanelProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const needsInfo = status === "needs-info" && analysis?.needsMoreInfo;
  const hasAnalyzed = Boolean(analysis) && ["analyzed", "needs-info", "completed"].includes(status);
  const requiredComplete = analysis?.questions.filter((question) => question.required).every((question) => answers[question.id]?.trim()) ?? true;
  const hasCandidates = (analysis?.targetRegions.length ?? 0) > 0;
  const canOptimize = hasCandidates && (status === "analyzed" || status === "completed" || (needsInfo && requiredComplete));
  const buttonLabel = needsInfo ? "提交并继续优化" : status === "completed" ? "重新优化" : status === "analyzed" ? "一键优化" : "一键优化";

  useEffect(() => {
    setTouched({});
  }, [analysis]);

  return (
    <aside className="relative z-20 w-full shrink-0 bg-page px-3 pb-3 lg:w-[456px] lg:py-6 lg:pl-0 lg:pr-6">
      <div className="flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-panel lg:h-[calc(100dvh-48px)] lg:min-h-[640px]">
        <header className="flex h-[88px] shrink-0 items-center justify-between px-8">
          <h2 className="text-xl font-medium">优化设置</h2>
          <button type="button" className="rounded-md p-2 text-black/70 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="收起优化设置" title="收起优化设置"><PanelRightClose className="size-4" strokeWidth={1.6} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-7">
            {hasAnalyzed && analysis ? <UnderstandingCard analysis={analysis} /> : null}

            {needsInfo && analysis ? (
              <section className="overflow-hidden rounded-2xl border border-black/10">
                <div className="bg-blue-50 p-4">
                  <h3 className="font-medium text-black/80">还需要补充一些信息</h3>
                  <p className="mt-2 text-sm leading-5 text-black/60">系统根据当前页面发现以下业务信息会影响文案准确性，请按实际情况补充。</p>
                </div>
                <div className="space-y-6 bg-white p-4">
                  {analysis.questions.map((question) => <QuestionField key={question.id} question={question} value={answers[question.id] ?? ""} onChange={(value) => onAnswerChange(question.id, value)} touched={Boolean(touched[question.id])} onTouched={() => setTouched((current) => ({ ...current, [question.id]: true }))} />)}
                </div>
              </section>
            ) : null}

            <div className="space-y-4">
              <RequirementField value={requirement} onChange={onRequirementChange} />
              <fieldset><legend className="sr-only">文案风格</legend><div className="flex flex-wrap gap-2">{STYLES.map((item) => <button type="button" key={item} onClick={() => onStyleChange(item)} aria-pressed={style === item} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-4 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500", style === item ? "border-[#486bf9] bg-white text-[#486bf9]" : "border-black/10 bg-white text-black/75 hover:border-black/25")}>{style === item ? <Check className="size-3.5" aria-hidden /> : null}{item}</button>)}</div></fieldset>
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-white px-8 pb-8 pt-4">
          <Button variant="primary" constrained={false} className="w-full" disabled={!canOptimize} onClick={onOptimize}>{buttonLabel}</Button>
        </div>
      </div>
    </aside>
  );
}
