"use client";

import { useState, useCallback } from "react";
import { RichCommentInput, type ReplyTarget } from "@/components/comments";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";

interface GuestbookInputBarProps {
  onSubmit: (content: string) => Promise<boolean>;
  isSubmitting?: boolean;
  submitError?: string | null;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
}

export function GuestbookInputBar({
  onSubmit,
  isSubmitting,
  submitError,
  replyTarget,
  onCancelReply,
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
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-foreground/40">回复</span>
      <span className="font-medium text-primary">@{replyTarget.toUsername}</span>
      <button
        type="button"
        onClick={onCancelReply}
        className="ml-0.5 text-foreground/35 transition-colors hover:text-foreground/60"
      >
        ×
      </button>
    </div>
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
        focusTrigger={replyTarget}
        className="focus-within:border-foreground/15 transition-colors duration-200"
      />
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    </div>
  );
}
