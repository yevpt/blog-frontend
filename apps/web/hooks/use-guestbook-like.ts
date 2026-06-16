import { useCallback } from "react";
import type { GuestbookLikeResp, CommentLikeResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";

export function useGuestbookLike() {
  const toggleEntryLike = useCallback(async (id: number): Promise<GuestbookLikeResp | null> => {
    try {
      return await apiJson<GuestbookLikeResp>(`/api/guestbook/${id}/like`, { method: "POST" });
    } catch {
      return null;
    }
  }, []);

  const toggleReplyLike = useCallback(
    async (guestbookId: number, replyId: number): Promise<CommentLikeResp | null> => {
      try {
        return await apiJson<CommentLikeResp>(
          `/api/guestbook/comments/${guestbookId}/replies/${replyId}/like`,
          { method: "POST" },
        );
      } catch {
        return null;
      }
    },
    [],
  );

  return { toggleEntryLike, toggleReplyLike };
}
