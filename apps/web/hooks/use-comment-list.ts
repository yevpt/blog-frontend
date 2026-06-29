// apps/web/hooks/use-comment-list.ts
import { useState, useEffect, useCallback } from "react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";

const PAGE_SIZE = 10;

type TargetType = "article" | "moment";

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function buildListUrl(targetType: TargetType, targetId: number, page: number): string {
  const base =
    targetType === "article"
      ? `/api/articles/${targetId}/comments`
      : `/api/moments/${targetId}/comments`;
  const qs = buildQuery({ page, page_size: PAGE_SIZE });
  return `${base}?${qs}`;
}

export function useCommentList(targetType: TargetType, targetId: number) {
  const [comments, setComments] = useState<CommentItemResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean, signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiJson<CommentPageResp>(buildListUrl(targetType, targetId, pageNum), {
          signal,
        });
        if (signal?.aborted) {
          return;
        }
        setComments((prev) => (append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        setError(getApiErrorMessage(err, "加载评论失败，请稍后重试"));
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setHasLoaded(true);
        }
      }
    },
    [targetType, targetId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setComments([]);
    setPage(1);
    setHasMore(false);
    setHasLoaded(false);
    setIsLoading(true);
    void fetchPage(1, false, controller.signal);
    return () => controller.abort();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      void fetchPage(page + 1, true);
    }
  }, [fetchPage, hasMore, isLoading, page]);

  const addComment = useCallback((comment: CommentItemResp) => {
    setComments((prev) => [comment, ...prev]);
  }, []);

  const incrementReplyCount = useCallback((commentId: number) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, reply_count: c.reply_count + 1 } : c)),
    );
  }, []);

  const decrementReplyCount = useCallback((commentId: number) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, reply_count: Math.max(0, c.reply_count - 1) } : c,
      ),
    );
  }, []);

  const removeComment = useCallback((commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  const updateCommentLike = useCallback(
    (commentId: number, isLiked: boolean, likeCount: number) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, is_liked: isLiked, like_count: likeCount } : c,
        ),
      );
    },
    [],
  );

  /** 按 ID 原位替换评论列表项，保持位置与计数不变，用于编辑/审核再审等场景。 */
  const updateComment = useCallback((comment: CommentItemResp) => {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }, []);

  return {
    comments,
    isLoading,
    hasLoaded,
    hasMore,
    error,
    loadMore,
    addComment,
    incrementReplyCount,
    decrementReplyCount,
    removeComment,
    updateCommentLike,
    updateComment,
  };
}
