"use client";

import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { Pagination } from "@repo/ui";
import { GuestbookItem, type GuestbookReplyTarget } from "./guestbook-item";

interface GuestbookListProps {
  items: GuestbookItemResp[];
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onReply: (target: GuestbookReplyTarget) => void;
  onLike: (id: number) => void;
  pendingReplies: Record<number, CommentReplyResp | null>;
}

export function GuestbookList({
  items,
  page,
  totalPages,
  total,
  isLoading,
  error,
  onPageChange,
  onReply,
  onLike,
  pendingReplies,
}: GuestbookListProps) {
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
        <div className="divide-y divide-border px-[18px]">
          {isLoading && items.length === 0 ? (
            <p className="py-10 text-center text-sm text-(--fg3)">加载中…</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-(--fg3)">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-(--fg3)">还没有留言，来第一个吧 👋</p>
          ) : (
            items.map((item) => (
              <GuestbookItem
                key={item.id}
                item={item}
                onReply={onReply}
                onLike={onLike}
                pendingReply={pendingReplies[item.id] ?? null}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center px-[18px] py-3">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-center gap-3 pt-4 text-[12px] tracking-[0.02em] text-(--fg3)">
          <span className="h-px w-14 flex-none bg-gradient-to-r from-transparent via-border to-transparent" />
          <span>{total} 条留言</span>
          <span className="h-px w-14 flex-none bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      )}
    </>
  );
}
