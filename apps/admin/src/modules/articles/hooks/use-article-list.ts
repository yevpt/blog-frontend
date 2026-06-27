import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminArticlePageResp } from "@repo/api";
import type { DataTableSortState } from "@repo/ui";
import { useAdminListQuery, useDebouncedValue } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import {
  articleListQueryCodec,
  mapAdminArticleToRow,
  parseOptionalIdFilter,
  toArticleListSortBy,
  toArticleListSortOrder,
  type AdminArticleListFilters,
  type ArticleRow,
} from "../model";

export type { AdminArticleListFilters };

export interface UseAdminArticleListResult {
  rows: ArticleRow[];
  pageData: AdminArticlePageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminArticleListFilters;
  sort?: DataTableSortState;
  setSort: (sort?: DataTableSortState) => void;
  setSearch: (value: string) => void;
  setCategoryId: (value: string) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminArticleList(): UseAdminArticleListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(articleListQueryCodec);
  const { page, filters, sort } = state;
  const debouncedSearch = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);
  const [pageData, setPageData] = useState<AdminArticlePageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  const query = useMemo(
    () => ({
      category_id: parseOptionalIdFilter(filters.categoryId),
      search: debouncedSearch || undefined,
      ...(sort
        ? {
            sort_by: toArticleListSortBy(sort.column),
            sort_order: toArticleListSortOrder(sort.direction),
          }
        : {}),
    }),
    [debouncedSearch, filters.categoryId, sort],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.articles.listAdmin({
          ...query,
          page,
          page_size: DEFAULT_PAGE_SIZE,
        });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载文章列表失败"));
        setPageData(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadArticles();

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

  const setCategoryId = useCallback(
    (value: string) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: { ...previous.filters, categoryId: value },
      }));
    },
    [patchState],
  );

  const setSort = useCallback(
    (nextSort?: DataTableSortState) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        sort: nextSort,
      }));
    },
    [patchState],
  );

  const rows = pageData?.list.map(mapAdminArticleToRow) ?? [];

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    sort,
    setSort,
    setSearch,
    setCategoryId,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
