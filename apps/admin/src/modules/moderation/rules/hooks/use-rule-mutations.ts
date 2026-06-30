import { useCallback, useState } from "react";
import { ApiError } from "@repo/api";
import { apiClient } from "../../../../lib/api";
import type { RuleFormValues } from "../model";
import { validateRuleForm } from "../model";

export interface UseRuleMutationsOptions {
  rulesetId: number;
  onCompleted: () => void;
}

export interface UseRuleMutationsResult {
  isSubmitting: boolean;
  conflictMessage: string | null;
  serverError: string | null;
  create: (values: RuleFormValues) => Promise<boolean>;
  replace: (ruleId: number, values: RuleFormValues) => Promise<boolean>;
  batchStatus: (ruleIds: number[], active: boolean) => Promise<boolean>;
  clearErrors: () => void;
}

function toSaveReq(values: RuleFormValues, rulesetId: number) {
  return {
    expected_ruleset_version: rulesetId,
    name: values.name.trim() || undefined,
    rule_type: values.ruleType,
    pattern: values.pattern.trim(),
    category: values.category,
    effect: values.effect,
    risk_level: values.riskLevel,
    priority: Number(values.priority),
    source_id: Number(values.sourceId),
  };
}

export function useRuleMutations({
  rulesetId,
  onCompleted,
}: UseRuleMutationsOptions): UseRuleMutationsResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const clearErrors = useCallback(() => {
    setConflictMessage(null);
    setServerError(null);
  }, []);

  const handleMutation = useCallback(
    async (action: () => Promise<unknown>) => {
      setIsSubmitting(true);
      setConflictMessage(null);
      setServerError(null);
      try {
        await action();
        onCompleted();
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.code === "MODERATION_RULESET_CONFLICT") {
          setConflictMessage("规则集版本已变化，请刷新状态后重试。");
        } else {
          setServerError(err instanceof Error ? err.message : "操作失败");
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onCompleted],
  );

  const create = useCallback(
    async (values: RuleFormValues) => {
      const formErrors = validateRuleForm(values);
      if (Object.keys(formErrors).length > 0) return false;
      return handleMutation(() => apiClient.moderation.rules.create(toSaveReq(values, rulesetId)));
    },
    [handleMutation, rulesetId],
  );

  const replace = useCallback(
    async (ruleId: number, values: RuleFormValues) => {
      const formErrors = validateRuleForm(values);
      if (Object.keys(formErrors).length > 0) return false;
      return handleMutation(() =>
        apiClient.moderation.rules.replace(ruleId, toSaveReq(values, rulesetId)),
      );
    },
    [handleMutation, rulesetId],
  );

  const batchStatus = useCallback(
    async (ruleIds: number[], active: boolean) =>
      handleMutation(() =>
        apiClient.moderation.rules.batchStatus({
          expected_ruleset_version: rulesetId,
          rule_ids: ruleIds,
          active,
        }),
      ),
    [handleMutation, rulesetId],
  );

  return {
    isSubmitting,
    conflictMessage,
    serverError,
    create,
    replace,
    batchStatus,
    clearErrors,
  };
}
