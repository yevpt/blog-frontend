import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminArticlePageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import {
  mapAdminArticleToRow,
  parseOptionalIdFilter,
  toArticleListSortBy,
  toArticleListSortOrder,
  type ArticleRow,
  type ArticleTableSort,
} from "../model";

export interface AdminArticleListFilters {
  categoryId: string;
  search: string;
}

export interface UseAdminArticleListResult {
  rows: ArticleRow[];
  pageData: AdminArticlePageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminArticleListFilters;
  sort?: ArticleTableSort;
  setSort: (sort?: ArticleTableSort) => void;
  setSearch: (value: string) => void;
  setCategoryId: (value: string) => void;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_FILTERS: AdminArticleListFilters = {
  categoryId: "all",
  search: "",
};

export function useAdminArticleList(): UseAdminArticleListResult {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminArticleListFilters>(DEFAULT_FILTERS);
  const [sort, setSortState] = useState<ArticleTableSort | undefined>();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageData, setPageData] = useState<AdminArticlePageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const previousDebouncedSearchRef = useRef(debouncedSearch);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filters.search]);

  useEffect(() => {
    if (previousDebouncedSearchRef.current === debouncedSearch) return;
    previousDebouncedSearchRef.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

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

  const setSearch = useCallback((value: string) => {
    setFilters((current) => ({ ...current, search: value }));
  }, []);

  const setCategoryId = useCallback((value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, categoryId: value }));
  }, []);

  const setSort = useCallback((nextSort?: ArticleTableSort) => {
    setPage(1);
    setSortState(nextSort);
  }, []);

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
    refetch,
  };
}
