import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminModerationImportResp } from "@repo/api";
import { apiClient } from "../../../../lib/api";

const ACTIVE_STATUSES = new Set(["queued", "validating", "valid"]);

function isActiveImport(item: AdminModerationImportResp): boolean {
  if (ACTIVE_STATUSES.has(item.validation_status)) return true;
  if (item.validation_status === "valid" && item.ruleset_id) return true;
  return false;
}

export interface UseRuleImportsOptions {
  open: boolean;
  currentRulesetId: number;
  onPublished: () => void;
}

export interface UseRuleImportsResult {
  active: AdminModerationImportResp | null;
  history: AdminModerationImportResp[];
  isLoading: boolean;
  error: string | null;
  upload: (input: {
    file: File;
    format: "csv" | "txt";
    sourceName: string;
    defaultCategory: string;
    defaultRiskLevel: "low" | "medium" | "high";
    defaultEffect: "review" | "allow";
    defaultPriority: number;
  }) => Promise<void>;
  publish: () => Promise<void>;
  cancel: () => Promise<void>;
  reloadHistory: () => void;
}

export function useRuleImports({
  open,
  currentRulesetId,
  onPublished,
}: UseRuleImportsOptions): UseRuleImportsResult {
  const [active, setActive] = useState<AdminModerationImportResp | null>(null);
  const [history, setHistory] = useState<AdminModerationImportResp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const activeRef = useRef<AdminModerationImportResp | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const reloadHistory = useCallback(() => {
    setReloadToken((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      setError(null);
      try {
        const page = await apiClient.moderation.ruleImports.list({ limit: 20 });
        if (cancelled) return;
        setHistory(page.list);
        const newestActive = page.list.find(isActiveImport);
        if (newestActive) {
          const detail = await apiClient.moderation.ruleImports.get(newestActive.id);
          if (!cancelled) setActive(detail);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载导入任务失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [open, reloadToken]);

  useEffect(() => {
    if (!open || !active) return undefined;

    const shouldPoll =
      ACTIVE_STATUSES.has(active.validation_status) ||
      (active.validation_status === "valid" && Boolean(active.ruleset_id));

    if (!shouldPoll) return undefined;

    const timer = window.setInterval(() => {
      void apiClient.moderation.ruleImports.get(active.id).then((detail) => {
        setActive(detail);
        if (!isActiveImport(detail)) reloadHistory();
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [active, open, reloadHistory]);

  const upload = useCallback(
    async (input: {
      file: File;
      format: "csv" | "txt";
      sourceName: string;
      defaultCategory: string;
      defaultRiskLevel: "low" | "medium" | "high";
      defaultEffect: "review" | "allow";
      defaultPriority: number;
    }) => {
      setError(null);
      const created = await apiClient.moderation.ruleImports.create({
        file: input.file,
        format: input.format,
        source_name: input.sourceName,
        default_category: input.defaultCategory as never,
        default_risk_level: input.defaultRiskLevel,
        default_effect: input.defaultEffect,
        default_priority: input.defaultPriority,
      });
      setActive(created);
      reloadHistory();
    },
    [reloadHistory],
  );

  const publish = useCallback(async () => {
    if (!active?.id) return;
    await apiClient.moderation.ruleImports.publish(active.id, {
      expected_ruleset_version: currentRulesetId,
    });
    setActive(null);
    onPublished();
    reloadHistory();
  }, [active, currentRulesetId, onPublished, reloadHistory]);

  const cancel = useCallback(async () => {
    if (!active?.id) return;
    await apiClient.moderation.ruleImports.cancel(active.id);
    setActive(null);
    reloadHistory();
  }, [active, reloadHistory]);

  return {
    active,
    history,
    isLoading,
    error,
    upload,
    publish,
    cancel,
    reloadHistory,
  };
}
