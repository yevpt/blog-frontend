"use client";

import { useState, useCallback } from "react";
import { cn } from "@repo/ui";
import { RichCommentInput } from "@/components/comments/rich-comment-input";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { GuestbookReplyTarget } from "./guestbook-item";

interface GuestbookInputBarProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  replyTarget?: GuestbookReplyTarget | null;
  onCancelReply?: () => void;
}

export function GuestbookInputBar({
  onSubmit,
  isSubmitting,
  submitError,
  replyTarget,
  onCancelReply,
}: GuestbookInputBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const { userId } = useSession();
  const { open: openLoginModal } = useLoginModal();

  const handleCollapsedClick = useCallback(() => {
    if (!userId) {
      openLoginModal();
      return;
    }
    // rAF 确保浏览器完成当前帧后再触发过渡动画，避免高度跳变
    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }, [userId, openLoginModal]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setContent("");
    onCancelReply?.();
  }, [onCancelReply]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content);
    setContent("");
    setIsOpen(false);
  }, [content, isSubmitting, onSubmit]);

  const placeholder = replyTarget ? `回复 @${replyTarget.toUsername}…` : "说点什么，支持 Markdown…";

  return (
    <>
      {/* 遮罩层：expanded 时显示半透明背景 */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        className={cn(
          "fixed inset-0 z-[90] bg-black/[0.18] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* 底部浮动容器 */}
      <div
        className={cn(
          "fixed bottom-5 left-1/2 -translate-x-1/2 z-[100]",
          "w-[calc(100%-32px)] sm:w-[calc(100%-48px)]",
          "transition-[max-width] duration-[350ms] ease-[cubic-bezier(.4,0,.2,1)]",
          isOpen ? "max-w-[680px]" : "max-w-[640px]",
        )}
      >
        {/* pill → 卡片变形容器；使用 inline style 驱动 height/border-radius 过渡 */}
        <div
          role={!isOpen ? "button" : undefined}
          tabIndex={!isOpen ? 0 : undefined}
          onClick={!isOpen ? handleCollapsedClick : undefined}
          onKeyDown={
            !isOpen
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") handleCollapsedClick();
                }
              : undefined
          }
          style={{
            height: isOpen ? "220px" : "50px",
            borderRadius: isOpen ? "14px" : "9999px",
            transition: [
              "height .35s cubic-bezier(.4,0,.2,1)",
              "border-radius .3s cubic-bezier(.4,0,.2,1)",
              "box-shadow .3s ease",
              "border-color .3s ease",
            ].join(", "),
            willChange: "height, border-radius",
          }}
          className={cn(
            "relative overflow-hidden cursor-text",
            "border bg-white/97 backdrop-blur-xl",
            "dark:bg-card/95",
            isOpen
              ? "border-primary/25 shadow-[0_6px_28px_rgba(124,58,237,0.13)]"
              : "border-black/[0.09] shadow-[0_2px_12px_rgba(0,0,0,0.07)]",
          )}
        >
          {/* 收起态：pill 内文字提示 */}
          <div
            className={cn(
              "absolute inset-0 flex items-center gap-3 px-4",
              "transition-opacity duration-150",
              isOpen ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
          >
            <span className="flex-1 text-sm text-foreground/30">
              {replyTarget ? `回复 @${replyTarget.toUsername}` : "说点什么…"}
            </span>
          </div>

          {/* 展开态：RichCommentInput 始终挂载，通过 opacity 控制可见性 */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col p-3",
              "transition-opacity duration-200",
              isOpen
                ? "opacity-100 pointer-events-auto delay-[120ms]"
                : "opacity-0 pointer-events-none",
            )}
          >
            <RichCommentInput
              value={content}
              onChange={setContent}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isLoggedIn={!!userId}
              onLoginRequired={openLoginModal}
              placeholder={placeholder}
            />
          </div>
        </div>

        {submitError && <p className="mt-1.5 text-center text-xs text-red-500">{submitError}</p>}
      </div>
    </>
  );
}
