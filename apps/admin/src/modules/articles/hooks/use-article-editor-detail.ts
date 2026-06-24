import { useEffect, useState } from "react";
import type { AdminArticleDetailResp } from "@repo/api";
import { apiClient } from "../../../lib/api";

function parseArticleId(articleId: string | undefined): {
  isNew: boolean;
  isValidId: boolean;
  parsedId: number | null;
} {
  if (articleId === undefined) {
    return { isNew: true, isValidId: true, parsedId: null };
  }

  const parsedId = Number(articleId);
  const isValidId = Number.isInteger(parsedId) && parsedId > 0;
  return { isNew: false, isValidId, parsedId: isValidId ? parsedId : null };
}

export function useArticleEditorDetail(articleId: string | undefined) {
  const { isNew, isValidId, parsedId } = parseArticleId(articleId);
  const [detail, setDetail] = useState<AdminArticleDetailResp | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setDetail(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isValidId || parsedId === null) {
      setDetail(null);
      setError("文章 ID 无效，请从文章列表重新进入编辑页");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const resp = await apiClient.articles.getAdminDetail(parsedId!);
        if (cancelled) return;
        setDetail(resp);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载文章详情失败");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [isNew, isValidId, parsedId]);

  return { detail, isLoading, error, isNew, isValidId, parsedId };
}
