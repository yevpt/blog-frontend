import { useEffect, useState } from "react";
import { ApiError } from "@repo/api";
import { addToast } from "../../../lib/toast";

/**
 * 通用分析取数 hook：执行 fetcher、管理 loading，错误统一 toast。
 * deps 变化时重新拉取；fetcher 由调用方用 useCallback 固定或随 deps 重建。
 */
export function useAnalyticsData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  initial: T,
): { data: T; loading: boolean } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetcher()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((err) => {
        if (err instanceof ApiError) addToast(err.message, "error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, deps);

  return { data, loading };
}
