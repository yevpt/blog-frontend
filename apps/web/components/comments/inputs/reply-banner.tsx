"use client";

interface ReplyBannerProps {
  toUsername: string;
  onCancel?: () => void;
}

/** 回复对象提示条，置于 RichCommentInput header 或 pill 输入框上方 */
export function ReplyBanner({ toUsername, onCancel }: ReplyBannerProps) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-foreground/40">回复</span>
      <span className="font-medium text-primary">@{toUsername}</span>
      <button
        type="button"
        onClick={onCancel}
        aria-label="取消回复"
        className="ml-0.5 text-foreground/35 transition-colors hover:text-foreground/60"
      >
        ×
      </button>
    </div>
  );
}
