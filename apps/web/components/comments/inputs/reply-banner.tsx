"use client";

interface ReplyBannerProps {
  toUsername: string;
  onCancel?: () => void;
  /** 编辑模式：展示「编辑中」而非 @username */
  editing?: boolean;
  /** 当前编辑的是待审版本。 */
  pendingReview?: boolean;
}

/** 回复对象提示条，置于 RichCommentInput header 或 pill 输入框上方 */
export function ReplyBanner({
  toUsername,
  onCancel,
  editing = false,
  pendingReview = false,
}: ReplyBannerProps) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]">
      {editing ? (
        <span className="font-medium text-primary">
          {pendingReview ? "编辑中 · 内容正在审核" : "编辑中"}
        </span>
      ) : (
        <>
          <span className="text-foreground/40">回复</span>
          <span className="font-medium text-primary">@{toUsername}</span>
        </>
      )}
      <button
        type="button"
        onClick={onCancel}
        aria-label={editing ? "取消编辑" : "取消回复"}
        className="ml-0.5 text-foreground/35 transition-colors hover:text-foreground/60"
      >
        ×
      </button>
    </div>
  );
}
