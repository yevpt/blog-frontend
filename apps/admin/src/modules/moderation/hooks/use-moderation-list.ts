import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminModerationPageResp } from "@repo/api";
import { useAdminListQuery } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import {
  mapItemToRow,
  moderationListQueryCodec,
  toListReq,
  type AdminModerationListFilters,
  type FilterValue,
  type ModerationRow,
} from "../model";

export type { AdminModerationListFilters, FilterValue };

export interface UseModerationListResult {
  rows: ModerationRow[];
  pageData: AdminModerationPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminModerationListFilters;
  setContentType: (value: FilterValue) => void;
  setRiskLevel: (value: FilterValue) => void;
  setReviewStatus: (value: FilterValue) => void;
  setPublicState: (value: FilterValue) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

export function useModerationList(): UseModerationListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(moderationListQueryCodec);
  const { page, filters } = state;
  const [pageData, setPageData] = useState<AdminModerationPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  const query = useMemo(() => toListReq({ page, filters }), [page, filters]);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.moderation.listItems(query);
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载审核列表失败"));
        setPageData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [query, reloadToken]);

  const setPage = useCallback(
    (nextPage: number) => {
      patchState((previous) => ({ ...previous, page: nextPage }));
    },
    [patchState],
  );

  const setFilter = useCallback(
    (key: keyof AdminModerationListFilters, value: FilterValue) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: { ...previous.filters, [key]: value },
      }));
    },
    [patchState],
  );

  const setContentType = useCallback(
    (value: FilterValue) => setFilter("contentType", value),
    [setFilter],
  );

  const setRiskLevel = useCallback(
    (value: FilterValue) => setFilter("riskLevel", value),
    [setFilter],
  );

  const setReviewStatus = useCallback(
    (value: FilterValue) => setFilter("reviewStatus", value),
    [setFilter],
  );

  const setPublicState = useCallback(
    (value: FilterValue) => setFilter("publicState", value),
    [setFilter],
  );

  const rows = useMemo(() => pageData?.list.map(mapItemToRow) ?? [], [pageData]);

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setContentType,
    setRiskLevel,
    setReviewStatus,
    setPublicState,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
