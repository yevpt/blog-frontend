import { useCallback, useEffect, useState } from "react";
import type { AdminModerationHistoryResp } from "@repo/api";
import { apiClient } from "../../../lib/api";

export type ModerationDetailsTab = "current" | "history";

export interface UseModerationHistoryOptions {
  open: boolean;
  activeTab: ModerationDetailsTab;
  itemId: number | null | undefined;
}

export interface UseModerationHistoryResult {
  data: AdminModerationHistoryResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
}

export function useModerationHistory({
  open,
  activeTab,
  itemId,
}: UseModerationHistoryOptions): UseModerationHistoryResult {
  const [data, setData] = useState<AdminModerationHistoryResp | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPageState] = useState(1);

  // itemId 或弹窗状态变化时重置分页
  useEffect(() => {
    setPageState(1);
    setData(null);
  }, [itemId, open]);

  useEffect(() => {
    // 仅在弹窗打开且选中历史页签且有有效 itemId 时请求
    if (!open || activeTab !== "history" || !itemId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void apiClient.moderation
      .getHistory(itemId, { page })
      .then((resp) => {
        if (!cancelled) {
          setData(resp);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("加载审计历史失败"));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, activeTab, itemId, page]);

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
  }, []);

  return { data, isLoading, error, page, setPage };
}
