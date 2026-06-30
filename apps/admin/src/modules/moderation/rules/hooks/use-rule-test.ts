import { useCallback, useState } from "react";
import { apiClient } from "../../../../lib/api";
import type { AdminModerationRuleTestResp } from "@repo/api";

const MAX_TEST_CHARS = 10000;

export type RuleTestTarget = "current" | "candidate";

export interface UseRuleTestOptions {
  currentRulesetId: number;
  candidateRulesetId?: number;
  candidateReady: boolean;
}

export interface UseRuleTestResult {
  text: string;
  setText: (value: string) => void;
  target: RuleTestTarget;
  setTarget: (value: RuleTestTarget) => void;
  result: AdminModerationRuleTestResp | null;
  isSubmitting: boolean;
  error: string | null;
  charLimitError: string | null;
  runTest: () => Promise<void>;
  reset: () => void;
}

export function useRuleTest({
  currentRulesetId,
  candidateRulesetId,
  candidateReady,
}: UseRuleTestOptions): UseRuleTestResult {
  const [text, setText] = useState("");
  const [target, setTarget] = useState<RuleTestTarget>("current");
  const [result, setResult] = useState<AdminModerationRuleTestResp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charLimitError =
    text.length > MAX_TEST_CHARS ? `测试文本不能超过 ${MAX_TEST_CHARS} 字符` : null;

  const reset = useCallback(() => {
    setText("");
    setTarget("current");
    setResult(null);
    setError(null);
  }, []);

  const runTest = useCallback(async () => {
    if (charLimitError) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const rulesetId =
        target === "candidate" && candidateReady && candidateRulesetId
          ? candidateRulesetId
          : currentRulesetId;
      const resp = await apiClient.moderation.rules.testText({
        text,
        ruleset_id: target === "candidate" ? rulesetId : undefined,
      });
      setResult(resp);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "试跑失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [charLimitError, candidateReady, candidateRulesetId, currentRulesetId, target, text]);

  return {
    text,
    setText,
    target,
    setTarget,
    result,
    isSubmitting,
    error,
    charLimitError,
    runTest,
    reset,
  };
}
