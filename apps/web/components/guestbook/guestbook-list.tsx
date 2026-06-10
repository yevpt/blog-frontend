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

      {/* 分页行：三列 grid 保证分页视觉居中，不受左侧留言数影响 */}
      {(totalPages > 0 || total > 0) && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-border px-[18px] py-3">
          <span className="text-[11px] text-(--fg3)">{total} 条留言</span>
          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
          )}
          <span />
        </div>
      )}
    </div>
  );
}
