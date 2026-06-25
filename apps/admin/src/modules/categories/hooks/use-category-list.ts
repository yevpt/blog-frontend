import { useCallback, useEffect, useMemo, useState } from "react";
import type { CategoryTabItem } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapCategoryToRow, type CategoryRow } from "../model";

export interface UseCategoryListResult {
  rows: CategoryRow[];
  items: CategoryTabItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCategoryList(): UseCategoryListResult {
  const [items, setItems] = useState<CategoryTabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await apiClient.categories.listTabs();
        if (cancelled) return;
        setItems(resp.list);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载分类失败"));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const rows = useMemo(() => items.map(mapCategoryToRow), [items]);

  return { rows, items, isLoading, error, refetch };
}
