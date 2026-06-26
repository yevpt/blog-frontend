import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapUserToRow, matchUserSearch, type UserRow } from "../model";

export interface UseAdminUserListResult {
  rows: UserRow[];
  visibleRows: UserRow[];
  pageData: UserPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (value: string) => void;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;

export function useAdminUserList(): UseAdminUserListResult {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pageData, setPageData] = useState<UserPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.users.listPublic({ page, page_size: DEFAULT_PAGE_SIZE });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载用户失败"));
        setPageData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const rows = useMemo(() => pageData?.list.map(mapUserToRow) ?? [], [pageData]);
  const visibleRows = useMemo(
    () => rows.filter((row) => matchUserSearch(row, search)),
    [rows, search],
  );

  return {
    rows,
    visibleRows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    search,
    setSearch,
    refetch,
  };
}
