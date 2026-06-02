"use client";

import { useEffect, useRef } from "react";
import { cn } from "@repo/ui";
import { CommentItem } from "./comment-item";
import { CommentInput } from "./comment-input";
import type { CommentItemData } from "./comment-item";

interface CommentModalProps {
  open: boolean;
  title: string;
  type: string;
  onClose: () => void;
}

// Mock 评论数据（后续接入真实接口）
const MOCK_COMMENTS: CommentItemData[] = [
  {
    id: "1",
    author: "林晓雨",
    avatar: "https://i.pravatar.cc/32?img=10",
    time: "2 小时前",
    text: "写得很好！感谢分享，受益匪浅。",
    replies: [
      {
        id: "1-1",
        author: "作者",
        avatar: "https://i.pravatar.cc/32?img=1",
        time: "1 小时前",
        text: "谢谢支持，有问题欢迎继续交流！",
        replyTo: "林晓雨",
      },
    ],
  },
  {
    id: "2",
    author: "张博文",
    avatar: "https://i.pravatar.cc/32?img=12",
    time: "5 小时前",
    text: "这个方案在生产环境有没有踩过坑？",
  },
];

export function CommentModal({ open, title, type, onClose }: CommentModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape 键关闭
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // 打开时锁定 body 滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-[300] bg-black/45 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 的评论`}
        className={cn(
          "fixed z-[301] bg-card flex flex-col",
          "shadow-2xl overflow-hidden",
          // 桌面端：居中浮层
          "md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-[520px] md:max-h-[85vh] md:rounded-[20px]",
          "md:animate-[slideUp_0.3s_ease-out]",
          // 移动端：全屏底部弹出
          "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:h-[100dvh]",
          "max-md:rounded-[24px_24px_0_0]",
          "max-md:animate-[slideUpFull_0.35s_ease-out]",
        )}
      >
        {/* 移动端拖动手柄 */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border/30 flex-shrink-0">
          <div className="min-w-0 mr-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-0.5">
              {type}
            </p>
            <h3 className="text-sm font-bold line-clamp-2 text-foreground">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭评论"
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {MOCK_COMMENTS.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">暂无评论，来说第一句吧</p>
          ) : (
            MOCK_COMMENTS.map((comment) => <CommentItem key={comment.id} comment={comment} />)
          )}
        </div>

        {/* 评论输入框（固定在底部） */}
        <div className="flex-shrink-0">
          <CommentInput />
        </div>
      </div>
    </>
  );
}
