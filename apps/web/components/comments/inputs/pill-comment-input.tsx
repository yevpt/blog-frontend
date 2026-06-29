"use client";

import { useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { ReplyTarget } from "../parts/comment-item";
import { ReplyBanner } from "./reply-banner";

/** 评论/回复内容上限，镜像后端 dto 的 binding:"max=2000"，提交前即拦截避免无谓往返 */
const COMMENT_CONTENT_MAX_LENGTH = 2000;
/** 剩余字数少于该阈值时显示计数器，提前提示用户接近上限 */
const COMMENT_COUNTER_THRESHOLD = 100;

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
  editing?: boolean;
  pendingReview?: boolean;
  onCancelEdit?: () => void;
  isSubmitting?: boolean;
}

export function PillCommentInput({
  value,
  onChange,
  onSubmit,
  replyTarget,
  onCancelReply,
  editing = false,
  pendingReview = false,
  onCancelEdit,
  isSubmitting = false,
}: PillCommentInputProps) {
  const { userId } = useSession();
  const openLogin = useLoginModal((s) => s.open);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showCounter = value.length >= COMMENT_CONTENT_MAX_LENGTH - COMMENT_COUNTER_THRESHOLD;
  const isOverLimit = value.length > COMMENT_CONTENT_MAX_LENGTH;

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
    if (replyTarget || editing) {
      textareaRef.current?.focus();
    }
  }, [editing, replyTarget]);

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
      {!replyTarget && editing && (
        <ReplyBanner
          toUsername="编辑中"
          onCancel={onCancelEdit}
          editing
          pendingReview={pendingReview}
        />
      )}
      <div
        className={`relative w-full overflow-hidden rounded-[20px] border border-input bg-background transition-colors focus-within:border-primary ${isSubmitting ? "opacity-60" : ""}`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            replyTarget ? "写下你的回复..." : editing ? "编辑内容..." : "写下你的评论..."
          }
          maxLength={COMMENT_CONTENT_MAX_LENGTH}
          disabled={isSubmitting}
          className={cn(
            "block w-full resize-none border-0 bg-transparent py-2.5 pl-4 text-[13px] leading-normal text-foreground outline-none placeholder:text-(--fg3) disabled:cursor-not-allowed",
            showCounter ? "pr-28" : value.trim() ? "pr-10" : "pr-4",
          )}
        />
        {showCounter && (
          <span
            className={cn(
              "absolute right-10 bottom-2 inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[11px] leading-none tabular-nums",
              isOverLimit
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-border bg-foreground/[0.04] text-muted-foreground",
            )}
          >
            {value.length}/{COMMENT_CONTENT_MAX_LENGTH}
          </span>
        )}
        {/* 外壳圆角 20px = 按钮半径 14px + 内缩 6px，右下角弧线与按钮同心 */}
        {value.trim() && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || isOverLimit}
            aria-label="发送评论"
            className="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SvgIcon name="arrow-up" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
