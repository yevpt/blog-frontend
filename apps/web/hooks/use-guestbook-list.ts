import { useState, useCallback, useRef } from "react";
import type { GuestbookItemResp, GuestbookPageResp } from "@repo/api";

const PAGE_SIZE = 10;

export function useGuestbookList(initialPage: GuestbookPageResp) {
  const [items, setItems] = useState<GuestbookItemResp[]>(initialPage.list);
  const [page, setPage] = useState(initialPage.page);
  const [totalPages, setTotalPages] = useState(initialPage.pages);
  const [total, setTotal] = useState(initialPage.total);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (pageNum: number) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guestbook?page=${pageNum}&page_size=${PAGE_SIZE}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as GuestbookPageResp;
      if (!controller.signal.aborted) {
        setItems(data.list);
        setPage(data.page);
        setTotalPages(data.pages);
        setTotal(data.total);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("加载留言失败，请稍后重试");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const addItem = useCallback((item: GuestbookItemResp) => {
    setItems((prev) => [item, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  const incrementReplyCount = useCallback((itemId: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, reply_count: i.reply_count + 1 } : i)),
    );
  }, []);

  const updateLike = useCallback((itemId: number, isLiked: boolean, likeCount: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_liked: isLiked, like_count: likeCount } : i)),
    );
  }, []);

  return {
    items,
    page,
    totalPages,
    total,
    isLoading,
    error,
    fetchPage,
    addItem,
    incrementReplyCount,
    updateLike,
  };
}
