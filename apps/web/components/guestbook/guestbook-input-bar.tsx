"use client";

import { useState, useCallback } from "react";
import { RichCommentInput } from "@/components/comments";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";

interface GuestbookInputBarProps {
  onSubmit: (content: string) => Promise<boolean>;
  isSubmitting?: boolean;
}

export function GuestbookInputBar({ onSubmit, isSubmitting }: GuestbookInputBarProps) {
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

  return (
    <div className="flex flex-col gap-1.5">
      <RichCommentInput
        value={content}
        onChange={setContent}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLoggedIn={!!userId}
        onLoginRequired={openLoginModal}
        placeholder="说点什么，支持 Markdown…"
        maxLength={2000}
        className="focus-within:border-foreground/15 transition-colors duration-200"
      />
    </div>
  );
}
