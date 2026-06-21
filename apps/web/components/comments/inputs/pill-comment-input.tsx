"use client";

import { useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { SvgIcon } from "@repo/icons";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { ReplyTarget } from "../parts/comment-item";
import { ReplyBanner } from "./reply-banner";

/** 与 text-[13px] leading-normal + py-2.5 对齐，用于限制最高约 4 行 */
const PILL_TEXTAREA_LINE_HEIGHT_PX = 20;
const PILL_TEXTAREA_VERTICAL_PADDING_PX = 20;
const PILL_TEXTAREA_MAX_ROWS = 4;
const PILL_TEXTAREA_MAX_HEIGHT_PX =
  PILL_TEXTAREA_LINE_HEIGHT_PX * PILL_TEXTAREA_MAX_ROWS + PILL_TEXTAREA_VERTICAL_PADDING_PX;

function resizePillTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  const nextHeight = Math.min(el.scrollHeight, PILL_TEXTAREA_MAX_HEIGHT_PX);
  el.style.height = `${nextHeight}px`;
  el.style.overflowY = el.scrollHeight > PILL_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
}

interface PillCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export function PillCommentInput({
  value,
  onChange,
  onSubmit,
  replyTarget,
  onCancelReply,
  isSubmitting = false,
  submitError,
}: PillCommentInputProps) {
  const { userId } = useSession();
  const openLogin = useLoginModal((s) => s.open);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      resizePillTextarea(el);
    }
  }, []);

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight]);

  useEffect(() => {
    if (replyTarget) {
      textareaRef.current?.focus();
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
      {replyTarget && <ReplyBanner toUsername={replyTarget.toUsername} onCancel={onCancelReply} />}
      <div
        className={`relative w-full overflow-hidden rounded-[20px] border border-input bg-background transition-colors focus-within:border-primary ${isSubmitting ? "opacity-60" : ""}`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={replyTarget ? "写下你的回复..." : "写下你的评论..."}
          disabled={isSubmitting}
          className={`block w-full resize-none border-0 bg-transparent py-2.5 pl-4 text-[13px] leading-normal text-foreground outline-none placeholder:text-(--fg3) disabled:cursor-not-allowed ${value.trim() ? "pr-10" : "pr-4"}`}
        />
        {/* 外壳圆角 20px = 按钮半径 14px + 内缩 6px，右下角弧线与按钮同心 */}
        {value.trim() && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            aria-label="发送评论"
            className="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SvgIcon name="arrow-up" size={16} />
          </button>
        )}
      </div>
      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    </div>
  );
}
