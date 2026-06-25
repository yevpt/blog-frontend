import { useCallback, useEffect, useMemo, useState } from "react";
import type { TagItemResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapTagToRow, type TagRow } from "../model";

export interface UseTagListResult {
  rows: TagRow[];
  items: TagItemResp[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTagList(): UseTagListResult {
  const [items, setItems] = useState<TagItemResp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTags() {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await apiClient.tags.list();
        if (cancelled) return;
        setItems(resp.list);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载标签失败"));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const rows = useMemo(() => items.map(mapTagToRow), [items]);

  return { rows, items, isLoading, error, refetch };
}
