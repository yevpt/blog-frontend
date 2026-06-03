"use client";

import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { CommentInput } from "./comment-input";
import { CommentItem, type CommentThread } from "./comment-item";

const MOCK_COMMENTS: CommentThread[] = [
  {
    id: "1",
    author: "张小明",
    avatar: "https://i.pravatar.cc/56?img=3",
    time: "3天前",
    text: "写得很详细！这个迁移过程里最难的部分是什么？",
    likes: 8,
    replies: [
      {
        id: "1-1",
        author: "yevpt",
        avatar: "https://i.pravatar.cc/44?img=11",
        time: "2天前",
        mention: "张小明",
        text: "最难的是缓存层类型收敛，花了不少时间把边界理清楚。",
        likes: 5,
      },
    ],
  },
  {
    id: "2",
    author: "王小雨",
    avatar: "https://i.pravatar.cc/56?img=7",
    time: "1天前",
    text: "这个性能提升很夸张，准备照着你的思路在自己的项目里试一下。",
    likes: 14,
  },
];

interface CommentModalProps {
  open: boolean;
  title: string;
  type: string;
  onClose: () => void;
}

export function CommentModal({ open, title, type, onClose }: CommentModalProps) {
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

        <div className="flex-1 overflow-y-auto px-[18px] py-4">
          <div className="flex flex-col gap-[18px]">
            {MOCK_COMMENTS.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-[18px] text-xs font-semibold text-[var(--fg2)] hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              查看更多评论
            </Button>
          </div>
        </div>

        <CommentInput />
      </section>
    </div>
  );
}
