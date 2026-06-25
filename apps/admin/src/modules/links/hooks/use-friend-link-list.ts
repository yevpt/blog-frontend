import { useCallback, useEffect, useMemo, useState } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapFriendLinkToRow, type FriendLinkRow } from "../model";

const ADMIN_LIST_PAGE_SIZE = 50;

export interface UseFriendLinkListResult {
  rows: FriendLinkRow[];
  items: FriendLinkItemResp[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFriendLinkList(): UseFriendLinkListResult {
  const [items, setItems] = useState<FriendLinkItemResp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFriendLinks() {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await apiClient.friendLinks.listAdmin({
          page: 1,
          page_size: ADMIN_LIST_PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(resp.list);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载友链失败"));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFriendLinks();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const rows = useMemo(() => items.map(mapFriendLinkToRow), [items]);

  return { rows, items, isLoading, error, refetch };
}
