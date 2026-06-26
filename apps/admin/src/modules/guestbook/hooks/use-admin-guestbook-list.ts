import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminGuestbookPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapGuestbookToRow, type GuestbookRow } from "../model";

interface AdminGuestbookListFilters {
  search: string;
}

export interface UseAdminGuestbookListResult {
  rows: GuestbookRow[];
  pageData: AdminGuestbookPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminGuestbookListFilters;
  setSearch: (value: string) => void;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function useAdminGuestbookList(): UseAdminGuestbookListResult {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminGuestbookListFilters>({ search: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageData, setPageData] = useState<AdminGuestbookPageResp | null>(null);
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

    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (previousDebouncedSearchRef.current === debouncedSearch) return;
    previousDebouncedSearchRef.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;

    async function loadGuestbook() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.guestbook.listAdmin({
          page,
          page_size: DEFAULT_PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载留言失败"));
        setPageData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadGuestbook();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, reloadToken]);

  const setSearch = useCallback((value: string) => {
    setFilters({ search: value });
  }, []);

  const rows = useMemo(() => pageData?.list.map(mapGuestbookToRow) ?? [], [pageData]);

  return { rows, pageData, isLoading, error, page, setPage, filters, setSearch, refetch };
}
