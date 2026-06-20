"use client";

import { useRef, useEffect } from "react";
import { Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { ReplyTarget } from "./parts/comment-item";

interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function CommentInput({
  value,
  onChange,
  onSubmit,
  replyTarget,
  onCancelReply,
  isSubmitting = false,
  submitError,
}: CommentInputProps) {
  const { userId } = useSession();
  const openLogin = useLoginModal((s) => s.open);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyTarget) {
      inputRef.current?.focus();
    }
  }, [replyTarget]);

  // 未登录：显示登录提示 pill
  if (userId == null) {
    return (
      <div className="flex shrink-0 border-t border-border px-[18px] py-3 pb-4">
        <button
          type="button"
          onClick={() => openLogin()}
          className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-[13px] text-(--fg3) transition-colors hover:border-primary hover:text-primary"
        >
          请先登录，参与评论
        </button>
      </div>
    );
  }

  // 已登录：回复提示行 + 输入 pill（↑ 按钮嵌入式）
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border px-[18px] py-3 pb-4">
      {replyTarget && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-(--fg3)">正在回复</span>
          <span className="font-semibold text-primary">@{replyTarget.toUsername}</span>
          <Button
            type="button"
            variant="ghost"
            onPress={onCancelReply}
            className="h-auto p-0 text-[11px] text-(--fg3) hover:text-foreground"
          >
            取消
          </Button>
        </div>
      )}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={replyTarget ? "写下你的回复..." : "写下你的评论..."}
          disabled={isSubmitting}
          className={`w-full rounded-full border border-input bg-background py-2.5 pl-4 text-[13px] leading-normal text-foreground outline-none transition-colors placeholder:text-(--fg3) focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 ${value.trim() ? "pr-10" : "pr-4"}`}
        />
        {/* ↑ 发送按钮：仅在有内容时出现，嵌入 pill 右侧 */}
        {value.trim() && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            aria-label="发送评论"
            className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SvgIcon name="arrow-up" size={16} />
          </button>
        )}
      </div>
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    </div>
  );
}
