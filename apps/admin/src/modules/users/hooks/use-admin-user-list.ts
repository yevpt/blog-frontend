import { useCallback, useEffect, useState } from "react";
import type { AdminUserListReq, AdminUserPageResp } from "@repo/api";
import { useAdminListQuery } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import {
  mapUserToRow,
  userListQueryCodec,
  type AdminUserListFilters,
  type UserRow,
} from "../model";

export interface UseAdminUserListResult {
  rows: UserRow[];
  pageData: AdminUserPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminUserListFilters;
  setFilters: (updater: (previous: AdminUserListFilters) => AdminUserListFilters) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;

function toAdminRole(role: string): AdminUserListReq["role"] {
  if (role === "ROLE_ADMIN" || role === "ROLE_VIP" || role === "ROLE_NORMAL") return role;
  return undefined;
}

function toAccountStatus(status: string): AdminUserListReq["status"] {
  if (status === "active" || status === "disabled") return status;
  return undefined;
}

export function useAdminUserList(): UseAdminUserListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(userListQueryCodec);
  const { page, filters } = state;
  const [pageData, setPageData] = useState<AdminUserPageResp | null>(null);
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
        const keyword = filters.keyword.trim();
        const data = await apiClient.users.listAdmin({
          page,
          page_size: DEFAULT_PAGE_SIZE,
          keyword: keyword || undefined,
          role: toAdminRole(filters.role),
          status: toAccountStatus(filters.status),
        });
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
  }, [page, filters, reloadToken]);

  const setPage = useCallback(
    (nextPage: number) => {
      patchState((previous) => ({ ...previous, page: nextPage }));
    },
    [patchState],
  );

  const setFilters = useCallback(
    (updater: (previous: AdminUserListFilters) => AdminUserListFilters) => {
      patchState((previous) => ({
        ...previous,
        page: 1,
        filters: updater(previous.filters),
      }));
    },
    [patchState],
  );

  const rows = pageData?.list.map(mapUserToRow) ?? [];

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
