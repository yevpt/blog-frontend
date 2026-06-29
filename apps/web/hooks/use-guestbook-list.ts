import { useState, useCallback, useRef } from "react";
import type { GuestbookItemResp, GuestbookPageResp } from "@repo/api";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";
import { replacePageSearchParam } from "@/lib/url-search";

const PAGE_SIZE = 20;

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

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
      const qs = buildQuery({ page: pageNum, page_size: PAGE_SIZE });
      const data = await apiJson<GuestbookPageResp>(`/api/guestbook?${qs}`, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setItems(data.list);
        setPage(data.page);
        setTotalPages(data.pages);
        setTotal(data.total);
        replacePageSearchParam(data.page);
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      setError(getApiErrorMessage(err, "加载留言失败，请稍后重试"));
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

  const decrementReplyCount = useCallback((itemId: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, reply_count: Math.max(0, i.reply_count - 1) } : i,
      ),
    );
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const updateLike = useCallback((itemId: number, isLiked: boolean, likeCount: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_liked: isLiked, like_count: likeCount } : i)),
    );
  }, []);

  /** 编辑成功后按 ID 原位替换条目，保持总数/页数/回复数不变。 */
  const replaceItem = useCallback((item: GuestbookItemResp) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
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
    decrementReplyCount,
    removeItem,
    updateLike,
    replaceItem,
  };
}
