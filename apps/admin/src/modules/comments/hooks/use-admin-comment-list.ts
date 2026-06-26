import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminCommentPageResp, AdminCommentTargetType } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapCommentToRow, type CommentRow } from "../model";

interface AdminCommentListFilters {
  targetType: AdminCommentTargetType;
  search: string;
}

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
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminCommentList(): UseAdminCommentListResult {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminCommentListFilters>({
    targetType: "all",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageData, setPageData] = useState<AdminCommentPageResp | null>(null);
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

  const setSearch = useCallback((value: string) => {
    setFilters((current) => ({ ...current, search: value }));
  }, []);

  const setTargetType = useCallback((value: AdminCommentTargetType) => {
    setPage(1);
    setFilters((current) => ({ ...current, targetType: value }));
  }, []);

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
    refetch,
  };
}
