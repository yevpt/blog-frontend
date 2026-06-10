import { useState, useEffect, useCallback } from "react";
import type { CommentItemResp, CommentPageResp, CommentReplyResp } from "@repo/api";

const PAGE_SIZE = 10;

export function useCommentList(targetType: string, targetId: number) {
  const [comments, setComments] = useState<CommentItemResp[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          target_type: targetType,
          target_id: String(targetId),
          page: String(pageNum),
          page_size: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/comments?${params.toString()}`);
        if (!res.ok) throw new Error("fetch failed");

        const data = (await res.json()) as CommentPageResp;
        setComments((prev) => (append ? [...prev, ...data.list] : data.list));
        setPage(pageNum);
        setHasMore(pageNum < data.pages);
      } catch {
        setError("加载评论失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    },
    [targetType, targetId],
  );

  useEffect(() => {
    setComments([]);
    setPage(1);
    setHasMore(false);
    void fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      void fetchPage(page + 1, true);
    }
  }, [isLoading, hasMore, page, fetchPage]);

  const addComment = useCallback((comment: CommentItemResp) => {
    setComments((prev) => [...prev, comment]);
  }, []);

  const addReply = useCallback((commentId: number, reply: CommentReplyResp) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, replies: [...comment.replies, reply] } : comment,
      ),
    );
  }, []);

  return { comments, isLoading, hasMore, error, loadMore, addComment, addReply };
}
