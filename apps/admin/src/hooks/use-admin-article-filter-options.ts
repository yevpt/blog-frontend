import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { buildIdFilterOptions, type FilterOption } from "../pages/articles-page-data";

export function useAdminArticleFilterOptions() {
  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([
    { value: "all", label: "全部" },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      setIsLoading(true);
      setError(null);

      try {
        const categories = await apiClient.categories.listTabs();
        if (cancelled) return;
        setCategoryOptions(buildIdFilterOptions(categories.list));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载筛选选项失败"));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categoryOptions, isLoading, error };
}
