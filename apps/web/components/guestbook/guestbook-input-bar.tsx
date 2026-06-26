"use client";

import { useState, useCallback } from "react";
import { RichCommentInput, type ReplyTarget } from "@/components/comments";
import { ReplyBanner } from "@/components/comments/inputs/reply-banner";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";

interface GuestbookInputBarProps {
  onSubmit: (content: string) => Promise<boolean>;
  isSubmitting?: boolean;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
  /** 滚动定位完成后递增，触发编辑器聚焦 */
  focusTrigger?: number | null;
}

export function GuestbookInputBar({
  onSubmit,
  isSubmitting,
  replyTarget,
  onCancelReply,
  focusTrigger,
}: GuestbookInputBarProps) {
  const [content, setContent] = useState("");
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;
    const success = await onSubmit(content);
    if (success) {
      setContent("");
    }
  }, [content, isSubmitting, onSubmit]);

  const placeholder = replyTarget ? `回复 @${replyTarget.toUsername}…` : "说点什么，支持 Markdown…";

  const replyBanner = replyTarget ? (
    <ReplyBanner toUsername={replyTarget.toUsername} onCancel={onCancelReply} />
  ) : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <RichCommentInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder={placeholder}
        header={replyBanner}
        focusTrigger={focusTrigger}
        maxLength={2000}
        className="focus-within:border-foreground/15 transition-colors duration-200"
      />
    </div>
  );
}
