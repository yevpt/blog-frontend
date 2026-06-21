"use client";

import type { CommentReplyResp, GuestbookItemResp } from "@repo/api";
import { Card, Pagination } from "@repo/ui";
import type { RefObject } from "react";
import { GuestbookItem } from "./guestbook-item";
import type { ReplyTarget } from "@/components/comments";

/** 单条骨架占位 */
function SkeletonItem() {
  return (
    <div className="animate-pulse py-4">
      <div className="mb-2 flex gap-2.5">
        {/* 头像 */}
        <div className="size-[30px] shrink-0 rounded-full bg-border" />
        <div className="flex-1 space-y-2">
          {/* 用户名 + 时间 */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 rounded bg-border" />
            <div className="h-3 w-14 rounded bg-border" />
          </div>
        </div>
      </div>
      {/* 正文占满卡片宽度 */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-border" />
        <div className="h-3 w-4/5 rounded bg-border" />
      </div>
    </div>
  );
}

function GuestbookSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-label="加载中" className="divide-y divide-border px-[18px]">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  );
}

interface GuestbookListProps {
  items: GuestbookItemResp[];
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onReply: (target: ReplyTarget) => void;
  onLike: (id: number) => void;
  currentUserId?: number | null;
  onDelete?: (id: number) => Promise<boolean>;
  onDeleteReply?: (itemId: number, replyId: number) => Promise<boolean>;
  pendingReplies: Record<number, CommentReplyResp | null>;
  listRef?: RefObject<HTMLDivElement | null>;
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
  currentUserId,
  onDelete,
  onDeleteReply,
  pendingReplies,
  listRef,
}: GuestbookListProps) {
  return (
    <>
      <Card ref={listRef} className="overflow-hidden">
        {isLoading ? (
          <GuestbookSkeleton />
        ) : error ? (
          <div className="px-[18px]">
            <p className="py-6 text-center text-sm text-(--fg3)">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-[18px]">
            <p className="py-10 text-center text-sm text-(--fg3)">还没有留言，来第一个吧 👋</p>
          </div>
        ) : (
          <div className="divide-y divide-border px-[18px]">
            {items.map((item) => (
              <GuestbookItem
                key={item.id}
                item={item}
                onReply={onReply}
                onLike={onLike}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onDeleteReply={onDeleteReply}
                pendingReply={pendingReplies[item.id] ?? null}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-[18px]">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              className="pt-3 pb-3 md:pt-3"
            />
          </div>
        )}
      </Card>

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
