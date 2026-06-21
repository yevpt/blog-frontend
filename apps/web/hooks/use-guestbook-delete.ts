import { useCallback } from "react";
import type { CommentDeleteResp, GuestbookDeleteResp } from "@repo/api";
import { apiJson } from "@/lib/client-fetch";

export function useGuestbookDelete() {
  const deleteItem = useCallback(async (id: number): Promise<boolean> => {
    try {
      await apiJson<GuestbookDeleteResp>(`/api/guestbook/${id}`, { method: "DELETE" });
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteReply = useCallback(async (replyId: number): Promise<boolean> => {
    try {
      await apiJson<CommentDeleteResp>(`/api/guestbook/comment-replies/${replyId}`, {
        method: "DELETE",
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return { deleteItem, deleteReply };
}
