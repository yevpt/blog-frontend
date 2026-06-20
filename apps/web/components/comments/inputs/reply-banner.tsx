"use client";

import { Button } from "@repo/ui";

interface ReplyBannerProps {
  toUsername: string;
  onCancel?: () => void;
}

/** 「正在回复 @xx 取消」提示条，pill 与 inline 输入共用 */
export function ReplyBanner({ toUsername, onCancel }: ReplyBannerProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-(--fg3)">正在回复</span>
      <span className="font-semibold text-primary">@{toUsername}</span>
      <Button
        type="button"
        variant="ghost"
        onPress={onCancel}
        className="h-auto p-0 text-[11px] text-(--fg3) hover:text-foreground"
      >
        取消
      </Button>
    </div>
  );
}
