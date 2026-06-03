"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { CommentSection } from "./comment-section";

interface CommentModalProps {
  open: boolean;
  title: string;
  type: string;
  targetId: number;
  onClose: () => void;
}

export function CommentModal({ open, title, type, targetId, onClose }: CommentModalProps) {
  if (!open) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/45 p-0 backdrop-blur-md md:items-end md:p-5"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="评论"
        className="fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.25)] animate-[slideUpFull_0.4s_cubic-bezier(.32,.72,0,1)] md:relative md:inset-auto md:max-h-[85vh] md:max-w-[520px] md:rounded-[20px_20px_16px_16px] md:border md:animate-[slideUpCard_0.35s_cubic-bezier(.32,.72,0,1)]"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border md:hidden" />
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-[18px] py-3.5">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
              {type} · 评论
            </p>
            <h2 className="line-clamp-2 text-sm font-bold leading-[1.4] text-foreground">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            onPress={onClose}
            aria-label="关闭评论"
            className="h-7 w-7 shrink-0 rounded-lg bg-border p-0 text-[var(--fg2)] hover:bg-primary/10 hover:text-primary"
          >
            <SvgIcon name="close" size={16} />
          </Button>
        </header>
        <CommentSection targetType="article" targetId={targetId} />
      </section>
    </div>
  );
}
