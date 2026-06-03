"use client";

import { Button } from "@repo/ui";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import type { ReplyTarget } from "./comment-item";

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
  const { user } = useSession();
  const { open: openLogin } = useLoginModal();

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border px-[18px] py-3 pb-4">
      {replyTarget && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-primary">@{replyTarget.toUsername}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-[var(--fg3)] hover:text-foreground"
          >
            取消
          </button>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={user ? "写下你的评论..." : "请先登录才能发表评论"}
          disabled={!user || isSubmitting}
          rows={3}
          className="min-h-[72px] w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-[13px] leading-normal text-foreground outline-none transition-colors placeholder:text-[var(--fg3)] focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        <div className="flex justify-end">
          {user ? (
            <Button
              variant="default"
              size="sm"
              isDisabled={!value.trim() || isSubmitting}
              onPress={onSubmit}
              className="h-8 rounded-full bg-primary px-[18px] text-xs font-bold text-white hover:bg-primary/85"
            >
              {isSubmitting ? "发布中..." : "发布"}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onPress={openLogin}
              className="h-8 rounded-full bg-primary px-[18px] text-xs font-bold text-white hover:bg-primary/85"
            >
              请先登录
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
