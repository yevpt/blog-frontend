"use client";

import { useEffect, useRef } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";

const REPLY_CONTENT_MAX_LENGTH = 2000;

interface NotificationInlineReplyInputProps {
  actorName: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/** 通知卡片底部紧凑回复输入框。 */
export function NotificationInlineReplyInput({
  actorName,
  value,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: NotificationInlineReplyInputProps) {
  const { userId } = useSession();
  const openLogin = useLoginModal((s) => s.open);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  if (userId == null) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => openLogin()}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          请先登录后回复
        </button>
      </div>
    );
  }

  const trimmed = value.trim();
  const isOverLimit = value.length > REPLY_CONTENT_MAX_LENGTH;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">回复</span>
        <span className="font-medium text-primary">@{actorName}</span>
        <Button
          type="button"
          variant="ghost"
          onPress={onCancel}
          className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground"
        >
          取消
        </Button>
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-primary",
          isSubmitting && "opacity-60",
        )}
      >
        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`回复 @${actorName}…`}
          maxLength={REPLY_CONTENT_MAX_LENGTH}
          disabled={isSubmitting}
          className="block w-full resize-none border-0 bg-transparent px-3 py-2 pr-10 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        {trimmed && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || isOverLimit}
            aria-label="发送回复"
            className="absolute right-1.5 bottom-1.5 flex size-7 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SvgIcon name="arrow-up" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
