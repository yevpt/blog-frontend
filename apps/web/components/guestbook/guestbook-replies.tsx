// Placeholder — will be implemented in Task 6
import type { CommentReplyResp } from "@repo/api";
import type { GuestbookReplyTarget } from "./guestbook-item";

interface GuestbookRepliesProps {
  guestbookId: number;
  replyCount: number;
  pendingReply: CommentReplyResp | null;
  onReply: (target: GuestbookReplyTarget) => void;
}

export function GuestbookReplies(_props: GuestbookRepliesProps) {
  return null;
}
