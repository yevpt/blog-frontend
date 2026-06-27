import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminCommentPageResp, AdminCommentTargetType } from "@repo/api";
import { useAdminListQuery, useDebouncedValue } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import {
  commentListQueryCodec,
  mapCommentToRow,
  type AdminCommentListFilters,
  type CommentRow,
} from "../model";

export type { AdminCommentListFilters };

export interface UseAdminCommentListResult {
  rows: CommentRow[];
  pageData: AdminCommentPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminCommentListFilters;
  setSearch: (value: string) => void;
  setTargetType: (value: AdminCommentTargetType) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminCommentList(): UseAdminCommentListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(commentListQueryCodec);
  const { page, filters } = state;
  const debouncedSearch = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);
  const [pageData, setPageData] = useState<AdminCommentPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  const query = useMemo(
    () => ({
      target_type: filters.targetType,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [debouncedSearch, filters.targetType],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.comments.listAdmin({
          page,
          page_size: DEFAULT_PAGE_SIZE,
          ...query,
        });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载评论失败"));
        setPageData(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [page, query, reloadToken]);

  const setPage = useCallback(
    (nextPage: number) => {
      patchState((previous) => ({ ...previous, page: nextPage }));
    },
    [patchState],
  );

  const setSearch = useCallback(
    (value: string) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: { ...previous.filters, search: value },
      }));
    },
    [patchState],
  );

  const setTargetType = useCallback(
    (value: AdminCommentTargetType) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: { ...previous.filters, targetType: value },
      }));
    },
    [patchState],
  );

  const rows = useMemo(() => pageData?.list.map(mapCommentToRow) ?? [], [pageData]);

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setSearch,
    setTargetType,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
