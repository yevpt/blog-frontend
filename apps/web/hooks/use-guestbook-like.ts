import { useCallback } from "react";
import type { GuestbookLikeResp, CommentLikeResp } from "@repo/api";

export function useGuestbookLike() {
  const toggleEntryLike = useCallback(async (id: number): Promise<GuestbookLikeResp | null> => {
    try {
      const res = await fetch(`/api/guestbook/${id}/like`, { method: "POST" });
      if (!res.ok) return null;
      return (await res.json()) as GuestbookLikeResp;
    } catch {
      return null;
    }
  }, []);

  const toggleReplyLike = useCallback(
    async (guestbookId: number, replyId: number): Promise<CommentLikeResp | null> => {
      try {
        const res = await fetch(`/api/guestbook/comments/${guestbookId}/replies/${replyId}/like`, {
          method: "POST",
        });
        if (!res.ok) return null;
        return (await res.json()) as CommentLikeResp;
      } catch {
        return null;
      }
    },
    [],
  );

  return { toggleEntryLike, toggleReplyLike };
}
