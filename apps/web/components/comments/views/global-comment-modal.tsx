"use client";

import { useCommentModal } from "@/store/use-comment-modal";
import { CommentModal } from "./comment-modal";

export function GlobalCommentModal() {
  const targetType = useCommentModal((s) => s.targetType);
  const targetId = useCommentModal((s) => s.targetId);
  const onCommentAdded = useCommentModal((s) => s.onCommentAdded);
  const isVisible = useCommentModal((s) => s.isVisible);
  const close = useCommentModal((s) => s.close);

  if (targetType === null || targetId === null || !isVisible) {
    return null;
  }

  return (
    <CommentModal
      targetType={targetType}
      targetId={targetId}
      onClose={close}
      onCommentAdded={onCommentAdded ?? undefined}
    />
  );
}
